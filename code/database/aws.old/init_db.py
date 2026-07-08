import psycopg2
import os
from dotenv import load_dotenv

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
load_dotenv(dotenv_path=os.path.join(project_root, ".env"))

DB_HOST = 'floodmanagement.czk28osu0tg7.ap-southeast-2.rds.amazonaws.com'
DB_PORT = 5432
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
CERT_PATH = os.path.join(project_root, "global-bundle.pem")

def init_db():
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
        conn.autocommit = True
        
        with conn.cursor() as cur:
            # Create sensor_readings table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS sensor_readings (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    water_level_pct FLOAT,
                    rainfall_mm_hr FLOAT,
                    inflow_m3s FLOAT,
                    downstream_lvl_pct FLOAT,
                    source VARCHAR(50)
                );
            """)
            print("Table 'sensor_readings' verified/created.")

            # Create processed_results table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS processed_results (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    l_t FLOAT,
                    rf_t FLOAT,
                    if_t FLOAT,
                    dl_t FLOAT,
                    rr_short FLOAT,
                    rr_long FLOAT,
                    acc FLOAT,
                    ra FLOAT,
                    dev FLOAT,
                    rr_adj FLOAT,
                    rf_adj FLOAT,
                    if_adj FLOAT,
                    dl_adj FLOAT,
                    base_threshold FLOAT,
                    adaptive_threshold FLOAT,
                    margin_1 FLOAT,
                    margin_2 FLOAT,
                    margin_3 FLOAT,
                    rr_band VARCHAR(50),
                    status VARCHAR(50),
                    previous_status VARCHAR(50),
                    status_changed BOOLEAN,
                    status_worsened BOOLEAN,
                    release_active BOOLEAN,
                    release_rate FLOAT,
                    max_safe_release FLOAT,
                    gate_opening_percent FLOAT,
                    target_safe_level FLOAT,
                    est_duration_mins FLOAT,
                    conflict_warning BOOLEAN,
                    action_message TEXT,
                    warnings TEXT,
                    is_valid BOOLEAN,
                    missing_fields TEXT
                );
            """)
            print("Table 'processed_results' verified/created.")

    except Exception as e:
        print(f"Error during initialization: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    init_db()
