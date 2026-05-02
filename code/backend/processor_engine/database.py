"""
Database interactions for the Processor Engine.
"""

import psycopg2
import psycopg2.extras
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import config
import os
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
load_dotenv(dotenv_path=os.path.join(project_root, ".env"))

DB_HOST = 'floodmanagement.czk28osu0tg7.ap-southeast-2.rds.amazonaws.com'
DB_PORT = 5432
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
CERT_PATH = os.path.join(project_root, "global-bundle.pem")

class DatabaseManager:
    def __init__(self):
        self.conn = None

    def connect(self):
        if not self.conn or self.conn.closed != 0:
            self.conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                sslmode='verify-full',
                sslrootcert=CERT_PATH
            )
            self.conn.autocommit = True
    
    def close(self):
        if self.conn and self.conn.closed == 0:
            self.conn.close()

    def get_latest_unprocessed_reading(self) -> Optional[Dict]:
        self.connect()
        # Find the oldest sensor_reading that doesn't have a match in processed_results
        # (We process in chronological order)
        query = """
            SELECT s.id, s.timestamp, s.water_level_pct as l, s.rainfall_mm_hr as rf, 
                   s.inflow_m3s as if_, s.downstream_lvl_pct as dl
            FROM sensor_readings s
            LEFT JOIN processed_results p ON s.timestamp = p.timestamp
            WHERE p.id IS NULL
            ORDER BY s.timestamp ASC
            LIMIT 1
        """
        with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(query)
            row = cur.fetchone()
            if row:
                return dict(row)
            return None

    def get_historical_l(self, current_timestamp: datetime, minutes_ago: int) -> Optional[float]:
        self.connect()
        target_time = current_timestamp - timedelta(minutes=minutes_ago)
        # Get the closest reading within a 2-minute tolerance
        query = """
            SELECT water_level_pct
            FROM sensor_readings
            WHERE timestamp >= %s AND timestamp <= %s
            ORDER BY ABS(EXTRACT(EPOCH FROM (timestamp - %s))) ASC
            LIMIT 1
        """
        lower_bound = target_time - timedelta(minutes=2)
        upper_bound = target_time + timedelta(minutes=2)
        
        with self.conn.cursor() as cur:
            cur.execute(query, (lower_bound, upper_bound, target_time))
            row = cur.fetchone()
            if row:
                return float(row[0])
            return None

    def get_historical_rr_long(self, current_timestamp: datetime, minutes_ago: int) -> Optional[float]:
        self.connect()
        target_time = current_timestamp - timedelta(minutes=minutes_ago)
        query = """
            SELECT rr_long
            FROM processed_results
            WHERE timestamp >= %s AND timestamp <= %s AND rr_long IS NOT NULL
            ORDER BY ABS(EXTRACT(EPOCH FROM (timestamp - %s))) ASC
            LIMIT 1
        """
        lower_bound = target_time - timedelta(minutes=2)
        upper_bound = target_time + timedelta(minutes=2)
        
        with self.conn.cursor() as cur:
            cur.execute(query, (lower_bound, upper_bound, target_time))
            row = cur.fetchone()
            if row:
                return float(row[0])
            return None

    def get_last_n_rr_long(self, current_timestamp: datetime, n: int) -> List[float]:
        self.connect()
        query = """
            SELECT rr_long
            FROM processed_results
            WHERE timestamp < %s AND rr_long IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT %s
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (current_timestamp, n))
            rows = cur.fetchall()
            return [float(row[0]) for row in rows]

    def get_previous_status(self, current_timestamp: datetime) -> Optional[str]:
        self.connect()
        query = """
            SELECT status
            FROM processed_results
            WHERE timestamp < %s
            ORDER BY timestamp DESC
            LIMIT 1
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (current_timestamp,))
            row = cur.fetchone()
            if row:
                return row[0]
            return None

    def insert_processed_result(self, result: dict):
        self.connect()
        query = """
            INSERT INTO processed_results (
                timestamp, l_t, rf_t, if_t, dl_t,
                rr_short, rr_long, acc, ra, dev,
                rr_adj, rf_adj, if_adj, dl_adj,
                base_threshold, adaptive_threshold, margin_1, margin_2, margin_3,
                rr_band, status, previous_status, status_changed, status_worsened,
                release_active, release_rate, max_safe_release, gate_opening_percent,
                target_safe_level, est_duration_mins, conflict_warning,
                action_message, warnings, is_valid, missing_fields
            ) VALUES (
                %(timestamp)s, %(l_t)s, %(rf_t)s, %(if_t)s, %(dl_t)s,
                %(rr_short)s, %(rr_long)s, %(acc)s, %(ra)s, %(dev)s,
                %(rr_adj)s, %(rf_adj)s, %(if_adj)s, %(dl_adj)s,
                %(base_threshold)s, %(adaptive_threshold)s, %(margin_1)s, %(margin_2)s, %(margin_3)s,
                %(rr_band)s, %(status)s, %(previous_status)s, %(status_changed)s, %(status_worsened)s,
                %(release_active)s, %(release_rate)s, %(max_safe_release)s, %(gate_opening_percent)s,
                %(target_safe_level)s, %(est_duration_mins)s, %(conflict_warning)s,
                %(action_message)s, %(warnings)s, %(is_valid)s, %(missing_fields)s
            )
        """
        with self.conn.cursor() as cur:
            cur.execute(query, result)
