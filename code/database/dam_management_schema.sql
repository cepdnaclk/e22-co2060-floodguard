-- ============================================================
-- Dam Management System — PostgreSQL Schema
-- Covers: sensor ingestion, algorithm-derived metrics,
-- adaptive threshold, risk status, release recommendations,
-- de-escalation tracking, alerts, engineers, and simulation config.
-- ============================================================

-- Drop existing objects (safe re-run during development)
DROP TABLE IF EXISTS simulation_config CASCADE;
DROP TABLE IF EXISTS alerts_log CASCADE;
DROP TABLE IF EXISTS deescalation_tracking CASCADE;
DROP TABLE IF EXISTS release_recommendations CASCADE;
DROP TABLE IF EXISTS risk_status CASCADE;
DROP TABLE IF EXISTS threshold_calculations CASCADE;
DROP TABLE IF EXISTS calculated_metrics CASCADE;
DROP TABLE IF EXISTS sensor_readings CASCADE;
DROP TABLE IF EXISTS engineers CASCADE;
DROP TABLE IF EXISTS dams CASCADE;

-- Enum types used across tables
DROP TYPE IF EXISTS rr_band_type CASCADE;
DROP TYPE IF EXISTS risk_status_type CASCADE;

CREATE TYPE rr_band_type AS ENUM ('NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL');
CREATE TYPE risk_status_type AS ENUM ('GREEN', 'YELLOW', 'ORANGE', 'RED');

-- ============================================================
-- 1. dams — static configuration, one row per dam
-- ============================================================
CREATE TABLE dams (
    dam_id                  SERIAL PRIMARY KEY,
    dam_name                VARCHAR(150) NOT NULL,
    location                VARCHAR(200),
    latitude                DOUBLE PRECISION,
    longitude               DOUBLE PRECISION,
    reservoir_capacity      DOUBLE PRECISION NOT NULL,   -- m^3
    downstream_capacity     DOUBLE PRECISION NOT NULL,   -- m^3/s
    max_gate_capacity       DOUBLE PRECISION NOT NULL,
    if_baseline             DOUBLE PRECISION NOT NULL,   -- normal baseline inflow, m^3/s
    base_threshold          DOUBLE PRECISION NOT NULL DEFAULT 75.0,  -- BASE, %
    threshold_floor         DOUBLE PRECISION NOT NULL DEFAULT 30.0,  -- %
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. engineers — front-end system users
-- ============================================================
CREATE TABLE engineers (
    engineer_id             SERIAL PRIMARY KEY,
    name                    VARCHAR(150) NOT NULL,
    role                    VARCHAR(100),
    contact                 VARCHAR(150),
    assigned_dam_id         INT REFERENCES dams(dam_id) ON DELETE SET NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. sensor_readings — raw sensor / weather input (Block 1)
--    Written every 1 minute, also by the simulation generator
-- ============================================================
CREATE TABLE sensor_readings (
    reading_id              BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    reading_time            TIMESTAMPTZ NOT NULL,          -- t
    water_level_pct         DOUBLE PRECISION NOT NULL,      -- L(t), %
    rainfall_mm_hr          DOUBLE PRECISION NOT NULL,      -- RF(t), mm/hour
    inflow_rate_m3s         DOUBLE PRECISION NOT NULL,      -- IF(t), m^3/s
    downstream_level_pct    DOUBLE PRECISION NOT NULL,      -- DL(t), % of safe capacity
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, reading_time)
);

CREATE INDEX idx_sensor_readings_dam_time ON sensor_readings (dam_id, reading_time DESC);

-- ============================================================
-- 4. calculated_metrics — rise rate, acceleration, deviation
--    (Blocks 2, 3, 4, 5)
-- ============================================================
CREATE TABLE calculated_metrics (
    metric_id               BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    calc_time               TIMESTAMPTZ NOT NULL,
    rr_short                DOUBLE PRECISION,   -- % per hour, last 15 min
    rr_long                 DOUBLE PRECISION,   -- % per hour, last 60 min
    acc                     DOUBLE PRECISION,   -- acceleration (RR_long now - 1hr ago)
    rolling_avg             DOUBLE PRECISION,   -- RA(t), 3-hour average of RR_long
    deviation_score         DOUBLE PRECISION,   -- DEV(t)
    rr_band                 rr_band_type NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, calc_time)
);

