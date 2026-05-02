"""
Main Processor Engine Loop.
Polls sensor readings, executes algorithms, stores processed results, and triggers alerts.
"""

import time
import json
import config
from database import DatabaseManager
import algorithm

def process_single_reading(db: DatabaseManager, raw: dict):
    # 1. Receive
    ts = raw['timestamp']
    L = float(raw['l']) if raw['l'] is not None else None
    RF = float(raw['rf']) if raw['rf'] is not None else None
    IF = float(raw['if_']) if raw['if_'] is not None else None
    DL = float(raw['dl']) if raw['dl'] is not None else None
    
    # 2. Validate
    is_valid, missing = algorithm.validate_input(L, RF, IF, DL)
    
    warnings = []
    
    # 3. Retrieve History
    L_15 = db.get_historical_l(ts, config.SHORT_WINDOW_MINUTES)
    L_60 = db.get_historical_l(ts, config.LONG_WINDOW_MINUTES)
    rr_long_60 = db.get_historical_rr_long(ts, config.LONG_WINDOW_MINUTES)
    recent_rr_longs = db.get_last_n_rr_long(ts, config.ROLLING_AVERAGE_WINDOW_MINUTES)
    prev_status = db.get_previous_status(ts) or "UNKNOWN"

    if L_15 is None: warnings.append("Missing L(t-15) history")
    if L_60 is None: warnings.append("Missing L(t-60) history")
    if rr_long_60 is None: warnings.append("Missing RR_long(t-60) history")
    if len(recent_rr_longs) < config.ROLLING_AVERAGE_WINDOW_MINUTES:
        warnings.append(f"Insufficient history for RA: {len(recent_rr_longs)}/{config.ROLLING_AVERAGE_WINDOW_MINUTES}")

    # 4. Calculate
    rr_short, rr_long = algorithm.calculate_rise_rates(L, L_15, L_60)
    acc = algorithm.calculate_acceleration(rr_long, rr_long_60)
    ra = algorithm.calculate_rolling_average(recent_rr_longs)
    dev = algorithm.calculate_deviation(rr_short, ra)

    # 5. Determine RR_band
    rr_band = algorithm.determine_rr_band(rr_short, rr_long, acc, dev)

    # 6. Calculate Adjustments
    if is_valid:
        rr_adj, rf_adj, if_adj, dl_adj = algorithm.calculate_adjustments(rr_band, RF, IF, DL)
    else:
        rr_adj, rf_adj, if_adj, dl_adj = 0, 0, 0, 0

    # 7. Calculate adaptive threshold
    at = algorithm.calculate_adaptive_threshold(rr_adj, rf_adj, if_adj, dl_adj)

    # 8. Determine status
    if is_valid:
        status, action_msg = algorithm.determine_status_full(L, at, rr_band, DL, acc)
    else:
        status, action_msg = "DATA_INSUFFICIENT", "Cannot determine status due to invalid inputs."

    # Status Worsened Logic
    cur_sev = config.STATUS_SEVERITY.get(status, -1)
    prev_sev = config.STATUS_SEVERITY.get(prev_status, -1)
    status_changed = (status != prev_status)
    status_worsened = (cur_sev > prev_sev) and (cur_sev > 0)

    # 9-10. Release Recommendation
    release_active = False
    release_rate = max_safe_release = gate_opening = target_safe = est_duration = conflict = None
    
    if status in ["ORANGE", "RED"] and is_valid:
        rec = algorithm.calculate_release_recommendation(L, at, IF, DL)
        release_active = True
        release_rate = rec["ReleaseRate"]
        max_safe_release = rec["MaxSafeRelease"]
        gate_opening = rec["GateOpeningPercent"]
        target_safe = rec["TargetSafeLevel"]
        est_duration = rec["EstimatedDurationMinutes"]
        conflict = rec["conflict_warning"]

    # Package Result
    result = {
        "timestamp": ts,
        "l_t": L, "rf_t": RF, "if_t": IF, "dl_t": DL,
        "rr_short": rr_short, "rr_long": rr_long, "acc": acc, "ra": ra, "dev": dev,
        "rr_adj": rr_adj, "rf_adj": rf_adj, "if_adj": if_adj, "dl_adj": dl_adj,
        "base_threshold": config.BASE_THRESHOLD, "adaptive_threshold": at,
        "margin_1": at + 20.0, "margin_2": at + 10.0, "margin_3": at + 3.0,
        "rr_band": rr_band, "status": status, "previous_status": prev_status,
        "status_changed": status_changed, "status_worsened": status_worsened,
        "release_active": release_active, "release_rate": release_rate,
        "max_safe_release": max_safe_release, "gate_opening_percent": gate_opening,
        "target_safe_level": target_safe, "est_duration_mins": est_duration,
        "conflict_warning": conflict,
        "action_message": action_msg,
        "warnings": ", ".join(warnings) if warnings else None,
        "is_valid": is_valid,
        "missing_fields": ", ".join(missing) if missing else None
    }

    # 11. Store
    db.insert_processed_result(result)

    # 12. Dashboard / Console update
    print(f"[{ts.strftime('%H:%M:%S')}] {status} | L:{L}% AT:{at}% | Band:{rr_band} | {action_msg}")
    if release_active:
        print(f"   -> GATE: {gate_opening}% (Est. {est_duration}m)")
    if conflict:
        print(f"   -> CONFLICT: {conflict}")

    # 13. Alerts
    if status_worsened:
        fire_alert(result)

def fire_alert(result: dict):
    print("\n" + "!"*50)
    print("!!! ALERT: STATUS ESCALATION !!!")
    print(f"!!! {result['previous_status']} -> {result['status']} !!!")
    print("!"*50 + "\n")

def run_loop():
    db = DatabaseManager()
    print("Processor Engine Started. Polling database...")
    try:
        while True:
            raw = db.get_latest_unprocessed_reading()
            if raw:
                process_single_reading(db, raw)
            else:
                time.sleep(2) # Poll interval
    except KeyboardInterrupt:
        print("Processor Engine stopped.")
    finally:
        db.close()

if __name__ == "__main__":
    run_loop()
