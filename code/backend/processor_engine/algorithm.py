"""
Stateless deterministic mathematical algorithms for the FloodGuard processor engine.
Implements Newton divided-difference extrapolation, adaptive threshold calculations,
time-to-crossing risk status classification, and proportional gate release logic.
"""

from typing import Tuple, Optional, List, Dict
import math

class InsufficientDataError(Exception):
    """Raised when there is insufficient historical data to perform a calculation."""
    pass

def validate_input(l_t: Optional[float], r_net_t: Optional[float], if_t: Optional[float], dl_t: Optional[float]) -> Tuple[bool, List[str]]:
    """
    Validate that all required sensor inputs are present.
    Returns (is_valid, missing_fields_list).
    """
    missing = []
    if l_t is None:
        missing.append("water_level")
    if r_net_t is None:
        missing.append("r_net")
    if if_t is None:
        missing.append("inflow")
    if dl_t is None:
        missing.append("downstream_level")
    return len(missing) == 0, missing

def calculate_rise_rates(L_now: float, L_15: Optional[float], L_60: Optional[float]) -> Tuple[Optional[float], Optional[float]]:
    """
    Calculate short-term (15-min) and long-term (60-min) rise rates in %/hour.
    """
    rr_short = (L_now - L_15) * 4.0 if L_15 is not None else None
    rr_long = (L_now - L_60) * 1.0 if L_60 is not None else None
    return rr_short, rr_long

def calculate_acceleration(rr_long: Optional[float], rr_long_60: Optional[float]) -> Optional[float]:
    """
    Calculate water level acceleration (change in long-term rise rate over 60 mins).
    """
    if rr_long is not None and rr_long_60 is not None:
        return rr_long - rr_long_60
    return None

def calculate_rolling_average(rr_longs: List[float]) -> float:
    """
    Calculate the rolling average of long-term rise rates over a list of historical values.
    """
    if not rr_longs:
        return 0.0
    return sum(rr_longs) / len(rr_longs)

def calculate_deviation(rr_short: Optional[float], RA: float) -> Optional[float]:
    """
    Calculate the deviation of short-term rise rate from the 3-hour rolling average.
    """
    if rr_short is not None:
        return rr_short - RA
    return None

def newton_extrapolate(x_nodes: List[float], y_nodes: List[float], x_target: float) -> float:
    """
    Perform Newton divided-difference extrapolation on the given nodes.
    To avoid high-degree oscillations (Runge's phenomenon), we use a lower-degree fit
    by selecting the most recent 3 or 4 points if more are provided.
    
    Args:
        x_nodes (List[float]): List of floats representing timestamps (e.g., in minutes relative to now).
                               Expected to be in ascending order.
        y_nodes (List[float]): List of floats representing corresponding sensor values.
        x_target (float): Target time to extrapolate to (e.g., h minutes in the future).
        
    Returns:
        float: The extrapolated sensor value at x_target.
        
    Raises:
        InsufficientDataError: If x_nodes is empty.
    """
    n = len(x_nodes)
    if n == 0:
        raise InsufficientDataError("No nodes available for extrapolation.")
    if n == 1:
        return y_nodes[0]
    
    # Select the last 3-4 nodes to keep degree low and avoid Runge's phenomenon
    if n > 3:
        x_nodes = x_nodes[-3:]
        y_nodes = y_nodes[-3:]
        n = len(x_nodes)
        
    # Construct divided difference table
    coef = list(y_nodes)
    for j in range(1, n):
        for i in range(n - 1, j - 1, -1):
            denom = x_nodes[i] - x_nodes[i - j]
            if abs(denom) < 1e-9:
                # Avoid division by zero
                coef[i] = 0.0
            else:
                coef[i] = (coef[i] - coef[i - 1]) / denom
                
    # Evaluate at x_target
    val = coef[n - 1]
    for i in range(n - 2, -1, -1):
        val = coef[i] + (x_target - x_nodes[i]) * val
    return val

def determine_rr_band(rr_pred_or_long: Optional[float], rr_short: Optional[float], acc: Optional[float], dev: Optional[float]) -> str:
    """
    Determine the rise-rate severity band.
    Worst-first logic is applied: first matching condition wins.
    """
    r_pred = rr_pred_or_long if rr_pred_or_long is not None else -999.0
    r_short = rr_short if rr_short is not None else -999.0
    a_cc = acc if acc is not None else -999.0
    d_ev = dev if dev is not None else -999.0

    # 1. CRITICAL
    if r_pred > 4.0 or r_short > 7.0 or a_cc > 3.0 or d_ev > 5.0:
        return "CRITICAL"
    
    # 2. HIGH
    if (2.5 <= r_pred <= 4.0) or (4.0 <= r_short <= 7.0) or (1.5 <= a_cc <= 3.0):
        return "HIGH"
        
    # 3. ELEVATED
    if (1.0 <= r_pred < 2.5) or (2.0 <= r_short < 4.0) or (0.5 <= a_cc < 1.5):
        return "ELEVATED"
        
    # 4. NORMAL
    return "NORMAL"

