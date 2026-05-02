"""
Dam Flood Early Warning System
Simulation Data Generator
Generates 3 CSV scenario files for algorithm testing
"""

import csv
import random
import math
from datetime import datetime, timedelta
from pathlib import Path

# ─────────────────────────────────────────────
# OUTPUT DIRECTORY
# ─────────────────────────────────────────────
Path("output").mkdir(exist_ok=True)

# ─────────────────────────────────────────────
# CONSTANTS (matching your algorithm exactly)
# ─────────────────────────────────────────────
BASE_THRESHOLD    = 75.0   # normal safe operating level (%)
FLOOR_THRESHOLD   = 30.0   # algorithm floor rule
INTERVAL_MINUTES  = 1      # reading every 1 minute
IF_BASELINE       = 120.0  # normal inflow m³/s (simulated baseline)

# ─────────────────────────────────────────────
# HELPER: add small realistic noise
# ─────────────────────────────────────────────
def noise(value, scale=0.3):
    return round(value + random.gauss(0, scale), 2)

def clamp(value, min_val, max_val):
    return max(min_val, min(max_val, value))

# ─────────────────────────────────────────────
# CORE: smooth transition between values
# simulates how real physical systems change
# gradually, not in sudden jumps
# ─────────────────────────────────────────────
def smooth_transition(start, end, steps):
    """Generate smooth curve from start to end over N steps using sine easing"""
    result = []
    for i in range(steps):
        t = i / steps
        # ease in-out using sine curve — more realistic than linear
        eased = (1 - math.cos(t * math.pi)) / 2
        result.append(start + (end - start) * eased)
    return result

# ─────────────────────────────────────────────
# CORE: generate one complete scenario
# Each scenario is a sequence of PHASES
# Each phase defines target values and duration
# ─────────────────────────────────────────────
def generate_scenario(scenario_name, phases, start_time):
    """
    phases = list of dicts:
    {
        'duration_minutes': int,
        'water_level_start': float,
        'water_level_end': float,
        'rainfall': float,          # mm/hr
        'inflow_multiplier': float, # × IF_BASELINE
        'downstream_level': float,  # %
        'note': str                 # label for this phase
    }
    """
    rows = []
    current_time = start_time

    prev_rainfall    = phases[0]['rainfall']
    prev_inflow_mult = phases[0]['inflow_multiplier']
    prev_downstream  = phases[0]['downstream_level']

    for phase in phases:
        duration    = phase['duration_minutes']
        wl_start    = phase['water_level_start']
        wl_end      = phase['water_level_end']
        rf_target   = phase['rainfall']
        if_target   = phase['inflow_multiplier'] * IF_BASELINE
        dl_target   = phase['downstream_level']
        note        = phase.get('note', '')

        # smooth water level curve over this phase
        wl_values   = smooth_transition(wl_start, wl_end, duration)

        # smooth other variables
        rf_values   = smooth_transition(prev_rainfall, rf_target, duration)
        if_values   = smooth_transition(
                          prev_inflow_mult * IF_BASELINE, if_target, duration)
        dl_values   = smooth_transition(prev_downstream, dl_target, duration)

        for i in range(duration):
            row = {
                'timestamp'         : current_time.strftime('%Y-%m-%d %H:%M:%S'),
                'water_level_pct'   : round(clamp(noise(wl_values[i], 0.05), 0, 100), 2),
                'rainfall_mm_hr'    : round(clamp(noise(rf_values[i], 0.5), 0, 200), 2),
                'inflow_m3s'        : round(clamp(noise(if_values[i], 2.0), 0, 5000), 2),
                'downstream_lvl_pct': round(clamp(noise(dl_values[i], 0.3), 0, 100), 2),
                'phase_note'        : note,
                'scenario'          : scenario_name
            }
            rows.append(row)
            current_time += timedelta(minutes=INTERVAL_MINUTES)

        # carry forward for next phase transition
        prev_rainfall    = rf_target
        prev_inflow_mult = phase['inflow_multiplier']
        prev_downstream  = dl_target

    return rows, current_time


