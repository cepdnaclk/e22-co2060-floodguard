"""
Stateless deterministic mathematical algorithms for the FloodGuard processor engine.
"""

from typing import Tuple, Optional
import config

def validate_input(L: float, RF: float, IF: float, DL: float) -> Tuple[bool, list]:
    missing = []
    is_valid = True
    
    if L is None or not (0 <= L <= 100):
        missing.append("L")
        is_valid = False
    if RF is None or RF < 0:
        missing.append("RF")
        is_valid = False
    if IF is None or IF < 0:
        missing.append("IF")
        is_valid = False
    if DL is None or DL < 0:
        missing.append("DL")
        is_valid = False
        
    return is_valid, missing

def calculate_rise_rates(L_now: float, L_15: Optional[float], L_60: Optional[float]) -> Tuple[Optional[float], Optional[float]]:
    rr_short = None
    rr_long = None
    
    if L_15 is not None:
        rr_short = (L_now - L_15) * 4.0
    if L_60 is not None:
        rr_long = L_now - L_60
        
    return rr_short, rr_long

def calculate_acceleration(rr_long_now: Optional[float], rr_long_60: Optional[float]) -> Optional[float]:
    if rr_long_now is not None and rr_long_60 is not None:
        return rr_long_now - rr_long_60
    return None

def calculate_rolling_average(rr_long_history: list) -> Optional[float]:
    if not rr_long_history or len(rr_long_history) == 0:
        return None
    return sum(rr_long_history) / len(rr_long_history)

def calculate_deviation(rr_short: Optional[float], ra: Optional[float]) -> Optional[float]:
    if rr_short is not None and ra is not None:
        return rr_short - ra
    return None

def determine_rr_band(rr_short: Optional[float], rr_long: Optional[float], acc: Optional[float], dev: Optional[float]) -> str:
    # Safely handle Nones by treating them as conditions not met
    r_long = rr_long if rr_long is not None else -999.0
    r_short = rr_short if rr_short is not None else -999.0
    a_cc = acc if acc is not None else -999.0
    d_ev = dev if dev is not None else -999.0

    # 8.4 CRITICAL
    if r_long > 4.0 or r_short > 7.0 or a_cc > 3.0 or d_ev > 5.0:
        return "CRITICAL"
    
    # 8.3 HIGH
    if (2.5 <= r_long <= 4.0) or (4.0 <= r_short <= 7.0) or (1.5 <= a_cc <= 3.0):
        return "HIGH"
        
    # 8.2 ELEVATED
    if (1.0 <= r_long < 2.5) or (2.0 <= r_short < 4.0) or (0.5 <= a_cc < 1.5):
        return "ELEVATED"
        
    # 8.1 NORMAL
    # Note: If history is completely missing, it falls back to NORMAL or UNKNOWN in higher layers
    return "NORMAL"

def calculate_adjustments(rr_band: str, RF: float, IF: float, DL: float) -> Tuple[int, int, int, int]:
    # 9.1 RR_adj
    rr_adj_map = {"NORMAL": 0, "ELEVATED": 8, "HIGH": 18, "CRITICAL": 30}
    rr_adj = rr_adj_map.get(rr_band, 0)
    
    # 9.2 RF_adj
    if RF < 10:
        rf_adj = 0
    elif RF <= 25:
        rf_adj = 3
    elif RF <= 50:
        rf_adj = 7
    else:
        rf_adj = 12
        
    # 9.3 IF_adj
    ratio = IF / config.IF_baseline
    if ratio < 1.5:
        if_adj = 0
    elif ratio < 2.5:
        if_adj = 4
    elif ratio < 4.0:
        if_adj = 8
    else:
        if_adj = 13
        
    # 9.4 DL_adj
    if DL < 50:
        dl_adj = 0
    elif DL <= 70:
        dl_adj = 3
    elif DL <= 85:
        dl_adj = 8
    else:
        dl_adj = 15
        
    return rr_adj, rf_adj, if_adj, dl_adj

def calculate_adaptive_threshold(rr_adj: int, rf_adj: int, if_adj: int, dl_adj: int) -> float:
    at = config.BASE_THRESHOLD - rr_adj - rf_adj - if_adj - dl_adj
    at = max(config.MIN_ADAPTIVE_THRESHOLD, min(config.MAX_ADAPTIVE_THRESHOLD, at))
    return float(at)

def determine_status(L: float, AT: float, rr_band: str, DL: float) -> str:
    margin_3 = AT + 3.0
    margin_2 = AT + 10.0
    
    # 11.1 RED
    if L > AT or rr_band == "CRITICAL" or (DL > 85 and rr_band in ["HIGH", "CRITICAL"]):
        return "RED"
        
    # 11.2 ORANGE
    # Note: ACC > 0 is part of the requirement for ORANGE, but the input to determine_status doesn't have it.
    # Wait, let's fix this in the signature.
    return "UNKNOWN" # Will fix below

def determine_status_full(L: float, AT: float, rr_band: str, DL: float, acc: Optional[float]) -> Tuple[str, str]:
    margin_1 = AT - 20.0
    margin_2 = AT - 10.0
    margin_3 = AT - 3.0
    a_cc = acc if acc is not None else 0.0
    
    # 11.1 RED
    if L > AT or rr_band == "CRITICAL" or (DL > 85 and rr_band in ["HIGH", "CRITICAL"]):
        return "RED", "Immediate gate operation required"
        
    # 11.2 ORANGE
    if L > margin_3 or (rr_band == "HIGH" and a_cc > 0):
        return "ORANGE", "Begin controlled partial release. Alert downstream communities."
        
    # 11.3 YELLOW
    if L > margin_2 or rr_band == "ELEVATED":
        return "YELLOW", "Operators on standby, prepare"
        
    # 11.4 GREEN
    return "GREEN", "Continue monitoring"

def calculate_release_recommendation(L: float, AT: float, IF: float, DL: float) -> dict:
    # Step 1: ReleaseRate
    safe_storage_rate = (AT - L) * config.ReservoirCapacity / 60.0
    release_rate = IF - safe_storage_rate
    
    # Step 2: MaxSafeRelease
    max_safe_release = round(config.DownstreamCapacity * (1.0 - (DL / 100.0)), 2)
    if max_safe_release < 0:
        max_safe_release = 0.0
        
    conflict_warning = None
    if release_rate > max_safe_release:
        release_rate = max_safe_release
        conflict_warning = "Full required release exceeds downstream capacity"
        
    # Step 3: GateOpeningPercent
    gate_opening_raw = (release_rate / config.MaxGateCapacity) * 100.0
    # Round to nearest 5
    gate_opening_percent = round(gate_opening_raw / 5.0) * 5
    gate_opening_percent = max(0, min(100, int(gate_opening_percent)))
    
    # Step 4: EstimatedDuration
    target_safe_level = AT - config.TARGET_SAFE_BUFFER
    duration = None
    if release_rate > IF and L > target_safe_level:
        duration_raw = ((L - target_safe_level) / (release_rate - IF)) * 60.0
        duration = int(max(0, duration_raw))
    elif release_rate <= IF:
        if conflict_warning:
            conflict_warning += " | Release rate is not greater than inflow; reservoir level may not decrease."
        else:
            conflict_warning = "Release rate is not greater than inflow; reservoir level may not decrease."
            
    return {
        "active": True,
        "ReleaseRate": float(release_rate),
        "MaxSafeRelease": float(max_safe_release),
        "GateOpeningPercent": gate_opening_percent,
        "TargetSafeLevel": float(target_safe_level),
        "EstimatedDurationMinutes": duration,
        "conflict_warning": conflict_warning
    }
