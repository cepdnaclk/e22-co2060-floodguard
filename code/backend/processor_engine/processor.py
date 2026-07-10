"""
Main Processor Engine Loop.
Ingests sensor readings, runs predictive algorithms, updates risk states, and manages de-escalation timers.
"""

import time
import os
import sys
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple

import config
import algorithm
from database import DatabaseManager

def process_dam_cycle(db: DatabaseManager, dam: dict, t: datetime, l_t: float) -> Optional[str]:
    """
    Process a single time cycle for a given dam.
    Computes current metrics, runs predictions if schedule aligns, and checks escalations/de-escalations.
    """
    dam_id = dam['dam_id']
    dam_name = dam['dam_name']
    
    # 1. Retrieve current sensor readings
    if_t = db.get_closest_inflow(dam_id, t)
    dl_t = db.get_closest_downstream_level(dam_id, t)
    r_net_t = db.get_closest_r_net(dam_id, t)
    
    # Validation check
    is_valid, missing_fields = algorithm.validate_input(l_t, r_net_t, if_t, dl_t)
    if not is_valid:
        print(f"[{t.strftime('%H:%M:%S')}] Dam {dam_name}: Insufficient input data. Missing: {missing_fields}")
        db.insert_risk_status(
            dam_id=dam_id,
            status_time=t,
            status="GREEN",
            ttc_minutes=None,
            trigger_reason=f"DATA_INSUFFICIENT: Missing required sensor values: {', '.join(missing_fields)}",
            previous_status=db.get_previous_risk_status(dam_id, t)
        )
        return "DATA_INSUFFICIENT"
        
    # 2. Retrieve history for current calculations
    l_15_rows = db.get_historical_water_levels_window(dam_id, t, 0.25)  # last 15 min
    l_60_rows = db.get_historical_water_levels_window(dam_id, t, 1.0)   # last 60 min
    
    # Find historical L(t-15) and L(t-60)
    # L_15: closest reading near t - 15 minutes
    # L_60: closest reading near t - 60 minutes
    t_15 = t - timedelta(minutes=15)
    t_60 = t - timedelta(minutes=60)
    
    L_15 = None
    if l_15_rows:
        closest = min(l_15_rows, key=lambda r: abs((r[0] - t_15).total_seconds()))
        if abs((closest[0] - t_15).total_seconds()) <= 120:  # 2 min tolerance
            L_15 = closest[1]
            
    L_60 = None
    if l_60_rows:
        closest = min(l_60_rows, key=lambda r: abs((r[0] - t_60).total_seconds()))
        if abs((closest[0] - t_60).total_seconds()) <= 120:  # 2 min tolerance
            L_60 = closest[1]
            
    # If history is missing, we handle it
    rr_short, rr_long = algorithm.calculate_rise_rates(l_t, L_15, L_60)
    
    # Retrieve historical rr_long for acceleration
    # rr_long_60: rr_long at t - 60 minutes
    rr_long_60 = None
    rr_long_history_60 = db.get_historical_rr_longs(dam_id, t_60, 0.1) # tolerance around t-60
    if rr_long_history_60:
        # get closest
        closest = min(rr_long_history_60, key=lambda r: abs((r[0] - t_60).total_seconds()))
        if abs((closest[0] - t_60).total_seconds()) <= 120:
            rr_long_60 = closest[1]
            
    acc = algorithm.calculate_acceleration(rr_long, rr_long_60)
    
    # rolling_avg (RA): 3-hour average of rr_long
    recent_rr_long_rows = db.get_historical_rr_longs(dam_id, t, 3.0)
    recent_rr_longs = [r[1] for r in recent_rr_long_rows]
    ra = algorithm.calculate_rolling_average(recent_rr_longs) if recent_rr_longs else 0.0
    
    dev = algorithm.calculate_deviation(rr_short, ra)
    
    # Severity band
    rr_band = algorithm.determine_rr_band(rr_long, rr_short, acc, dev)
    
    # Calculate live threshold calculations
    rr_adj, rf_adj, if_adj, dl_adj = algorithm.calculate_adjustments(
        rr_band=rr_band,
        RF=r_net_t,
        IF=if_t,
        if_baseline=dam['if_baseline'],
        DL=dl_t
    )
    
    at_t, floor_t, ceil_t = algorithm.calculate_adaptive_threshold(
        base_threshold=dam['base_threshold'],
        threshold_floor=dam['threshold_floor'],
        rr_adj=rr_adj,
        rf_adj=rf_adj,
        if_adj=if_adj,
        dl_adj=dl_adj
    )
    
    # Store calculated metrics and threshold calculations
    db.insert_calculated_metric(dam_id, t, rr_short, rr_long, acc, ra, dev, rr_band)
    db.insert_threshold_calculation(dam_id, t, rr_adj, rf_adj, if_adj, dl_adj, at_t, floor_t, ceil_t)
    
    # 3. Schedule prediction run (every 10-15 minutes, we do it if t.minute % 15 == 0)
    is_prediction_cycle = (t.minute % 15 == 0)
    run_id = None
    crossing_ttc = None
    calculated_status = "GREEN"
    gap_trend = "stable"
    
    prev_status = db.get_previous_risk_status(dam_id, t) or "GREEN"
    
    if is_prediction_cycle:
        # Newton extrapolation run
        # We need historical water levels, inflows, downstream levels, and per-station rainfalls in a 6-hour window
        window_start = t - timedelta(hours=config.ROLLING_HISTORY_WINDOW_HOURS)
        
        hist_l = db.get_historical_water_levels_window(dam_id, t, config.ROLLING_HISTORY_WINDOW_HOURS)
        hist_if = db.get_historical_inflows_window(dam_id, t, config.ROLLING_HISTORY_WINDOW_HOURS)
        hist_dl = db.get_historical_downstream_levels_window(dam_id, t, config.ROLLING_HISTORY_WINDOW_HOURS)
        
        # Check if we have enough points (last 4-6 points)
        if len(hist_l) < 4 or len(hist_if) < 4 or len(hist_dl) < 4:
            run_id = db.insert_prediction_run(
                dam_id=dam_id,
                run_time=t,
                window_start=window_start,
                window_end=t,
                method="newton_divided_difference",
                status="insufficient_data"
            )
            print(f"[{t.strftime('%H:%M:%S')}] Dam {dam_name}: Insufficient history for prediction.")
            # Fallback to current state status determination without forecast
            gap_current = at_t - l_t
            calculated_status, trigger_reason = algorithm.classify_risk_status(gap_current, None, rr_band, "stable")
        else:
            # We have sufficient data!
            run_id = db.insert_prediction_run(
                dam_id=dam_id,
                run_time=t,
                window_start=window_start,
                window_end=t,
                method="newton_divided_difference",
                status="success"
            )
            
            # Map history times to minutes relative to t (t = 0)
            x_l = [(row[0] - t).total_seconds() / 60.0 for row in hist_l]
            y_l = [row[1] for row in hist_l]
            
            x_if = [(row[0] - t).total_seconds() / 60.0 for row in hist_if]
            y_if = [row[1] for row in hist_if]
            
            x_dl = [(row[0] - t).total_seconds() / 60.0 for row in hist_dl]
            y_dl = [row[1] for row in hist_dl]
            
            # Stations history mapping
            stations = db.get_rainfall_locations(dam_id)
            station_histories = {}
            for s in stations:
                hist_rf = db.get_historical_station_rainfall_window(s['location_id'], t, config.ROLLING_HISTORY_WINDOW_HOURS)
                station_histories[s['location_id']] = {
                    'x': [(row[0] - t).total_seconds() / 60.0 for row in hist_rf],
                    'y': [row[1] for row in hist_rf]
                }
                
            predicted_rows = []
            gaps_pred = []
            
            # Precompute arrays for prediction calculation
            # We will store horizon calculations in a dict to resolve h-15 and h-60 lookups
            horizons_data = {
                0: {
                    'L': l_t,
                    'RR': rr_short or 0.0,
                }
            }
            
            for h in config.PREDICTIONS_HORIZON_MINUTES:
                try:
                    L_pred = algorithm.newton_extrapolate(x_l, y_l, h)
                    # Clamping predicted water level between 0% and 100%
                    L_pred = max(0.0, min(100.0, L_pred))
                    
                    IF_pred = max(0.0, algorithm.newton_extrapolate(x_if, y_if, h))
                    DL_pred = max(0.0, min(100.0, algorithm.newton_extrapolate(x_dl, y_dl, h)))
                    
                    # 3.2 Rainfall station effective rainfall
                    r_net_pred = 0.0
                    for s in stations:
                        target_time_i = h - s['delay_minutes']
                        if target_time_i <= 0:
                            # Already measured (retrieve closest historical reading)
                            meas_t = t + timedelta(minutes=target_time_i)
                            rf_val = db.get_closest_rainfall(s['location_id'], meas_t)
                            if rf_val is None:
                                rf_val = 0.0
                            r_net_pred += s['weight'] * rf_val
                        else:
                            # Extrapolate
                            sh = station_histories[s['location_id']]
                            if len(sh['x']) < 2:
                                # Not enough station history, use last known value
                                rf_val = sh['y'][-1] if sh['y'] else 0.0
                            else:
                                rf_val = max(0.0, algorithm.newton_extrapolate(sh['x'], sh['y'], target_time_i))
                            r_net_pred += s['weight'] * rf_val
                            
                    # 5. Rise rate and metrics
                    L_prev_horizon = horizons_data.get(h - 15, {}).get('L', l_t)
                    RR_pred = (L_pred - L_prev_horizon) * 4.0
                    
                    # ACC
                    # h-60 could be in the past (h-60 <= 0)
                    if h - 60 <= 0:
                        # Look up past calculated rr_long at t + h - 60 minutes
                        t_acc_target = t + timedelta(minutes=h - 60)
                        past_metric = db.get_previous_calculated_metrics(dam_id, t_acc_target + timedelta(seconds=30))
                        rr_long_past = past_metric['rr_long'] if (past_metric and past_metric['rr_long'] is not None) else 0.0
                        ACC_pred = RR_pred - rr_long_past
                    else:
                        RR_prev_60 = horizons_data.get(h - 60, {}).get('RR', 0.0)
                        ACC_pred = RR_pred - RR_prev_60
                        
                    DEV_pred = RR_pred - ra
                    
                    # Band
                    band_pred = algorithm.determine_rr_band(RR_pred, RR_pred, ACC_pred, DEV_pred)
                    
                    # Threshold
                    rr_adj_p, rf_adj_p, if_adj_p, dl_adj_p = algorithm.calculate_adjustments(
                        rr_band=band_pred,
                        RF=r_net_pred,
                        IF=IF_pred,
                        if_baseline=dam['if_baseline'],
                        DL=DL_pred
                    )
                    
                    at_pred, _, _ = algorithm.calculate_adaptive_threshold(
                        base_threshold=dam['base_threshold'],
                        threshold_floor=dam['threshold_floor'],
                        rr_adj=rr_adj_p,
                        rf_adj=rf_adj_p,
                        if_adj=if_adj_p,
                        dl_adj=dl_adj_p
                    )
                    
                    gap_pred = at_pred - L_pred
                    gaps_pred.append(gap_pred)
                    
                    horizons_data[h] = {
                        'L': L_pred,
                        'RR': RR_pred
                    }
                    
                    predicted_rows.append((
                        run_id, h, L_pred, r_net_pred, IF_pred, DL_pred, RR_pred, ACC_pred, at_pred, gap_pred
                    ))
                    
                except algorithm.InsufficientDataError:
                    # In case of extrapolation failure, default
                    pass
            
            if predicted_rows:
                # Save predicted values
                db.insert_predicted_values(predicted_rows)
                
                # Crossing analysis
                gap_current = at_t - l_t
                crossing_time = None
                for idx, h in enumerate(config.PREDICTIONS_HORIZON_MINUTES):
                    if idx < len(gaps_pred) and gaps_pred[idx] <= 0:
                        crossing_time = h
                        break
                        
                crossing_ttc = crossing_time
                min_gap = min(gaps_pred) if gaps_pred else gap_current
                gap_trend = algorithm.determine_gap_trend(gap_current, gaps_pred)
                
                calculated_status, trigger_reason = algorithm.classify_risk_status(
                    gap_current=gap_current,
                    ttc=crossing_ttc,
                    rr_band=rr_band,
                    gap_trend=gap_trend
                )
                
                # Save crossing results
                db.insert_graph_crossing_result(
                    run_id=run_id,
                    crossing_time_minutes=crossing_ttc,
                    minimum_gap=min_gap,
                    gap_trend=gap_trend,
                    final_status=calculated_status
                )
    else:
        # Not a prediction run: status is evaluated reactive-only based on current metrics
        gap_current = at_t - l_t
        # To get the trend without a run, we can fetch the latest run's trend, or default to stable
        calculated_status, trigger_reason = algorithm.classify_risk_status(gap_current, None, rr_band, "stable")

    # 4. Escalation and De-escalation checks
    current_sev = config.STATUS_SEVERITY.get(calculated_status, 0)
    prev_sev = config.STATUS_SEVERITY.get(prev_status, 0)
    
    official_status = prev_status
    
    if current_sev > prev_sev:
        # Escalation is immediate
        official_status = calculated_status
        db.reset_deescalation_tracking(dam_id)
        # Log alert immediately
        alert_msg = f"Escalation warning: Dam {dam_name} status raised from {prev_status} to {official_status}. Reason: {trigger_reason}"
        db.insert_alert(dam_id, run_id, t, prev_status, official_status, alert_msg)
        print(f"\n[ALERT] Escalating status of {dam_name} from {prev_status} to {official_status}!")
    elif current_sev < prev_sev:
        # De-escalation process
        # Downgrade one level at a time. Identify the next step down:
        next_step_down = None
        if prev_status == "RED":
            next_step_down = "ORANGE"
        elif prev_status == "ORANGE":
            next_step_down = "YELLOW"
        elif prev_status == "YELLOW":
            next_step_down = "GREEN"
            
        if next_step_down:
            # Retrieve tracking timer for this specific transition
            trackings = db.get_deescalation_tracking(dam_id)
            active_track = None
            for tr in trackings:
                if tr['transition_from'] == prev_status and tr['transition_to'] == next_step_down:
                    active_track = tr
                    break
                    
            required_minutes = 15
            if prev_status == "ORANGE":
                required_minutes = 30
            elif prev_status == "YELLOW":
                required_minutes = 60
                
            # Check de-escalation condition
            # RED -> ORANGE: rr_band below High, ACC < 0, L stable/dropping
            # ORANGE -> YELLOW: rr_band within Elevated, ACC <= 0, R_net decreasing
            # YELLOW -> GREEN: rr_band = NORMAL, L stable/dropping
            
            # Fetch past values for condition checks
            l_prev = None
            if l_15_rows:
                # get a value about 15 mins ago
                match_prev = [r[1] for r in l_15_rows if r[0] < t]
                if match_prev:
                    l_prev = match_prev[-1]
                    
            r_net_prev = db.get_closest_r_net(dam_id, t - timedelta(minutes=15))
            
            condition_holds = algorithm.check_deescalation_conditions(
                transition=f"{prev_status} -> {next_step_down}",
                rr_band=rr_band,
                acc=acc,
                l_now=l_t,
                l_prev=l_prev,
                r_net_now=r_net_t,
                r_net_prev=r_net_prev
            )
            
            if condition_holds:
                condition_met_since = t
                consecutive_mins = 0
                
                if active_track and active_track['condition_met_since']:
                    condition_met_since = active_track['condition_met_since']
                    consecutive_mins = int((t - condition_met_since).total_seconds() / 60.0)
                    
                eligible = (consecutive_mins >= required_minutes)
                
                if eligible:
                    # Perform one-level downgrade!
                    official_status = next_step_down
                    db.reset_deescalation_tracking(dam_id)
                    print(f"\n[DE-ESCALATION] Downgrading {dam_name} from {prev_status} to {official_status} (condition sustained for {consecutive_mins} min)")
                    
                    # Log downgrade alert
                    alert_msg = f"Status de-escalated: Dam {dam_name} lowered from {prev_status} to {official_status} after sustained improvement."
                    db.insert_alert(dam_id, run_id, t, prev_status, official_status, alert_msg)
                else:
                    # Update tracking details
                    db.save_deescalation_tracking(
                        dam_id=dam_id,
                        transition_from=prev_status,
                        transition_to=next_step_down,
                        condition_met_since=condition_met_since,
                        consecutive_minutes=consecutive_mins,
                        required_minutes=required_minutes,
                        eligible_flag=False
                    )
            else:
                # Conditions don't hold: reset tracking timers
                db.reset_deescalation_tracking(dam_id)
    else:
        # Status matches computed severity, reset any running de-escalation timers
        db.reset_deescalation_tracking(dam_id)
        
    # Write official status row for this minute cycle
    db.insert_risk_status(
        dam_id=dam_id,
        status_time=t,
        status=official_status,
        ttc_minutes=crossing_ttc,
        trigger_reason=trigger_reason,
        previous_status=prev_status
    )
    
    # 5. Proportional release recommendation (only while status is ORANGE or RED)
    if official_status in ["ORANGE", "RED"]:
        # Predict rise rate at t+15 (h=15 from predictions, or run extrapolation for h=15)
        # Note: if is_prediction_cycle, we already computed L_pred(t+15). Otherwise, let's calculate it directly:
        rr_pred_15 = 0.0
        try:
            hist_l_6h = db.get_historical_water_levels_window(dam_id, t, config.ROLLING_HISTORY_WINDOW_HOURS)
            if len(hist_l_6h) >= 4:
                x_l = [(row[0] - t).total_seconds() / 60.0 for row in hist_l_6h]
                y_l = [row[1] for row in hist_l_6h]
                L_pred_15 = max(0.0, min(100.0, algorithm.newton_extrapolate(x_l, y_l, 15)))
                rr_pred_15 = (L_pred_15 - l_t) * 4.0
            else:
                rr_pred_15 = rr_short or 0.0
        except Exception:
            rr_pred_15 = rr_short or 0.0
            
        rec = algorithm.calculate_release_recommendation(
            rr_pred_15=rr_pred_15,
            max_gate_capacity=dam['max_gate_capacity'],
            downstream_capacity=dam['downstream_capacity'],
            dl_now=dl_t,
            l_now=l_t,
            adaptive_threshold_now=at_t,
            threshold_floor=dam['threshold_floor'],
            reservoir_capacity=dam['reservoir_capacity'],
            inflow_now=if_t
        )
        
        # Save release recommendation
        db.insert_release_recommendation(
            dam_id=dam_id,
            run_id=run_id,
            calc_time=t,
            strategy="proportional_rise_rate",
            rise_rate_used=rr_pred_15,
            gate_opening_base_pct=rec['gate_opening_base_pct'],
            q_desired=rec['q_desired'],
            q_downstream_available=rec['q_downstream_available'],
            q_release=rec['q_release'],
            gate_opening_applied_pct=rec['gate_opening_applied_pct'],
            conflict_warning=rec['conflict_warning'],
            estimated_duration_minutes=rec['estimated_duration_minutes']
        )
        
    print(f"[{t.strftime('%H:%M:%S')}] {dam_name} | Status: {official_status} | Level: {l_t}% | Threshold: {at_t:.1f}%")
    return official_status