def calculate_adjustments(rr_band: str, RF: float, IF: float, if_baseline: float, DL: float) -> Tuple[float, float, float, float]:
    """
    Calculate threshold adjustments based on live/predicted parameters.
    """
    # RR_adj
    rr_adj_map = {"NORMAL": 0.0, "ELEVATED": 8.0, "HIGH": 18.0, "CRITICAL": 30.0}
    rr_adj = rr_adj_map.get(rr_band, 0.0)
    
    # RF_adj
    if RF < 10.0:
        rf_adj = 0.0
    elif RF <= 25.0:
        rf_adj = 3.0
    elif RF <= 50.0:
        rf_adj = 7.0
    else:
        rf_adj = 12.0
        
    # IF_adj
    if if_baseline <= 0:
        ratio = 0.0
    else:
        ratio = IF / if_baseline
        
    if ratio < 1.5:
        if_adj = 0.0
    elif ratio < 2.5:
        if_adj = 4.0
    elif ratio < 4.0:
        if_adj = 8.0
    else:
        if_adj = 13.0
        
    # DL_adj
    if DL < 50.0:
        dl_adj = 0.0
    elif DL <= 70.0:
        dl_adj = 3.0
    elif DL <= 85.0:
        dl_adj = 8.0
    else:
        dl_adj = 15.0
        
    return rr_adj, rf_adj, if_adj, dl_adj

def calculate_adaptive_threshold(
    base_threshold: float,
    threshold_floor: float,
    rr_adj: float,
    rf_adj: float,
    if_adj: float,
    dl_adj: float
) -> Tuple[float, bool, bool]:
    """
    Calculate clapped adaptive threshold and return (AT, floor_triggered, ceiling_triggered).
    """
    raw_at = base_threshold - rr_adj - rf_adj - if_adj - dl_adj
    floor_triggered = False
    ceiling_triggered = False
    
    if raw_at < threshold_floor:
        at = threshold_floor
        floor_triggered = True
    elif raw_at > base_threshold:
        at = base_threshold
        ceiling_triggered = True
    else:
        at = raw_at
        
    return float(at), floor_triggered, ceiling_triggered

def determine_gap_trend(gap_current: float, gaps_pred: List[float]) -> str:
    """
    Determine the gap trend. Compare consecutive gap points.
    Returns: "increasing", "decreasing", "stable"
    """
    all_gaps = [gap_current] + gaps_pred
    diffs = [all_gaps[i] - all_gaps[i-1] for i in range(1, len(all_gaps))]
    
    neg_diffs = sum(1 for d in diffs if d < -1e-5)
    pos_diffs = sum(1 for d in diffs if d > 1e-5)
    
    if neg_diffs > pos_diffs:
        return "decreasing"
    elif pos_diffs > neg_diffs:
        return "increasing"
    else:
        return "stable"

def classify_risk_status(
    gap_current: float,
    ttc: Optional[int],
    rr_band: str,
    gap_trend: str
) -> Tuple[str, str]:
    """
    Determine official risk status and trigger reason based on system state.
    Evaluates risk rules in order of severity: RED, ORANGE, YELLOW, GREEN.
    
    Args:
        gap_current (float): The current distance between the water level and the adaptive threshold.
                             If <= 0, the threshold is breached.
        ttc (Optional[int]): Time-to-crossing in minutes. None if crossing is not predicted.
        rr_band (str): Rise-rate severity band (e.g., "CRITICAL", "HIGH", "ELEVATED", "NORMAL").
        gap_trend (str): Trend of the gap ("increasing", "decreasing", "stable").
        
    Returns:
        Tuple[str, str]: A tuple containing the risk status (RED/ORANGE/YELLOW/GREEN) 
                         and a human-readable trigger reason.
    """
    # RED
    if gap_current <= 0:
        return "RED", "Current water level exceeds adaptive threshold."
    if ttc is not None and ttc <= 15:
        return "RED", f"Water level predicted to cross threshold in {ttc} minutes (TTC <= 15)."
    if rr_band == "CRITICAL":
        return "RED", "Rise-rate severity band is CRITICAL."
        
    # ORANGE
    if ttc is not None and 15 < ttc <= 60:
        return "ORANGE", f"Water level predicted to cross threshold in {ttc} minutes (15 < TTC <= 60)."
    if rr_band == "HIGH" and gap_trend == "decreasing":
        return "ORANGE", "Rise-rate band is HIGH and the gap is decreasing."
        
    # YELLOW
    if ttc is not None and ttc > 60:
        return "YELLOW", f"Water level predicted to cross threshold in {ttc} minutes (TTC > 60)."
    if rr_band == "ELEVATED":
        return "YELLOW", "Rise-rate band is ELEVATED."
    if ttc is None and gap_trend == "decreasing":
        return "YELLOW", "No threshold crossing predicted but the gap is decreasing."
        
    # GREEN
    return "GREEN", "System metrics are within normal bounds."

