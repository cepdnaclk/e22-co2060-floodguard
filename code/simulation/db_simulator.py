"""
Dam Flood Early Warning System
Direct-to-Database Simulation Engine
Replaces the old CSV-based generation and HTTP simulator.
Generates realistic simulated sensor data and inserts it directly to AWS RDS PostgreSQL.
"""

import psycopg2
import time
import math
import random
import os
import argparse
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables from project root
# Using path relative to this script: __file__ is in code/simulation/
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
dotenv_path = os.path.join(project_root, ".env")
load_dotenv(dotenv_path=dotenv_path)

# Database Configuration
DB_HOST = 'floodmanagement.czk28osu0tg7.ap-southeast-2.rds.amazonaws.com'
DB_PORT = 5432
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
CERT_PATH = os.path.join(project_root, "global-bundle.pem")

# ─────────────────────────────────────────────
# CONSTANTS & HELPER FUNCTIONS FOR SIMULATION
# ─────────────────────────────────────────────
IF_BASELINE = 120.0

def noise(value, scale=0.3):
    """Add small realistic noise to a signal."""
    return round(value + random.gauss(0, scale), 2)

def clamp(value, min_val, max_val):
    return max(min_val, min(max_val, value))

def smooth_transition(start, end, steps):
    """Generate smooth curve from start to end over N steps using sine easing."""
    result = []
    for i in range(steps):
        t = i / steps
        eased = (1 - math.cos(t * math.pi)) / 2
        result.append(start + (end - start) * eased)
    return result

# ─────────────────────────────────────────────
# DATABASE FUNCTIONS
# ─────────────────────────────────────────────
def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            sslmode='verify-full',
            sslrootcert=CERT_PATH
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def insert_reading(conn, reading):
    """Inserts a single simulated reading into the PostgreSQL database."""
    query = """
        INSERT INTO sensor_readings 
        (timestamp, water_level_pct, rainfall_mm_hr, inflow_m3s, downstream_lvl_pct, source) 
        VALUES (%s, %s, %s, %s, %s, %s)
    """
    try:
        with conn.cursor() as cur:
            cur.execute(query, (
                reading['timestamp'],
                reading['water_level_pct'],
                reading['rainfall_mm_hr'],
                reading['inflow_m3s'],
                reading['downstream_lvl_pct'],
                'simulator'
            ))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error inserting reading: {e}")
        conn.rollback()
        return False

# ─────────────────────────────────────────────
# SCENARIO DEFINITION
# ─────────────────────────────────────────────
def build_scenario():
    """Defines a continuous simulated scenario with different phases."""
    # This scenario represents a storm system passing over
    return [
        {'duration_minutes': 30, 'wl_s': 40.0, 'wl_e': 42.0, 'rf': 3.0, 'inflow_mult': 1.0, 'dl': 35.0, 'note': 'Calm baseline'},
        {'duration_minutes': 60, 'wl_s': 42.0, 'wl_e': 50.0, 'rf': 25.0, 'inflow_mult': 1.5, 'dl': 38.0, 'note': 'Rain building'},
        {'duration_minutes': 90, 'wl_s': 50.0, 'wl_e': 65.0, 'rf': 45.0, 'inflow_mult': 2.5, 'dl': 45.0, 'note': 'Heavy rain surge'},
        {'duration_minutes': 120, 'wl_s': 65.0, 'wl_e': 55.0, 'rf': 20.0, 'inflow_mult': 1.8, 'dl': 50.0, 'note': 'Rain easing, controlled release'},
        {'duration_minutes': 120, 'wl_s': 55.0, 'wl_e': 42.0, 'rf': 5.0, 'inflow_mult': 1.1, 'dl': 40.0, 'note': 'Recovery'},
    ]

# ─────────────────────────────────────────────
# MAIN LOOP
# ─────────────────────────────────────────────
def run_simulation(live=True, speed_multiplier=1.0):
    phases = build_scenario()
    
    conn = get_db_connection()
    if not conn:
        print("Failed to start simulator. Database unreachable.")
        return

    print("\n=============================================")
    print("  FLOODGUARD: DATABASE SIMULATOR STARTED  ")
    print("=============================================\n")
    
    if live:
        print(f"Mode: LIVE (speed {speed_multiplier}x)")
    else:
        print("Mode: BATCH (Populating historical data instantly)")

    print(f"Target DB: {DB_NAME} at {DB_HOST}\n")

    current_time = datetime.now()
    
    # Setup initial values for smooth transitions
    prev_rf = phases[0]['rf']
    prev_inflow = phases[0]['inflow_mult'] * IF_BASELINE
    prev_dl = phases[0]['dl']
    
    total_inserted = 0

    try:
        while True: # Loop scenarios endlessly if live
            for phase in phases:
                duration = phase['duration_minutes']
                
                # Pre-calculate smooth transitions for this phase
                wl_vals = smooth_transition(phase['wl_s'], phase['wl_e'], duration)
                rf_vals = smooth_transition(prev_rf, phase['rf'], duration)
                if_vals = smooth_transition(prev_inflow, phase['inflow_mult'] * IF_BASELINE, duration)
                dl_vals = smooth_transition(prev_dl, phase['dl'], duration)
                
                for i in range(duration):
                    reading = {
                        'timestamp': current_time,
                        'water_level_pct': round(clamp(noise(wl_vals[i], 0.05), 0, 100), 2),
                        'rainfall_mm_hr': round(clamp(noise(rf_vals[i], 0.5), 0, 200), 2),
                        'inflow_m3s': round(clamp(noise(if_vals[i], 2.0), 0, 5000), 2),
                        'downstream_lvl_pct': round(clamp(noise(dl_vals[i], 0.3), 0, 100), 2)
                    }

                    success = insert_reading(conn, reading)
                    if success:
                        total_inserted += 1
                        
                        if live:
                            print(f"[{reading['timestamp'].strftime('%H:%M:%S')}] Inserted -> WL: {reading['water_level_pct']}% | RF: {reading['rainfall_mm_hr']}mm/h | IF: {reading['inflow_m3s']}m³/s | Phase: {phase['note']}")
                            time.sleep(60.0 / speed_multiplier) # Simulate real-time by sleeping (60 seconds = 1 minute simulation time)
                    
                    current_time += timedelta(minutes=1)
                
                # carry forward for smooth transition to next phase
                prev_rf = phase['rf']
                prev_inflow = phase['inflow_mult'] * IF_BASELINE
                prev_dl = phase['dl']
            
            if not live:
                print(f"Batch population complete. Inserted {total_inserted} records.")
                break # Exit after one loop if in batch mode
                
    except KeyboardInterrupt:
        print("\n\nSimulator stopped manually.")
    finally:
        if conn:
            conn.close()
            print("Database connection closed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FloodGuard Database Simulator")
    parser.add_argument("--batch", action="store_true", help="Run instantly to generate historical data")
    parser.add_argument("--speed", type=float, default=1.0, help="Speed multiplier for live mode (e.g. 60 = 1 simulated minute per real second)")
    args = parser.parse_args()

    run_simulation(live=not args.batch, speed_multiplier=args.speed)
