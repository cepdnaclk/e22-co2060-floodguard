"""
Dam Flood Early Warning System
Live Data Simulator
Replays CSV scenario data in real time to your backend API
Use this for live dashboard demos
"""

import csv
import time
import json
import argparse
import requests
from datetime import datetime
from pathlib import Path

# ─────────────────────────────────────────────
# CONFIGURATION
# Change API_URL to match your backend endpoint
# ─────────────────────────────────────────────
API_URL          = "http://localhost:8000/api/sensor-reading"
REPLAY_SPEED     = 1        # 1 = real time (1 reading per second)
                             # 2 = 2× speed, 10 = fast demo mode
SCENARIO_FILES = {
    "1": "output/scenario_1_normal_rain.csv",
    "2": "output/scenario_2_heavy_rain.csv",
    "3": "output/scenario_3_catastrophic.csv",
}

# ─────────────────────────────────────────────
# COLOURS for terminal output
# ─────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
ORANGE = "\033[33m"
RED    = "\033[91m"
RESET  = "\033[0m"
BOLD   = "\033[1m"
CYAN   = "\033[96m"
GREY   = "\033[90m"

def status_colour(status):
    colours = {
        "GREEN" : GREEN,
        "YELLOW": YELLOW,
        "ORANGE": ORANGE,
        "RED"   : RED,
    }
    return colours.get(status, RESET)

# ─────────────────────────────────────────────
# ALGORITHM — replicated here so simulator
# can compute and display risk status locally
# alongside sending to backend
# ─────────────────────────────────────────────
BASE_THRESHOLD = 75.0
FLOOR          = 30.0
IF_BASELINE    = 120.0

def compute_rr_band(rr_short, rr_long, acc):
    """Determine rise rate band from algorithm Block 5"""
    if (rr_long > 4.0 or rr_short > 7.0 or acc > 3.0):
        return "CRITICAL"
    if (rr_long > 2.5 or rr_short > 4.0 or acc > 1.5):
        return "HIGH"
    if (rr_long > 1.0 or rr_short > 2.0 or acc > 0.5):
        return "ELEVATED"
    return "NORMAL"

def compute_adjustments(rr_band, rainfall, inflow, downstream):
    """Compute all threshold adjustments — Algorithm Block 6"""
    # Rise rate adjustment
    rr_adj = {"NORMAL": 0, "ELEVATED": 8, "HIGH": 18, "CRITICAL": 30}[rr_band]

    # Rainfall adjustment
    if rainfall < 10:    rf_adj = 0
    elif rainfall < 25:  rf_adj = 3
    elif rainfall < 50:  rf_adj = 7
    else:                rf_adj = 12

    # Inflow adjustment
    ratio = inflow / IF_BASELINE
    if ratio < 1.5:    if_adj = 0
    elif ratio < 2.5:  if_adj = 4
    elif ratio < 4.0:  if_adj = 8
    else:              if_adj = 13

    # Downstream adjustment
    if downstream < 50:    dl_adj = 0
    elif downstream < 70:  dl_adj = 3
    elif downstream < 85:  dl_adj = 8
    else:                  dl_adj = 15

    return rr_adj, rf_adj, if_adj, dl_adj

def compute_adaptive_threshold(rr_adj, rf_adj, if_adj, dl_adj):
    """Algorithm Block 7"""
    at = BASE_THRESHOLD - rr_adj - rf_adj - if_adj - dl_adj
    return max(FLOOR, at)

def compute_status(level, at, rr_band, downstream):
    """Algorithm Block 8"""
    if (level >= at
            or rr_band == "CRITICAL"
            or (downstream > 85 and rr_band in ["HIGH", "CRITICAL"])):
        return "RED"
    if (level >= at + 3
            or (rr_band == "HIGH")):
        return "ORANGE"
    if (level >= at + 10
            or rr_band == "ELEVATED"):
        return "YELLOW"
    return "GREEN"

# ─────────────────────────────────────────────
# HISTORY BUFFER — needed for rise rate calc
# ─────────────────────────────────────────────
level_history = []   # stores (timestamp, level) tuples

def get_level_n_minutes_ago(n):
    """Return water level from n minutes ago using history buffer"""
    if len(level_history) <= n:
        return level_history[0][1] if level_history else None
    return level_history[-n][1]

# ─────────────────────────────────────────────
# SEND READING TO BACKEND
# ─────────────────────────────────────────────
def send_to_backend(payload):
    try:
        response = requests.post(
            API_URL,
            json=payload,
            timeout=3
        )
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        return False
    except Exception:
        return False