def run_loop():
    db = DatabaseManager()
    print("=============================================")
    print("  FLOODGUARD: BACKEND PROCESSOR ENGINE       ")
    print("=============================================\n")
    print("Connecting to local database...")
    try:
        db.connect()
        print("Connected. Ingestion loop started.")
    except Exception as e:
        print(f"CRITICAL: Failed to establish database connection: {e}")
        return

    try:
        while True:
            dams = db.get_all_dams()
            if not dams:
                print("No configured dams found in the database. Waiting...")
                time.sleep(5)
                continue
                
            for dam in dams:
                dam_id = dam['dam_id']
                
                # Check for unprocessed water level readings
                last_processed_t = db.get_latest_processed_time(dam_id)
                unprocessed = db.get_unprocessed_water_levels(dam_id, last_processed_t)
                
                if unprocessed:
                    print(f"\nProcessing {len(unprocessed)} backlog readings for dam {dam['dam_name']}...")
                    for reading_time, water_level_pct in unprocessed:
                        try:
                            process_dam_cycle(db, dam, reading_time, water_level_pct)
                        except Exception as e:
                            print(f"Error processing cycle for dam {dam['dam_name']} at {reading_time}: {e}")
                            
            # Sleep 15 seconds before checking for new readings
            time.sleep(15)
            
    except KeyboardInterrupt:
        print("\nProcessor Engine stopped by user.")
    finally:
        db.close()

if __name__ == "__main__":
    run_loop()