CREATE INDEX idx_calculated_metrics_dam_time ON calculated_metrics (dam_id, calc_time DESC);

-- ============================================================
-- 5. threshold_calculations — adaptive threshold (Blocks 6, 7)
-- ============================================================
CREATE TABLE threshold_calculations (
    calc_id                 BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    calc_time               TIMESTAMPTZ NOT NULL,
    rr_adj                  DOUBLE PRECISION NOT NULL DEFAULT 0,  -- %
    rf_adj                  DOUBLE PRECISION NOT NULL DEFAULT 0,  -- %
    if_adj                  DOUBLE PRECISION NOT NULL DEFAULT 0,  -- %
    dl_adj                  DOUBLE PRECISION NOT NULL DEFAULT 0,  -- %
    adaptive_threshold      DOUBLE PRECISION NOT NULL,            -- AT(t), %
    floor_triggered         BOOLEAN NOT NULL DEFAULT FALSE,
    ceiling_triggered       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, calc_time)
);

CREATE INDEX idx_threshold_calc_dam_time ON threshold_calculations (dam_id, calc_time DESC);

-- ============================================================
-- 6. risk_status — GREEN/YELLOW/ORANGE/RED status (Block 8)
-- ============================================================
CREATE TABLE risk_status (
    status_id               BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    status_time             TIMESTAMPTZ NOT NULL,
    status                  risk_status_type NOT NULL,
    margin_1                DOUBLE PRECISION,   -- AT + 20%
    margin_2                DOUBLE PRECISION,   -- AT + 10%
    margin_3                DOUBLE PRECISION,   -- AT + 3%
    trigger_reason          TEXT,
    previous_status         risk_status_type,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, status_time)
);

CREATE INDEX idx_risk_status_dam_time ON risk_status (dam_id, status_time DESC);

-- ============================================================
-- 7. release_recommendations — gate release plan (Block 9)
--    Only populated when status is ORANGE or RED
-- ============================================================
CREATE TABLE release_recommendations (
    release_id              BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    calc_time               TIMESTAMPTZ NOT NULL,
    release_rate            DOUBLE PRECISION,     -- m^3/s
    safe_storage_rate       DOUBLE PRECISION,     -- m^3/s
    max_safe_release        DOUBLE PRECISION,     -- m^3/s
    conflict_warning        BOOLEAN NOT NULL DEFAULT FALSE,
    gate_opening_pct        DOUBLE PRECISION,     -- rounded to nearest 5%
    estimated_duration_min  DOUBLE PRECISION,
    target_safe_level       DOUBLE PRECISION,     -- AT(t) - 10%
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, calc_time)
);

CREATE INDEX idx_release_reco_dam_time ON release_recommendations (dam_id, calc_time DESC);

-- ============================================================
-- 8. deescalation_tracking — sustained improvement tracking (Block 10)
-- ============================================================
CREATE TABLE deescalation_tracking (
    tracking_id             BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    condition_met_since     TIMESTAMPTZ,
    consecutive_minutes     INT NOT NULL DEFAULT 0,
    required_minutes        INT NOT NULL,          -- 15 / 30 / 60 depending on transition
    transition_from         risk_status_type NOT NULL,
    transition_to           risk_status_type NOT NULL,
    eligible_flag           BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deescalation_dam ON deescalation_tracking (dam_id);

-- ============================================================
-- 9. alerts_log — alert history for engineers (Flow Summary step 10)
-- ============================================================
CREATE TABLE alerts_log (
    alert_id                BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    alert_time              TIMESTAMPTZ NOT NULL DEFAULT now(),
    previous_status         risk_status_type,
    new_status              risk_status_type NOT NULL,
    message                 TEXT,
    acknowledged_by         INT REFERENCES engineers(engineer_id) ON DELETE SET NULL,
    acknowledged_at         TIMESTAMPTZ
);

CREATE INDEX idx_alerts_log_dam_time ON alerts_log (dam_id, alert_time DESC);

-- ============================================================
-- 10. simulation_config — test data generator settings
-- ============================================================
CREATE TABLE simulation_config (
    config_id               SERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    scenario_name           VARCHAR(150) NOT NULL,
    start_time              TIMESTAMPTZ NOT NULL,
    end_time                TIMESTAMPTZ,
    description             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_simulation_config_dam ON simulation_config (dam_id);

-- ============================================================
-- End of schema
-- ============================================================