# ─────────────────────────────────────────────
# PRINT LIVE READING TO TERMINAL
# ─────────────────────────────────────────────
def print_reading(reading, status, at, rr_short, rr_long, acc, sent_ok):
    colour  = status_colour(status)
    ts      = reading['timestamp']
    wl      = reading['water_level_pct']
    rf      = reading['rainfall_mm_hr']
    infl    = reading['inflow_m3s']
    dl      = reading['downstream_lvl_pct']
    note    = reading['phase_note']
    api_tag = f"{GREEN}[API ✓]{RESET}" if sent_ok else f"{RED}[API ✗]{RESET}"

    print(
        f"{GREY}{ts}{RESET} | "
        f"WL:{BOLD}{wl:5.1f}%{RESET} | "
        f"AT:{CYAN}{at:4.1f}%{RESET} | "
        f"RR↑{rr_short:+.2f} | "
        f"ACC:{acc:+.2f} | "
        f"RF:{rf:5.1f}mm | "
        f"IF:{infl:6.1f}m³/s | "
        f"DL:{dl:4.1f}% | "
        f"{colour}{BOLD}[{status:6s}]{RESET} | "
        f"{api_tag} | "
        f"{GREY}{note}{RESET}"
    )

# ─────────────────────────────────────────────
# MAIN SIMULATOR LOOP
# ─────────────────────────────────────────────
def run_simulator(scenario_num, speed):
    file_path = SCENARIO_FILES.get(str(scenario_num))
    if not file_path or not Path(file_path).exists():
        print(f"{RED}Error: CSV file not found for scenario {scenario_num}{RESET}")
        print("Run generate_scenarios.py first.")
        return

    interval = 1.0 / speed  # seconds between readings

    print(f"\n{'='*80}")
    print(f"{BOLD}  DAM EARLY WARNING SYSTEM — LIVE SIMULATOR{RESET}")
    print(f"  Scenario: {scenario_num}  |  Speed: {speed}×  |  Target: {API_URL}")
    print(f"  Press Ctrl+C to stop")
    print(f"{'='*80}")
    print(
        f"\n  {'TIMESTAMP':<20} {'WL':>6} {'AT':>6} "
        f"{'RR':>8} {'ACC':>7} {'RF':>8} {'INFLOW':>10} "
        f"{'DL':>6}   STATUS\n"
    )

    with open(file_path, newline='') as f:
        reader = list(csv.DictReader(f))

    total   = len(reader)
    prev_rr = 0.0

    try:
        for i, row in enumerate(reader):
            reading = {
                'timestamp'         : row['timestamp'],
                'water_level_pct'   : float(row['water_level_pct']),
                'rainfall_mm_hr'    : float(row['rainfall_mm_hr']),
                'inflow_m3s'        : float(row['inflow_m3s']),
                'downstream_lvl_pct': float(row['downstream_lvl_pct']),
                'phase_note'        : row['phase_note'],
            }

            level = reading['water_level_pct']

            # Update history
            level_history.append((reading['timestamp'], level))
            if len(level_history) > 200:
                level_history.pop(0)

            # Calculate rise rates
            l_15    = get_level_n_minutes_ago(15)
            l_60    = get_level_n_minutes_ago(60)
            rr_short = (level - l_15) * 4 if l_15 is not None else 0.0
            rr_long  = (level - l_60)      if l_60 is not None else 0.0
            acc      = rr_long - prev_rr
            prev_rr  = rr_long

            # Algorithm calculations
            rr_band             = compute_rr_band(rr_short, rr_long, acc)
            rr_adj, rf_adj, if_adj, dl_adj = compute_adjustments(
                rr_band,
                reading['rainfall_mm_hr'],
                reading['inflow_m3s'],
                reading['downstream_lvl_pct']
            )
            at     = compute_adaptive_threshold(rr_adj, rf_adj, if_adj, dl_adj)
            status = compute_status(level, at, rr_band, reading['downstream_lvl_pct'])

            # Build payload for backend
            payload = {
                **reading,
                'rr_short'         : round(rr_short, 3),
                'rr_long'          : round(rr_long, 3),
                'acceleration'     : round(acc, 3),
                'rr_band'          : rr_band,
                'rr_adj'           : rr_adj,
                'rf_adj'           : rf_adj,
                'if_adj'           : if_adj,
                'dl_adj'           : dl_adj,
                'adaptive_threshold': round(at, 2),
                'status'           : status,
                'reading_index'    : i + 1,
                'total_readings'   : total,
            }

            # Send to backend
            sent_ok = send_to_backend(payload)

            # Print to terminal
            print_reading(reading, status, at, rr_short, rr_long, acc, sent_ok)

            # Wait for next interval
            time.sleep(interval)

    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}Simulator stopped by user.{RESET}\n")


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Dam Early Warning System — Live Simulator"
    )
    parser.add_argument(
        "--scenario", "-s",
        type=int,
        choices=[1, 2, 3],
        default=2,
        help="Scenario to run: 1=Normal, 2=Heavy Rain, 3=Catastrophic (default: 2)"
    )
    parser.add_argument(
        "--speed", "-x",
        type=float,
        default=1.0,
        help="Replay speed multiplier. 1=realtime, 10=fast demo (default: 1)"
    )
    args = parser.parse_args()
    run_simulator(args.scenario, args.speed)