def check_deescalation_conditions(
    transition: str,
    rr_band: str,
    acc: Optional[float],
    l_now: float,
    l_prev: Optional[float],
    r_net_now: float,
    r_net_prev: Optional[float]
) -> bool:
    """
    Verify if conditions are met for a specific de-escalation transition.
    """
    a_cc = acc if acc is not None else 0.0
    
    if transition == "RED -> ORANGE":
        # RR_band below High threshold (i.e. NORMAL or ELEVATED) AND ACC <= 0 AND L(t) stable or dropping
        is_rr_below_high = rr_band in ["NORMAL", "ELEVATED"]
        is_acc_neg = a_cc <= 0.0
        is_l_stable = l_prev is None or l_now <= l_prev
        return is_rr_below_high and is_acc_neg and is_l_stable
        
    elif transition == "ORANGE -> YELLOW":
        # RR_band within Elevated (meaning NORMAL or ELEVATED) AND ACC <= 0 AND (R_net decreasing or rain is zero)
        is_rr_elevated_or_normal = rr_band in ["NORMAL", "ELEVATED"]
        is_acc_neg_or_zero = a_cc <= 0.0
        is_r_decreasing = r_net_prev is None or r_net_now < r_net_prev or r_net_now < 1e-3
        return is_rr_elevated_or_normal and is_acc_neg_or_zero and is_r_decreasing
        
    elif transition == "YELLOW -> GREEN":
        # RR_band = NORMAL AND L(t) stable or dropping
        is_rr_normal = rr_band == "NORMAL"
        is_l_stable = l_prev is None or l_now <= l_prev
        return is_rr_normal and is_l_stable
        
    return False

def calculate_release_recommendation(
    rr_pred_15: float,
    max_gate_capacity: float,
    downstream_capacity: float,
    dl_now: float,
    l_now: float,
    adaptive_threshold_now: float,
    threshold_floor: float,
    reservoir_capacity: float,
    inflow_now: float
) -> Dict:
    """
    Calculate the recommended proportional release.
    """
    r = rr_pred_15
    
    # Piecewise linear GateOpening_base%
    if r <= 1.0:
        gate_opening_base = 0.0
    elif 1.0 < r <= 2.5:
        gate_opening_base = ((r - 1.0) / 1.5) * 30.0
    elif 2.5 < r <= 4.0:
        gate_opening_base = 30.0 + ((r - 2.5) / 1.5) * 40.0
    elif 4.0 < r < 7.0:
        gate_opening_base = 70.0 + ((r - 4.0) / 3.0) * 30.0
    else:  # r >= 7.0
        gate_opening_base = 100.0
        
    # Round base opening to nearest 5%
    gate_opening_base_rounded = round(gate_opening_base / 5.0) * 5.0
    gate_opening_base_rounded = max(0.0, min(100.0, gate_opening_base_rounded))
    
    # Q_desired
    q_desired = (gate_opening_base_rounded / 100.0) * max_gate_capacity
    
    # Q_downstream_available
    q_downstream_available = downstream_capacity * (1.0 - (dl_now / 100.0))
    q_downstream_available = max(0.0, q_downstream_available)
    
    # Q_release (clamped)
    q_release = min(q_desired, q_downstream_available, max_gate_capacity)
    
    # Applied opening
    if max_gate_capacity > 0:
        gate_opening_applied = (q_release / max_gate_capacity) * 100.0
    else:
        gate_opening_applied = 0.0
        
    conflict_warning = q_desired > q_downstream_available
    
    # Target safe level
    target_safe_level = max(adaptive_threshold_now - 10.0, threshold_floor)
    
    # Excess level pct
    excess_level_pct = max(l_now - target_safe_level, 0.0)
    
    # Excess volume
    excess_volume = (excess_level_pct / 100.0) * reservoir_capacity
    
    # Net outflow
    net_outflow = q_release - inflow_now
    
    if net_outflow > 0:
        estimated_duration_minutes = (excess_volume / net_outflow) / 60.0
    else:
        estimated_duration_minutes = None
        
    return {
        "gate_opening_base_pct": gate_opening_base_rounded,
        "q_desired": q_desired,
        "q_downstream_available": q_downstream_available,
        "q_release": q_release,
        "gate_opening_applied_pct": gate_opening_applied,
        "conflict_warning": conflict_warning,
        "target_safe_level": target_safe_level,
        "estimated_duration_minutes": estimated_duration_minutes
    }