# ─────────────────────────────────────────────
# SCENARIO 1 — NORMAL RAIN EVENT
# Expected result: GREEN → YELLOW → GREEN
# Duration: ~12 hours (720 readings)
# ─────────────────────────────────────────────
def build_scenario_1(start_time):
    phases = [
        {
            'duration_minutes'  : 120,
            'water_level_start' : 35.0,
            'water_level_end'   : 37.0,
            'rainfall'          : 2.0,
            'inflow_multiplier' : 0.9,
            'downstream_level'  : 30.0,
            'note'              : 'S1-Normal baseline'
        },
        {
            'duration_minutes'  : 60,
            'water_level_start' : 37.0,
            'water_level_end'   : 41.0,
            'rainfall'          : 12.0,
            'inflow_multiplier' : 1.2,
            'downstream_level'  : 32.0,
            'note'              : 'S1-Light rain begins'
        },
        {
            'duration_minutes'  : 90,
            'water_level_start' : 41.0,
            'water_level_end'   : 49.0,
            'rainfall'          : 20.0,
            'inflow_multiplier' : 1.4,
            'downstream_level'  : 35.0,
            'note'              : 'S1-Moderate rain peak [YELLOW expected]'
        },
        {
            'duration_minutes'  : 90,
            'water_level_start' : 49.0,
            'water_level_end'   : 46.0,
            'rainfall'          : 10.0,
            'inflow_multiplier' : 1.1,
            'downstream_level'  : 34.0,
            'note'              : 'S1-Rain easing'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 46.0,
            'water_level_end'   : 40.0,
            'rainfall'          : 2.0,
            'inflow_multiplier' : 0.9,
            'downstream_level'  : 31.0,
            'note'              : 'S1-Recovery [GREEN expected]'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 40.0,
            'water_level_end'   : 38.0,
            'rainfall'          : 1.0,
            'inflow_multiplier' : 0.85,
            'downstream_level'  : 30.0,
            'note'              : 'S1-Full return to normal'
        },
    ]
    return generate_scenario('Scenario_1_Normal_Rain', phases, start_time)


# ─────────────────────────────────────────────
# SCENARIO 2 — HEAVY RAIN EVENT
# Expected result: GREEN → YELLOW → ORANGE → release → recovery
# Duration: ~18 hours (1080 readings)
# ─────────────────────────────────────────────
def build_scenario_2(start_time):
    phases = [
        {
            'duration_minutes'  : 120,
            'water_level_start' : 40.0,
            'water_level_end'   : 42.0,
            'rainfall'          : 3.0,
            'inflow_multiplier' : 1.0,
            'downstream_level'  : 35.0,
            'note'              : 'S2-Calm baseline'
        },
        {
            'duration_minutes'  : 60,
            'water_level_start' : 42.0,
            'water_level_end'   : 46.0,
            'rainfall'          : 18.0,
            'inflow_multiplier' : 1.3,
            'downstream_level'  : 37.0,
            'note'              : 'S2-Rain building [YELLOW expected]'
        },
        {
            'duration_minutes'  : 90,
            'water_level_start' : 46.0,
            'water_level_end'   : 56.0,
            'rainfall'          : 38.0,
            'inflow_multiplier' : 2.2,
            'downstream_level'  : 42.0,
            'note'              : 'S2-Heavy rain inflow surge [ORANGE expected]'
        },
        {
            'duration_minutes'  : 60,
            'water_level_start' : 56.0,
            'water_level_end'   : 61.0,
            'rainfall'          : 45.0,
            'inflow_multiplier' : 2.8,
            'downstream_level'  : 48.0,
            'note'              : 'S2-Approaching adaptive threshold'
        },
        {
            # controlled release begins — level stabilises then drops
            'duration_minutes'  : 120,
            'water_level_start' : 61.0,
            'water_level_end'   : 54.0,
            'rainfall'          : 30.0,
            'inflow_multiplier' : 2.0,
            'downstream_level'  : 52.0,
            'note'              : 'S2-Controlled release active'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 54.0,
            'water_level_end'   : 47.0,
            'rainfall'          : 14.0,
            'inflow_multiplier' : 1.3,
            'downstream_level'  : 48.0,
            'note'              : 'S2-Rain reducing, recovery begins [YELLOW]'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 47.0,
            'water_level_end'   : 41.0,
            'rainfall'          : 4.0,
            'inflow_multiplier' : 1.0,
            'downstream_level'  : 40.0,
            'note'              : 'S2-Full recovery [GREEN]'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 41.0,
            'water_level_end'   : 40.0,
            'rainfall'          : 1.5,
            'inflow_multiplier' : 0.9,
            'downstream_level'  : 36.0,
            'note'              : 'S2-Stable normal'
        },
    ]
    return generate_scenario('Scenario_2_Heavy_Rain', phases, start_time)


