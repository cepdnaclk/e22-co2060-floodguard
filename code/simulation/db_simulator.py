"""
FloodGuard SCADA Weather Simulation Center
Tkinter Graphical Interface for generating and inserting simulated sensor readings.
Supports 5 Sri Lankan monsoon and weather scenarios.
"""

import tkinter as tk
from tkinter import ttk, messagebox
import psycopg2
import psycopg2.extras
import os
import sys
import math
import random
import time
import threading
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Path resolution for loading .env
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", ".."))
dotenv_path = os.path.join(project_root, ".env")
load_dotenv(dotenv_path=dotenv_path)

DB_HOST = os.getenv("DB_HOST", "localhost")
try:
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
except ValueError:
    DB_PORT = 5432
DB_NAME = os.getenv("DB_NAME", "mydb")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

class WeatherSimulatorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("FloodGuard SCADA Simulator")
        self.root.geometry("620x540")
        self.root.configure(bg="#0B0F12")
        self.root.resizable(False, False)

        self.running = False
        self.sim_thread = None
        self.dam_id = None
        self.station_ids = []
        self.sim_time = None
        self.step_counter = 0
        self.active_scenario = None

        # Style configurations
        self.style = ttk.Style()
        self.style.theme_use('clam')
        self.style.configure('TProgressbar', thickness=15, troughcolor='#141B20', background='#3BD6E8')

        # Configure dark-theme colors
        self.bg_primary = "#0B0F12"
        self.bg_secondary = "#141B20"
        self.border_color = "#2A363C"
        self.text_primary = "#E8F1F2"
        self.text_muted = "#8FA3AD"
        self.accent_cyan = "#3BD6E8"
        self.accent_red = "#FF3B3B"
        self.accent_green = "#36D399"

        self.create_widgets()
        self.check_database_link()

    def create_widgets(self):
        # 1. HEADER TITLE
        header_frame = tk.Frame(self.root, bg=self.bg_primary, pady=10)
        header_frame.pack(fill=tk.X)
        title_label = tk.Label(
            header_frame, 
            text="FLOODGUARD WEATHER SIMULATOR", 
            font=("Courier New", 16, "bold"), 
            bg=self.bg_primary, 
            fg=self.accent_cyan
        )
        title_label.pack()

        # 2. STATUS FRAME
        status_frame = tk.LabelFrame(
            self.root, 
            text=" DATABASE CONNECTION STATUS ", 
            font=("Courier New", 8, "bold"),
            bg=self.bg_secondary, 
            fg=self.text_muted,
            bd=1,
            relief=tk.SOLID,
            padx=10,
            pady=10
        )
        status_frame.pack(fill=tk.X, padx=15, pady=5)

        self.db_status_label = tk.Label(
            status_frame, 
            text="Checking server links...", 
            font=("Arial", 9, "bold"),
            bg=self.bg_secondary, 
            fg=self.text_muted
        )
        self.db_status_label.pack(anchor=tk.W)

        # 3. SCENARIOS FRAME
        scenarios_frame = tk.LabelFrame(
            self.root, 
            text=" SELECT SIMULATION SCENARIO ", 
            font=("Courier New", 8, "bold"),
            bg=self.bg_secondary, 
            fg=self.text_muted,
            bd=1,
            relief=tk.SOLID,
            padx=10,
            pady=10
        )
        scenarios_frame.pack(fill=tk.X, padx=15, pady=10)

        # Describe monsoons & scenarios
        self.scenarios = [
            ("Drought / Dry Season (Normal Safe State)", "drought"),
            ("South-West Monsoon (Steady Rain & Moderate Rise)", "sw_monsoon"),
            ("North-East Monsoon Storm (Torrential Spill & RED)", "ne_monsoon"),
            ("Inter-Monsoon Thunderstorm (Sharp Spikes & Flash Flood)", "thunderstorm"),
            ("Tropical Cyclone Surge (Torrential Rain & Downstream Constraints)", "cyclone")
        ]

        for idx, (label, mode) in enumerate(self.scenarios):
            btn = tk.Button(
                scenarios_frame,
                text=label,
                font=("Arial", 9, "bold"),
                bg="#192227",
                fg=self.text_primary,
                activebackground=self.accent_cyan,
                activeforeground="#000",
                bd=1,
                relief=tk.SOLID,
                padx=5,
                pady=5,
                command=lambda m=mode: self.start_scenario(m)
            )
            btn.pack(fill=tk.X, pady=3)

        # 4. MONITORING FRAME
        self.monitor_frame = tk.LabelFrame(
            self.root, 
            text=" REAL-TIME SIMULATION ENGINE ", 
            font=("Courier New", 8, "bold"),
            bg=self.bg_secondary, 
            fg=self.text_muted,
            bd=1,
            relief=tk.SOLID,
            padx=10,
            pady=10
        )
        self.monitor_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=5)

        self.progress_bar = ttk.Progressbar(self.monitor_frame, mode='determinate')
        self.progress_bar.pack(fill=tk.X, pady=5)
        self.progress_bar.pack_forget() # hide initially

        self.console_label = tk.Label(
            self.monitor_frame,
            text="System Idle. Choose a weather scenario to flood database.",
            font=("Courier New", 9),
            bg=self.bg_secondary,
            fg=self.accent_cyan,
            justify=tk.LEFT,
            anchor=tk.W,
            wraplength=550
        )
        self.console_label.pack(fill=tk.BOTH, expand=True)

        # 5. CONTROL BUTTONS
        control_frame = tk.Frame(self.root, bg=self.bg_primary, pady=10)
        control_frame.pack(fill=tk.X)

        self.stop_btn = tk.Button(
            control_frame,
            text="STOP SIMULATION",
            font=("Arial", 9, "bold"),
            bg=self.accent_red,
            fg="#fff",
            bd=0,
            padx=15,
            pady=8,
            state=tk.DISABLED,
            command=self.stop_simulation
        )
        self.stop_btn.pack(side=tk.LEFT, padx=20)

        close_btn = tk.Button(
            control_frame,
            text="EXIT",
            font=("Arial", 9, "bold"),
            bg="#323b40",
            fg=self.text_primary,
            bd=0,
            padx=15,
            pady=8,
            command=self.root.destroy
        )
        close_btn.pack(side=tk.RIGHT, padx=20)

    def check_database_link(self):
        try:
            conn = self.get_db_connection()
            self.db_status_label.config(
                text=f"CONNECTED: {DB_NAME} at {DB_HOST}:{DB_PORT} (SSL: off)",
                fg=self.accent_green
            )
            conn.close()
        except Exception as e:
            self.db_status_label.config(
                text=f"DISCONNECTED: Unable to establish server link. Verify .env file. Error: {e}",
                fg=self.accent_red
            )

    def get_db_connection(self):
        return psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )

    def seed_database_structure(self, conn):
        """Seed Victoria Dam and meteorology locations if database is empty."""
        with conn.cursor() as cur:
            # 1. Check/Insert Victoria Dam
            cur.execute("SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'")
            row = cur.fetchone()
            if row:
                self.dam_id = row[0]
            else:
                cur.execute("""
                    INSERT INTO dams (dam_name, location, latitude, longitude, elevation_m, 
                                     reservoir_capacity, downstream_capacity, max_gate_capacity, 
                                     if_baseline, base_threshold, threshold_floor)
                    VALUES ('Victoria Dam', 'Mahaweli River, Teldeniya', 7.2345, 80.7890, 438.0, 
                            730000000.0, 5800.0, 8000.0, 150.0, 75.0, 30.0)
                    RETURNING dam_id;
                """)
                self.dam_id = cur.fetchone()[0]
                
            # 2. Check/Insert Engineer profile (admin check)
            cur.execute("SELECT engineer_id FROM engineers WHERE name = 'sujee'")
            if not cur.fetchone():
                # Password hash for 'password'
                cur.execute("""
                    INSERT INTO engineers (name, role, contact, assigned_dam_id, password_hash)
                    VALUES ('sujee', 'Senior Control Operator', '+94 77 123 4567', %s, 
                            '$2a$10$wO082nFv9FmZ9xRUp/Y.nugLdZtDkgK/xJ/y.oZp68s.7gQpX21iW');
                """, (self.dam_id,))

            # 3. Check/Insert Rainfall locations (3 stations: Teldeniya, Kandy, Randenigala)
            self.station_ids = []
            stations_to_seed = [
                ('Teldeniya Station', 7.240, 80.795, 0.40, 30.0, 'MET-TEL-01'),
                ('Kandy Station', 7.290, 80.635, 0.30, 60.0, 'MET-KAN-02'),
                ('Randenigala Station', 7.201, 80.820, 0.30, 15.0, 'MET-RAN-03')
            ]
            for s_name, lat, lon, w, delay, code in stations_to_seed:
                cur.execute("SELECT location_id FROM rainfall_locations WHERE station_code = %s", (code,))
                r = cur.fetchone()
                if r:
                    self.station_ids.append(r[0])
                else:
                    cur.execute("""
                        INSERT INTO rainfall_locations (location_name, latitude, longitude, weight, delay_minutes, station_code, nearest_dam_id)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        RETURNING location_id;
                    """, (s_name, lat, lon, w, delay, code, self.dam_id))
                    self.station_ids.append(cur.fetchone()[0])
        conn.commit()

    def clear_historical_readings(self, conn):
        """Wipe previous telemetry records for this dam to avoid range overlapping."""
        with conn.cursor() as cur:
            cur.execute("DELETE FROM alerts_log WHERE dam_id = %s;", (self.dam_id,))
            cur.execute("DELETE FROM deescalation_tracking WHERE dam_id = %s;", (self.dam_id,))
            cur.execute("DELETE FROM release_recommendations WHERE dam_id = %s;", (self.dam_id,))
            cur.execute("DELETE FROM risk_status WHERE dam_id = %s;", (self.dam_id,))
            cur.execute("DELETE FROM threshold_calculations WHERE dam_id = %s;", (self.dam_id,))
            cur.execute("DELETE FROM calculated_metrics WHERE dam_id = %s;", (self.dam_id,))
            cur.execute("DELETE FROM water_level_readings WHERE dam_id = %s;", (self.dam_id,))
            cur.execute("DELETE FROM inflow_readings WHERE dam_id = %s;", (self.dam_id,))
            cur.execute("DELETE FROM downstream_level_readings WHERE dam_id = %s;", (self.dam_id,))
            
            for loc_id in self.station_ids:
                cur.execute("DELETE FROM rainfall_readings WHERE location_id = %s;", (loc_id,))
        conn.commit()

    def generate_weather_pattern(self, mode, t_mins):
        """Mathematical models defining the weather pattern curves over time."""
        noise = random.gauss(0, 0.2)
        
        if mode == "drought":
            # Dry spell: No rain, declining inflow, water level dropping
            r_vals = [0.0 + max(0.0, random.gauss(0, 0.02)) for _ in self.station_ids]
            inflow = max(20.0, 80.0 - (t_mins / 360.0) * 55.0 + noise * 2)
            level = max(42.0, 52.0 - (t_mins / 360.0) * 8.0 + random.uniform(-0.02, 0.02))
            downstream = 12.0 + noise * 0.2
            
        elif mode == "sw_monsoon":
            # South-West Monsoon: Steady light-to-moderate rain, rising levels
            r_vals = [max(0.0, 6.0 + 8.0 * math.sin(t_mins / 100.0) + random.uniform(-0.5, 0.5)) for _ in self.station_ids]
            inflow = 120.0 + 350.0 * (1.0 - math.exp(-t_mins / 180.0)) + noise * 5
            level = 68.0 + 13.5 * (1.0 - math.exp(-t_mins / 240.0)) + random.uniform(-0.05, 0.05)
            downstream = 18.0 + 15.0 * (1.0 - math.exp(-t_mins / 180.0)) + noise * 1.5
            
        elif mode == "ne_monsoon":
            # North-East Monsoon Storm: Torrential rain peaking around 3 hours, rapid rise
            # Rainfall storm peaks at t = 180m
            rain_peak = 10.0 + 60.0 * math.exp(-((t_mins - 180.0) / 90.0) ** 2)
            r_vals = [max(0.0, rain_peak + random.uniform(-3, 3)) for _ in self.station_ids]
            # Inflow peaks at t = 240m
            inflow = 150.0 + 1750.0 * math.exp(-((t_mins - 240.0) / 120.0) ** 2) + noise * 15
            level = 74.0 + 20.0 * (1.0 - math.exp(-t_mins / 200.0)) + random.uniform(-0.05, 0.05)
            downstream = 20.0 + 40.0 * (1.0 - math.exp(-t_mins / 180.0)) + noise * 2
            
        elif mode == "thunderstorm":
            # Severe convective thunderstorm: sudden intense flash flood
            # Rainfall peaks at t = 150m
            rain_peak = 90.0 * math.exp(-((t_mins - 150.0) / 25.0) ** 2)
            r_vals = [max(0.0, rain_peak + random.uniform(-4, 4)) for _ in self.station_ids]
            # Inflow peaks at t = 170m
            inflow = 100.0 + 2400.0 * math.exp(-((t_mins - 170.0) / 35.0) ** 2) + noise * 20
            level = 72.0 + 17.5 * (1.0 - math.exp(-t_mins / 120.0)) + random.uniform(-0.08, 0.08)
            downstream = 15.0 + 42.0 * (1.0 - math.exp(-t_mins / 150.0)) + noise * 3
            
        elif mode == "cyclone":
            # Cyclone Surge: Persistent intense torrential rains, downstream channel flooding
            # Rainfall stays constantly high
            r_vals = [max(10.0, 42.0 + 10.0 * math.sin(t_mins / 50.0) + random.uniform(-2, 2)) for _ in self.station_ids]
            inflow = 1380.0 + 180.0 * math.sin(t_mins / 80.0) + noise * 15
            level = min(94.0, 60.0 + 0.06 * t_mins + random.uniform(-0.03, 0.03))
            downstream = min(84.0, 50.0 + 30.0 * (1.0 - math.exp(-t_mins / 150.0)) + noise * 2)
            
        else:
            r_vals = [0.0 for _ in self.station_ids]
            inflow = 150.0
            level = 50.0
            downstream = 20.0
            
        return [round(r, 2) for r in r_vals], round(inflow, 2), round(level, 2), round(downstream, 2)

    def start_scenario(self, mode):
        if self.running:
            self.stop_simulation()
            
        self.running = True
        self.active_scenario = mode
        self.stop_btn.config(state=tk.NORMAL)
        self.progress_bar.pack(fill=tk.X, pady=8)
        self.progress_bar['value'] = 0
        
        self.console_label.config(
            text=f"Initiating scenario [{mode.upper()}]...\nEstablishing database transactions...",
            fg="#FF9F1C"
        )
        
        # Start background simulator thread
        self.sim_thread = threading.Thread(target=self.run_simulation_thread, args=(mode,), daemon=True)
        self.sim_thread.start()

    def run_simulation_thread(self, mode):
        conn = None
        try:
            conn = self.get_db_connection()
            self.seed_database_structure(conn)
            
            # Step 1: Clear old tables to prepare for clean run
            self.update_console("Wiping previous telemetry records for Dam #1...")
            self.clear_historical_readings(conn)
            
            # Step 2: Flood 6 Hours of Historical Readings Instantly (360 points)
            self.update_console("Flooding 6 Hours (360 points) of Historical sensor logs...")
            
            start_time = datetime.now() - timedelta(hours=6)
            self.sim_time = start_time
            self.step_counter = 0
            
            # Generate all historical values in memory for bulk insert
            water_level_rows = []
            inflow_rows = []
            downstream_rows = []
            rainfall_rows = []
            
            for t_step in range(360):
                self.sim_time = start_time + timedelta(minutes=t_step)
                r_vals, inflow, level, downstream = self.generate_weather_pattern(mode, t_step)
                
                t_str = self.sim_time.strftime('%Y-%m-%d %H:%M:%S%z')
                
                water_level_rows.append((self.dam_id, self.sim_time, level))
                inflow_rows.append((self.dam_id, self.sim_time, inflow))
                downstream_rows.append((self.dam_id, self.sim_time, downstream))
                
                for idx, r_val in enumerate(r_vals):
                    rainfall_rows.append((self.station_ids[idx], self.sim_time, r_val))
                    
                if t_step % 20 == 0:
                    self.root.after(0, self.update_progress, int((t_step / 360.0) * 100))
            
            # Perform bulk inserts
            with conn.cursor() as cur:
                psycopg2.extras.execute_values(
                    cur, 
                    "INSERT INTO water_level_readings (dam_id, reading_time, water_level_pct) VALUES %s ON CONFLICT DO NOTHING",
                    water_level_rows
                )
                psycopg2.extras.execute_values(
                    cur, 
                    "INSERT INTO inflow_readings (dam_id, reading_time, inflow_rate_m3s) VALUES %s ON CONFLICT DO NOTHING",
                    inflow_rows
                )
                psycopg2.extras.execute_values(
                    cur, 
                    "INSERT INTO downstream_level_readings (dam_id, reading_time, downstream_level_pct) VALUES %s ON CONFLICT DO NOTHING",
                    downstream_rows
                )
                psycopg2.extras.execute_values(
                    cur, 
                    "INSERT INTO rainfall_readings (location_id, reading_time, rainfall_mm_hr) VALUES %s ON CONFLICT DO NOTHING",
                    rainfall_rows
                )
            conn.commit()
            
            self.root.after(0, self.progress_bar.pack_forget)
            self.update_console(f"Seeded 6H history. Switching to REAL-TIME INGESTION...\n(1 simulated minute per 15.0 seconds)")
            
            # Step 3: Enter Real-Time Loop (Insert 1 new reading every 15 seconds)
            self.step_counter = 360
            while self.running:
                time.sleep(15.0) # simulation speed interval
                
                self.sim_time = start_time + timedelta(minutes=self.step_counter)
                r_vals, inflow, level, downstream = self.generate_weather_pattern(mode, self.step_counter)
                
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO water_level_readings (dam_id, reading_time, water_level_pct) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                        (self.dam_id, self.sim_time, level)
                    )
                    cur.execute(
                        "INSERT INTO inflow_readings (dam_id, reading_time, inflow_rate_m3s) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                        (self.dam_id, self.sim_time, inflow)
                    )
                    cur.execute(
                        "INSERT INTO downstream_level_readings (dam_id, reading_time, downstream_level_pct) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                        (self.dam_id, self.sim_time, downstream)
                    )
                    for idx, r_val in enumerate(r_vals):
                        cur.execute(
                            "INSERT INTO rainfall_readings (location_id, reading_time, rainfall_mm_hr) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                            (self.station_ids[idx], self.sim_time, r_val)
                        )
                conn.commit()
                
                # Format console log
                log_txt = (
                    f"[{self.sim_time.strftime('%H:%M:%S')}] Ingested Reading (Step {self.step_counter}):\n"
                    f" - Water Level: {level}% L\n"
                    f" - Inflow Rate: {inflow} m³/s\n"
                    f" - Downstream : {downstream}%\n"
                    f" - Station Rainfalls: {', '.join([str(r) + 'mm/h' for r in r_vals])}"
                )
                self.update_console(log_txt, fg=self.accent_green)
                self.step_counter += 1
                
        except Exception as e:
            self.update_console(f"Simulation engine error: {e}", fg=self.accent_red)
            self.running = False
        finally:
            if conn:
                conn.close()
            self.root.after(0, lambda: self.stop_btn.config(state=tk.DISABLED))

    def update_console(self, text, fg=None):
        if not fg:
            fg = self.accent_cyan
        self.root.after(0, lambda: self.console_label.config(text=text, fg=fg))

    def update_progress(self, val):
        self.progress_bar['value'] = val

    def stop_simulation(self):
        self.running = False
        self.active_scenario = None
        self.progress_bar.pack_forget()
        self.update_console("Simulation terminated. Core idle.", fg=self.text_muted)
        self.stop_btn.config(state=tk.DISABLED)

if __name__ == "__main__":
    root = tk.Tk()
    app = WeatherSimulatorApp(root)
    root.mainloop()
