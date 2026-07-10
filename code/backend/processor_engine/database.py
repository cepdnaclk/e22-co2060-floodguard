"""
Database interactions for the FloodGuard Processor Engine.
Establishes local database connections from environment variables and manages
data ingestion and outputs for the predictive models.
"""

import psycopg2
import psycopg2.extras
from typing import Optional, List, Dict, Tuple
from datetime import datetime, timedelta
import os
import time
from dotenv import load_dotenv

# Load variables from the root .env file
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(script_dir, "..", "..", ".."))
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

class DatabaseManager:
    def __init__(self):
        self.conn = None

    def connect(self):
        """Connect to the local PostgreSQL database. Implements reconnection retry with backoff."""
        retries = 3
        delay = 2
        while retries > 0:
            try:
                if not self.conn or self.conn.closed != 0:
                    self.conn = psycopg2.connect(
                        host=DB_HOST,
                        port=DB_PORT,
                        database=DB_NAME,
                        user=DB_USER,
                        password=DB_PASSWORD
                    )
                    self.conn.autocommit = True
                return
            except psycopg2.OperationalError as e:
                retries -= 1
                print(f"[DatabaseManager] Connection failed: {e}. Reconnecting in {delay} seconds... ({retries} retries left)")
                if retries == 0:
                    raise e
                time.sleep(delay)
                delay *= 2

    def close(self):
        """Close connection gracefully."""
        if self.conn and self.conn.closed == 0:
            try:
                self.conn.close()
            except Exception:
                pass

    def get_all_dams(self) -> List[Dict]:
        """Fetch all configured dams."""
        self.connect()
        query = """
            SELECT dam_id, dam_name, location, latitude, longitude, elevation_m,
                   reservoir_capacity, downstream_capacity, max_gate_capacity,
                   if_baseline, base_threshold, threshold_floor
            FROM dams;
        """
        with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(query)
            return [dict(row) for row in cur.fetchall()]

    def get_latest_processed_time(self, dam_id: int) -> Optional[datetime]:
        """Get the last processed time of metrics for a dam."""
        self.connect()
        query = "SELECT MAX(calc_time) FROM calculated_metrics WHERE dam_id = %s;"
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id,))
            row = cur.fetchone()
            return row[0] if row else None

    def get_unprocessed_water_levels(self, dam_id: int, start_time: Optional[datetime]) -> List[Tuple[datetime, float]]:
        """Retrieve all unprocessed water level readings for a dam, sorted ascending."""
        self.connect()
        if start_time:
            query = """
                SELECT reading_time, water_level_pct
                FROM water_level_readings
                WHERE dam_id = %s AND reading_time > %s
                ORDER BY reading_time ASC;
            """
            params = (dam_id, start_time)
        else:
            query = """
                SELECT reading_time, water_level_pct
                FROM water_level_readings
                WHERE dam_id = %s
                ORDER BY reading_time ASC;
            """
            params = (dam_id,)
            
        with self.conn.cursor() as cur:
            cur.execute(query, params)
            return [(row[0], float(row[1])) for row in cur.fetchall()]

    def get_closest_inflow(self, dam_id: int, target_time: datetime) -> Optional[float]:
        """Find the inflow reading closest to the target timestamp within a 15-minute window."""
        self.connect()
        query = """
            SELECT inflow_rate_m3s
            FROM inflow_readings
            WHERE dam_id = %s AND reading_time BETWEEN %s - INTERVAL '15 minutes' AND %s + INTERVAL '15 minutes'
            ORDER BY ABS(EXTRACT(EPOCH FROM (reading_time - %s))) ASC
            LIMIT 1;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, target_time, target_time, target_time))
            row = cur.fetchone()
            return float(row[0]) if row else None

    def get_closest_downstream_level(self, dam_id: int, target_time: datetime) -> Optional[float]:
        """Find the downstream level reading closest to the target timestamp within a 15-minute window."""
        self.connect()
        query = """
            SELECT downstream_level_pct
            FROM downstream_level_readings
            WHERE dam_id = %s AND reading_time BETWEEN %s - INTERVAL '15 minutes' AND %s + INTERVAL '15 minutes'
            ORDER BY ABS(EXTRACT(EPOCH FROM (reading_time - %s))) ASC
            LIMIT 1;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, target_time, target_time, target_time))
            row = cur.fetchone()
            return float(row[0]) if row else None

    def get_rainfall_locations(self, dam_id: int) -> List[Dict]:
        """List active rainfall stations associated with a dam."""
        self.connect()
        query = """
            SELECT location_id, location_name, latitude, longitude, weight, delay_minutes
            FROM rainfall_locations
            WHERE nearest_dam_id = %s AND is_active = TRUE;
        """
        with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(query, (dam_id,))
            return [dict(row) for row in cur.fetchall()]

    def get_closest_rainfall(self, location_id: int, target_time: datetime) -> Optional[float]:
        """Find the rainfall reading closest to the target timestamp within a 15-minute window."""
        self.connect()
        query = """
            SELECT rainfall_mm_hr
            FROM rainfall_readings
            WHERE location_id = %s AND reading_time BETWEEN %s - INTERVAL '15 minutes' AND %s + INTERVAL '15 minutes'
            ORDER BY ABS(EXTRACT(EPOCH FROM (reading_time - %s))) ASC
            LIMIT 1;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (location_id, target_time, target_time, target_time))
            row = cur.fetchone()
            return float(row[0]) if row else None

    def get_historical_water_levels_window(self, dam_id: int, end_time: datetime, hours: float) -> List[Tuple[datetime, float]]:
        """Get water level readings within [end_time - hours, end_time]."""
        self.connect()
        query = """
            SELECT reading_time, water_level_pct
            FROM water_level_readings
            WHERE dam_id = %s AND reading_time BETWEEN %s - %s * INTERVAL '1 hour' AND %s
            ORDER BY reading_time ASC;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, end_time, hours, end_time))
            return [(row[0], float(row[1])) for row in cur.fetchall()]

    def get_historical_inflows_window(self, dam_id: int, end_time: datetime, hours: float) -> List[Tuple[datetime, float]]:
        """Get inflow readings within [end_time - hours, end_time]."""
        self.connect()
        query = """
            SELECT reading_time, inflow_rate_m3s
            FROM inflow_readings
            WHERE dam_id = %s AND reading_time BETWEEN %s - %s * INTERVAL '1 hour' AND %s
            ORDER BY reading_time ASC;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, end_time, hours, end_time))
            return [(row[0], float(row[1])) for row in cur.fetchall()]

    def get_historical_downstream_levels_window(self, dam_id: int, end_time: datetime, hours: float) -> List[Tuple[datetime, float]]:
        """Get downstream level readings within [end_time - hours, end_time]."""
        self.connect()
        query = """
            SELECT reading_time, downstream_level_pct
            FROM downstream_level_readings
            WHERE dam_id = %s AND reading_time BETWEEN %s - %s * INTERVAL '1 hour' AND %s
            ORDER BY reading_time ASC;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, end_time, hours, end_time))
            return [(row[0], float(row[1])) for row in cur.fetchall()]

    def get_historical_station_rainfall_window(self, location_id: int, end_time: datetime, hours: float) -> List[Tuple[datetime, float]]:
        """Get station-specific rainfall readings within [end_time - hours, end_time]."""
        self.connect()
        query = """
            SELECT reading_time, rainfall_mm_hr
            FROM rainfall_readings
            WHERE location_id = %s AND reading_time BETWEEN %s - %s * INTERVAL '1 hour' AND %s
            ORDER BY reading_time ASC;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (location_id, end_time, hours, end_time))
            return [(row[0], float(row[1])) for row in cur.fetchall()]

    def get_historical_rr_longs(self, dam_id: int, end_time: datetime, hours: float) -> List[Tuple[datetime, float]]:
        """Get calculated long-term rise rates within [end_time - hours, end_time]."""
        self.connect()
        query = """
            SELECT calc_time, rr_long
            FROM calculated_metrics
            WHERE dam_id = %s AND calc_time BETWEEN %s - %s * INTERVAL '1 hour' AND %s
            ORDER BY calc_time ASC;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, end_time, hours, end_time))
            return [(row[0], float(row[1])) for row in cur.fetchall() if row[1] is not None]

    def get_previous_calculated_metrics(self, dam_id: int, target_time: datetime) -> Optional[Dict]:
        """Fetch the calculated metric row immediately preceding target_time."""
        self.connect()
        query = """
            SELECT rr_short, rr_long, acc, rolling_avg, deviation_score, rr_band
            FROM calculated_metrics
            WHERE dam_id = %s AND calc_time < %s
            ORDER BY calc_time DESC
            LIMIT 1;
        """
        with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(query, (dam_id, target_time))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_previous_risk_status(self, dam_id: int, target_time: datetime) -> Optional[str]:
        """Get the risk status value immediately before target_time."""
        self.connect()
        query = """
            SELECT status
            FROM risk_status
            WHERE dam_id = %s AND status_time < %s
            ORDER BY status_time DESC
            LIMIT 1;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, target_time))
            row = cur.fetchone()
            return row[0] if row else None

    def get_closest_r_net(self, dam_id: int, target_time: datetime) -> Optional[float]:
        """Fetch the net rainfall at or closest to target_time by computing R_net from stations."""
        stations = self.get_rainfall_locations(dam_id)
        if not stations:
            return None
            
        r_net = 0.0
        total_weight = 0.0
        for s in stations:
            t_lagged = target_time - timedelta(minutes=s['delay_minutes'])
            val = self.get_closest_rainfall(s['location_id'], t_lagged)
            if val is not None:
                r_net += s['weight'] * val
                total_weight += s['weight']
                
        if total_weight < 1e-5:
            return None
            
        return r_net / total_weight

    def get_closest_water_level(self, dam_id: int, target_time: datetime) -> Optional[float]:
        """Get closest water level for de-escalation check."""
        self.connect()
        query = """
            SELECT water_level_pct
            FROM water_level_readings
            WHERE dam_id = %s AND reading_time BETWEEN %s - INTERVAL '15 minutes' AND %s + INTERVAL '15 minutes'
            ORDER BY ABS(EXTRACT(EPOCH FROM (reading_time - %s))) ASC
            LIMIT 1;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, target_time, target_time, target_time))
            row = cur.fetchone()
            return float(row[0]) if row else None

    def get_deescalation_tracking(self, dam_id: int) -> List[Dict]:
        """Retrieve deescalation tracking rows for a dam."""
        self.connect()
        query = """
            SELECT tracking_id, condition_met_since, consecutive_minutes, required_minutes,
                   transition_from, transition_to, eligible_flag
            FROM deescalation_tracking
            WHERE dam_id = %s;
        """
        with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute(query, (dam_id,))
            return [dict(row) for row in cur.fetchall()]

    def save_deescalation_tracking(
        self,
        dam_id: int,
        transition_from: str,
        transition_to: str,
        condition_met_since: Optional[datetime],
        consecutive_minutes: int,
        required_minutes: int,
        eligible_flag: bool
    ):
        """Insert or update de-escalation tracking row."""
        self.connect()
        query = """
            INSERT INTO deescalation_tracking (
                dam_id, transition_from, transition_to, condition_met_since,
                consecutive_minutes, required_minutes, eligible_flag, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (dam_id) DO UPDATE SET
                condition_met_since = EXCLUDED.condition_met_since,
                consecutive_minutes = EXCLUDED.consecutive_minutes,
                required_minutes = EXCLUDED.required_minutes,
                eligible_flag = EXCLUDED.eligible_flag,
                updated_at = now();
        """
        # Note: We need a unique constraint on (dam_id, transition_from, transition_to) or we can manage per dam_id.
        # Let's check the schema's index or constraints.
        # The schema has: INDEX idx_deescalation_dam ON deescalation_tracking (dam_id);
        # Let's delete and insert to keep it simple, or do a conditional save.
        # Let's drop-insert or update by transition_from/transition_to.
        query_upsert = """
            DELETE FROM deescalation_tracking 
            WHERE dam_id = %s AND transition_from = %s AND transition_to = %s;
        """
        query_insert = """
            INSERT INTO deescalation_tracking (
                dam_id, transition_from, transition_to, condition_met_since,
                consecutive_minutes, required_minutes, eligible_flag, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, now());
        """
        with self.conn.cursor() as cur:
            cur.execute(query_upsert, (dam_id, transition_from, transition_to))
            cur.execute(query_insert, (dam_id, transition_from, transition_to, condition_met_since, consecutive_minutes, required_minutes, eligible_flag))

    def reset_deescalation_tracking(self, dam_id: int):
        """Reset all tracking records for a dam."""
        self.connect()
        query = """
            UPDATE deescalation_tracking
            SET condition_met_since = NULL, consecutive_minutes = 0, eligible_flag = FALSE, updated_at = now()
            WHERE dam_id = %s;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id,))

    def insert_prediction_run(
        self,
        dam_id: int,
        run_time: datetime,
        window_start: datetime,
        window_end: datetime,
        method: str,
        status: str
    ) -> int:
        """Insert a prediction run and return the run_id."""
        self.connect()
        query = """
            INSERT INTO prediction_runs (dam_id, run_time, input_window_start, input_window_end, method, status)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING run_id;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, run_time, window_start, window_end, method, status))
            return cur.fetchone()[0]

    def insert_predicted_values(self, rows: List[Tuple]):
        """Insert multiple predicted future points in bulk."""
        self.connect()
        query = """
            INSERT INTO predicted_values (
                run_id, horizon_minutes, predicted_water_level_pct, predicted_r_net, predicted_inflow,
                predicted_downstream_level, predicted_rise_rate, predicted_acc, predicted_adaptive_threshold, gap
            ) VALUES %s;
        """
        # Use execute_values for efficient bulk insertion
        with self.conn.cursor() as cur:
            psycopg2.extras.execute_values(cur, query, rows)

    def insert_graph_crossing_result(
        self,
        run_id: int,
        crossing_time_minutes: Optional[int],
        minimum_gap: float,
        gap_trend: str,
        final_status: str
    ):
        """Insert a summarized crossing result for a run."""
        self.connect()
        query = """
            INSERT INTO graph_crossing_results (run_id, crossing_time_minutes, minimum_gap, gap_trend, final_status)
            VALUES (%s, %s, %s, %s, %s);
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (run_id, crossing_time_minutes, minimum_gap, gap_trend, final_status))

    def insert_calculated_metric(
        self,
        dam_id: int,
        calc_time: datetime,
        rr_short: Optional[float],
        rr_long: Optional[float],
        acc: Optional[float],
        rolling_avg: Optional[float],
        deviation_score: Optional[float],
        rr_band: str
    ):
        """Insert calculated metrics."""
        self.connect()
        query = """
            INSERT INTO calculated_metrics (dam_id, calc_time, rr_short, rr_long, acc, rolling_avg, deviation_score, rr_band)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (dam_id, calc_time) DO UPDATE SET
                rr_short = EXCLUDED.rr_short,
                rr_long = EXCLUDED.rr_long,
                acc = EXCLUDED.acc,
                rolling_avg = EXCLUDED.rolling_avg,
                deviation_score = EXCLUDED.deviation_score,
                rr_band = EXCLUDED.rr_band;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, calc_time, rr_short, rr_long, acc, rolling_avg, deviation_score, rr_band))

    def insert_threshold_calculation(
        self,
        dam_id: int,
        calc_time: datetime,
        rr_adj: float,
        rf_adj: float,
        if_adj: float,
        dl_adj: float,
        adaptive_threshold: float,
        floor_triggered: bool,
        ceiling_triggered: bool
    ):
        """Insert threshold calculation details."""
        self.connect()
        query = """
            INSERT INTO threshold_calculations (dam_id, calc_time, rr_adj, rf_adj, if_adj, dl_adj, adaptive_threshold, floor_triggered, ceiling_triggered)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (dam_id, calc_time) DO UPDATE SET
                rr_adj = EXCLUDED.rr_adj,
                rf_adj = EXCLUDED.rf_adj,
                if_adj = EXCLUDED.if_adj,
                dl_adj = EXCLUDED.dl_adj,
                adaptive_threshold = EXCLUDED.adaptive_threshold,
                floor_triggered = EXCLUDED.floor_triggered,
                ceiling_triggered = EXCLUDED.ceiling_triggered;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, calc_time, rr_adj, rf_adj, if_adj, dl_adj, adaptive_threshold, floor_triggered, ceiling_triggered))

    def insert_risk_status(
        self,
        dam_id: int,
        status_time: datetime,
        status: str,
        ttc_minutes: Optional[int],
        trigger_reason: str,
        previous_status: Optional[str]
    ):
        """Insert risk status."""
        self.connect()
        query = """
            INSERT INTO risk_status (dam_id, status_time, status, ttc_minutes, trigger_reason, previous_status)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (dam_id, status_time) DO UPDATE SET
                status = EXCLUDED.status,
                ttc_minutes = EXCLUDED.ttc_minutes,
                trigger_reason = EXCLUDED.trigger_reason,
                previous_status = EXCLUDED.previous_status;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, status_time, status, ttc_minutes, trigger_reason, previous_status))

    def insert_release_recommendation(
        self,
        dam_id: int,
        run_id: Optional[int],
        calc_time: datetime,
        strategy: str,
        rise_rate_used: float,
        gate_opening_base_pct: float,
        q_desired: float,
        q_downstream_available: float,
        q_release: float,
        gate_opening_applied_pct: float,
        conflict_warning: bool,
        estimated_duration_minutes: Optional[float]
    ):
        """Insert release recommendation."""
        self.connect()
        query = """
            INSERT INTO release_recommendations (
                dam_id, run_id, calc_time, strategy, rise_rate_used, gate_opening_base_pct,
                q_desired, q_downstream_available, q_release, gate_opening_applied_pct,
                conflict_warning, estimated_duration_minutes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (dam_id, calc_time) DO UPDATE SET
                run_id = EXCLUDED.run_id,
                strategy = EXCLUDED.strategy,
                rise_rate_used = EXCLUDED.rise_rate_used,
                gate_opening_base_pct = EXCLUDED.gate_opening_base_pct,
                q_desired = EXCLUDED.q_desired,
                q_downstream_available = EXCLUDED.q_downstream_available,
                q_release = EXCLUDED.q_release,
                gate_opening_applied_pct = EXCLUDED.gate_opening_applied_pct,
                conflict_warning = EXCLUDED.conflict_warning,
                estimated_duration_minutes = EXCLUDED.estimated_duration_minutes;
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (
                dam_id, run_id, calc_time, strategy, rise_rate_used, gate_opening_base_pct,
                q_desired, q_downstream_available, q_release, gate_opening_applied_pct,
                conflict_warning, estimated_duration_minutes
            ))

    def insert_alert(
        self,
        dam_id: int,
        run_id: Optional[int],
        alert_time: datetime,
        previous_status: Optional[str],
        new_status: str,
        message: str
    ):
        """Insert an escalation alert log."""
        self.connect()
        query = """
            INSERT INTO alerts_log (dam_id, run_id, alert_time, previous_status, new_status, message)
            VALUES (%s, %s, %s, %s, %s, %s);
        """
        with self.conn.cursor() as cur:
            cur.execute(query, (dam_id, run_id, alert_time, previous_status, new_status, message))