# ─────────────────────────────────────────────
# SCENARIO 3 — CATASTROPHIC FLOOD EVENT
# Expected: Rapid RED, downstream conflict, floor rule triggered
# Duration: ~24 hours (1440 readings)
# ─────────────────────────────────────────────
def build_scenario_3(start_time):
    phases = [
        {
            'duration_minutes'  : 120,
            'water_level_start' : 45.0,
            'water_level_end'   : 46.0,
            'rainfall'          : 5.0,
            'inflow_multiplier' : 1.0,
            'downstream_level'  : 40.0,
            'note'              : 'S3-Normal start'
        },
        {
            'duration_minutes'  : 30,
            'water_level_start' : 46.0,
            'water_level_end'   : 49.0,
            'rainfall'          : 25.0,
            'inflow_multiplier' : 1.5,
            'downstream_level'  : 43.0,
            'note'              : 'S3-Rapid rainfall onset [YELLOW]'
        },
        {
            # critical: rainfall spikes extremely fast
            'duration_minutes'  : 30,
            'water_level_start' : 49.0,
            'water_level_end'   : 57.0,
            'rainfall'          : 75.0,
            'inflow_multiplier' : 3.5,
            'downstream_level'  : 50.0,
            'note'              : 'S3-Extreme rainfall spike [ORANGE→RED]'
        },
        {
            # all factors at worst case simultaneously
            # triggers floor rule: adjustments sum > 48%, AT floors at 30%
            'duration_minutes'  : 60,
            'water_level_start' : 57.0,
            'water_level_end'   : 68.0,
            'rainfall'          : 90.0,
            'inflow_multiplier' : 4.5,
            'downstream_level'  : 88.0,
            'note'              : 'S3-CATASTROPHIC all factors max [RED + FLOOR RULE + DOWNSTREAM CONFLICT]'
        },
        {
            'duration_minutes'  : 60,
            'water_level_start' : 68.0,
            'water_level_end'   : 72.0,
            'rainfall'          : 85.0,
            'inflow_multiplier' : 4.2,
            'downstream_level'  : 91.0,
            'note'              : 'S3-Peak danger sustained'
        },
        {
            # emergency release happening — very limited due to downstream
            'duration_minutes'  : 120,
            'water_level_start' : 72.0,
            'water_level_end'   : 67.0,
            'rainfall'          : 60.0,
            'inflow_multiplier' : 3.0,
            'downstream_level'  : 88.0,
            'note'              : 'S3-Emergency limited release active'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 67.0,
            'water_level_end'   : 58.0,
            'rainfall'          : 35.0,
            'inflow_multiplier' : 2.0,
            'downstream_level'  : 80.0,
            'note'              : 'S3-Storm weakening, still dangerous'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 58.0,
            'water_level_end'   : 50.0,
            'rainfall'          : 18.0,
            'inflow_multiplier' : 1.4,
            'downstream_level'  : 68.0,
            'note'              : 'S3-Gradual recovery [ORANGE]'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 50.0,
            'water_level_end'   : 44.0,
            'rainfall'          : 6.0,
            'inflow_multiplier' : 1.0,
            'downstream_level'  : 52.0,
            'note'              : 'S3-Recovery continues [YELLOW→GREEN]'
        },
        {
            'duration_minutes'  : 120,
            'water_level_start' : 44.0,
            'water_level_end'   : 42.0,
            'rainfall'          : 2.0,
            'inflow_multiplier' : 0.9,
            'downstream_level'  : 42.0,
            'note'              : 'S3-Event over, normalising'
        },
    ]
    return generate_scenario('Scenario_3_Catastrophic', phases, start_time)


# ─────────────────────────────────────────────
# WRITE TO CSV
# ─────────────────────────────────────────────
def write_csv(rows, filename):
    fieldnames = [
        'timestamp', 'water_level_pct', 'rainfall_mm_hr',
        'inflow_m3s', 'downstream_lvl_pct', 'phase_note', 'scenario'
    ]
    path = f"output/{filename}"
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  ✓ Written: {path}  ({len(rows)} readings)")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("\n=== Dam Simulation Data Generator ===\n")

    base_time = datetime(2024, 6, 1, 0, 0, 0)

    print("Generating Scenario 1 — Normal Rain Event...")
    rows1, _ = build_scenario_1(base_time)
    write_csv(rows1, "scenario_1_normal_rain.csv")

    print("Generating Scenario 2 — Heavy Rain Event...")
    rows2, _ = build_scenario_2(base_time)
    write_csv(rows2, "scenario_2_heavy_rain.csv")

    print("Generating Scenario 3 — Catastrophic Flood Event...")
    rows3, _ = build_scenario_3(base_time)
    write_csv(rows3, "scenario_3_catastrophic.csv")

    print(f"\nTotal readings generated: {len(rows1) + len(rows2) + len(rows3)}")
    print("\nAll CSV files saved to /output/")
    print("Ready for algorithm testing.\n")