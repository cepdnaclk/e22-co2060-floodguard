-- ============================================================
-- Dam Management System — PostgreSQL Canonical Schema
--
-- RELATIONSHIP OVERVIEW:
-- [dams] 1:N [engineers]
--   |
--   +-- 1:N -- [water_level_readings, inflow_readings, downstream_level_readings]
--   +-- 1:N -- [calculated_metrics, threshold_calculations, risk_status]
--   +-- 1:N -- [release_recommendations, alerts_log]
--
-- [rainfall_locations] 1:N [rainfall_readings]
-- Covers: sensor ingestion, weighted/time-lagged rainfall,
-- prediction runs, predicted values, crossing results,
-- algorithm-derived metrics, adaptive threshold, risk status,
-- release recommendations, de-escalation tracking, and alerts.
-- ============================================================

-- Drop existing objects (safe re-run during development/setup)
DROP TABLE IF EXISTS alerts_log CASCADE;
DROP TABLE IF EXISTS deescalation_tracking CASCADE;
DROP TABLE IF EXISTS release_recommendations CASCADE;
DROP TABLE IF EXISTS risk_status CASCADE;
DROP TABLE IF EXISTS threshold_calculations CASCADE;
DROP TABLE IF EXISTS calculated_metrics CASCADE;
DROP TABLE IF EXISTS rainfall_readings CASCADE;
DROP TABLE IF EXISTS water_level_readings CASCADE;
DROP TABLE IF EXISTS inflow_readings CASCADE;
DROP TABLE IF EXISTS downstream_level_readings CASCADE;
DROP TABLE IF EXISTS rainfall_locations CASCADE;
DROP TABLE IF EXISTS engineers CASCADE;
DROP TABLE IF EXISTS dams CASCADE;
DROP TABLE IF EXISTS prediction_runs CASCADE;
DROP TABLE IF EXISTS predicted_values CASCADE;
DROP TABLE IF EXISTS graph_crossing_results CASCADE;
DROP TABLE IF EXISTS simulation_config CASCADE;

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
    elevation_m             DOUBLE PRECISION,                   -- dam elevation in meters
    reservoir_capacity      DOUBLE PRECISION NOT NULL,          -- m^3
    downstream_capacity     DOUBLE PRECISION NOT NULL,          -- m^3/s
    max_gate_capacity       DOUBLE PRECISION NOT NULL,          -- m^3/s
    if_baseline             DOUBLE PRECISION NOT NULL,          -- normal baseline inflow, m^3/s
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
    password_hash           VARCHAR(255),                       -- bcrypt password hash
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. rainfall_locations — geographic stations that measure rainfall
-- ============================================================
CREATE TABLE rainfall_locations (
    location_id             SERIAL PRIMARY KEY,
    location_name           VARCHAR(200) NOT NULL,
    description             TEXT,
    latitude                DOUBLE PRECISION NOT NULL,
    longitude               DOUBLE PRECISION NOT NULL,
    elevation_m             DOUBLE PRECISION,
    district                VARCHAR(100),
    province                VARCHAR(100),
    country                 VARCHAR(100) NOT NULL DEFAULT 'Sri Lanka',
    nearest_dam_id          INT REFERENCES dams(dam_id) ON DELETE SET NULL,
    weight                  DOUBLE PRECISION NOT NULL DEFAULT 0,
    delay_minutes           DOUBLE PRECISION NOT NULL DEFAULT 0,
    station_code            VARCHAR(50) UNIQUE,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    installed_at            DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4a. water_level_readings — reservoir water level sensor (3NF)
-- ============================================================
CREATE TABLE water_level_readings (
    reading_id              BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    reading_time            TIMESTAMPTZ NOT NULL,
    water_level_pct         DOUBLE PRECISION NOT NULL,          -- L(t), %
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, reading_time)
);

-- ============================================================
-- 4b. inflow_readings — upstream inflow rate sensor (3NF)
-- ============================================================
CREATE TABLE inflow_readings (
    reading_id              BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    reading_time            TIMESTAMPTZ NOT NULL,
    inflow_rate_m3s         DOUBLE PRECISION NOT NULL,          -- IF(t), m^3/s
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, reading_time)
);

-- ============================================================
-- 4c. downstream_level_readings — downstream channel level sensor (3NF)
-- ============================================================
CREATE TABLE downstream_level_readings (
    reading_id              BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    reading_time            TIMESTAMPTZ NOT NULL,
    downstream_level_pct    DOUBLE PRECISION NOT NULL,          -- DL(t), %
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, reading_time)
);

-- ============================================================
-- 4d. rainfall_readings — precipitation measured per station (3NF)
-- ============================================================
CREATE TABLE rainfall_readings (
    reading_id              BIGSERIAL PRIMARY KEY,
    location_id             INT NOT NULL REFERENCES rainfall_locations(location_id) ON DELETE CASCADE,
    reading_time            TIMESTAMPTZ NOT NULL,
    rainfall_mm_hr          DOUBLE PRECISION NOT NULL,          -- R_i(t), mm/hour
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (location_id, reading_time)
);

-- ============================================================
-- 5a. prediction_runs — metadata for each forecast cycle
-- ============================================================
CREATE TABLE prediction_runs (
    run_id                  BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    run_time                TIMESTAMPTZ NOT NULL,               -- when cycle executed
    input_window_start      TIMESTAMPTZ NOT NULL,               -- rolling window start
    input_window_end        TIMESTAMPTZ NOT NULL,               -- rolling window end
    method                  VARCHAR(50) NOT NULL,               -- e.g. "newton_divided_difference"
    status                  VARCHAR(20) NOT NULL                -- "success" / "insufficient_data" / "error"
);

-- ============================================================
-- 5b. predicted_values — extrapolated values per run & horizon
-- ============================================================
CREATE TABLE predicted_values (
    value_id                    BIGSERIAL PRIMARY KEY,
    run_id                      BIGINT NOT NULL REFERENCES prediction_runs(run_id) ON DELETE CASCADE,
    horizon_minutes             INT NOT NULL,                   -- e.g. 15, 30, 45, 60, 90, 120
    predicted_water_level_pct   DOUBLE PRECISION NOT NULL,      -- L_pred(t+h)
    predicted_r_net             DOUBLE PRECISION NOT NULL,      -- R_net_pred(t+h)
    predicted_inflow            DOUBLE PRECISION NOT NULL,      -- IF_pred(t+h)
    predicted_downstream_level  DOUBLE PRECISION NOT NULL,      -- DL_pred(t+h)
    predicted_rise_rate         DOUBLE PRECISION NOT NULL,      -- RR_pred(t+h)
    predicted_acc               DOUBLE PRECISION NOT NULL,      -- ACC_pred(t+h)
    predicted_adaptive_threshold DOUBLE PRECISION NOT NULL,     -- AT(t+h)
    gap                         DOUBLE PRECISION NOT NULL,      -- AT(t+h) - L_pred(t+h)
    UNIQUE (run_id, horizon_minutes)
);

-- ============================================================
-- 5c. graph_crossing_results — summarized crossing analysis per run
-- ============================================================
CREATE TABLE graph_crossing_results (
    result_id               BIGSERIAL PRIMARY KEY,
    run_id                  BIGINT NOT NULL REFERENCES prediction_runs(run_id) ON DELETE CASCADE UNIQUE,
    crossing_time_minutes   INT,                                -- TTC (nullable)
    minimum_gap             DOUBLE PRECISION NOT NULL,          -- smallest gap across horizons
    gap_trend               VARCHAR(20) NOT NULL,               -- "increasing" / "decreasing" / "stable"
    final_status            risk_status_type NOT NULL
);

-- ============================================================
-- 6. calculated_metrics — live calculated values (non-predicted)
-- ============================================================
CREATE TABLE calculated_metrics (
    metric_id               BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    calc_time               TIMESTAMPTZ NOT NULL,
    rr_short                DOUBLE PRECISION,                   -- % per hour, last 15 min
    rr_long                 DOUBLE PRECISION,                   -- % per hour, last 60 min
    acc                     DOUBLE PRECISION,                   -- acceleration
    rolling_avg             DOUBLE PRECISION,                   -- RA(t)
    deviation_score         DOUBLE PRECISION,                   -- DEV(t)
    rr_band                 rr_band_type NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, calc_time)
);

-- ============================================================
-- 7. threshold_calculations — live threshold adjustments (non-predicted)
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

-- ============================================================
-- 8. risk_status — official risk state (replaces older margin columns)
-- ============================================================
CREATE TABLE risk_status (
    status_id               BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    status_time             TIMESTAMPTZ NOT NULL,
    status                  risk_status_type NOT NULL,
    ttc_minutes             INT,                                -- TTC (nullable), replaces margin_1/2/3
    trigger_reason          TEXT,
    previous_status         risk_status_type,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, status_time)
);

-- ============================================================
-- 9. release_recommendations — gate release plans (proportional rise rate)
-- ============================================================
CREATE TABLE release_recommendations (
    release_id                  BIGSERIAL PRIMARY KEY,
    dam_id                      INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    run_id                      BIGINT REFERENCES prediction_runs(run_id) ON DELETE SET NULL,
    calc_time                   TIMESTAMPTZ NOT NULL,
    strategy                    VARCHAR(50) NOT NULL,           -- always "proportional_rise_rate"
    rise_rate_used              DOUBLE PRECISION NOT NULL,      -- RR_pred(t+15)
    gate_opening_base_pct       DOUBLE PRECISION NOT NULL,      -- before safety clamps
    q_desired                   DOUBLE PRECISION NOT NULL,      -- m^3/s
    q_downstream_available      DOUBLE PRECISION NOT NULL,      -- m^3/s
    q_release                   DOUBLE PRECISION NOT NULL,      -- m^3/s, final recommended rate
    gate_opening_applied_pct    DOUBLE PRECISION NOT NULL,      -- after clamps, rounded to nearest 5%
    conflict_warning            BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_duration_minutes  DOUBLE PRECISION,               -- dimensionally corrected duration
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (dam_id, calc_time)
);

-- ============================================================
-- 10. deescalation_tracking — sustained improvement timing
-- ============================================================
CREATE TABLE deescalation_tracking (
    tracking_id             BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    condition_met_since     TIMESTAMPTZ,
    consecutive_minutes     INT NOT NULL DEFAULT 0,
    required_minutes        INT NOT NULL,                       -- 15 / 30 / 60
    transition_from         risk_status_type NOT NULL,
    transition_to           risk_status_type NOT NULL,
    eligible_flag           BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. alerts_log — alert history for engineers
-- ============================================================
CREATE TABLE alerts_log (
    alert_id                BIGSERIAL PRIMARY KEY,
    dam_id                  INT NOT NULL REFERENCES dams(dam_id) ON DELETE CASCADE,
    run_id                  BIGINT REFERENCES prediction_runs(run_id) ON DELETE SET NULL,
    alert_time              TIMESTAMPTZ NOT NULL DEFAULT now(),
    previous_status         risk_status_type,
    new_status              risk_status_type NOT NULL,
    message                 TEXT,
    acknowledged_by         INT REFERENCES engineers(engineer_id) ON DELETE SET NULL,
    acknowledged_at         TIMESTAMPTZ
);

-- ============================================================
-- 12. simulation_config — testing/simulation configuration
-- ============================================================
CREATE TABLE simulation_config (
    config_id               SERIAL PRIMARY KEY,
    dam_id                  INT REFERENCES dams(dam_id) ON DELETE CASCADE,
    scenario_name           VARCHAR(150) NOT NULL,
    start_time              TIMESTAMPTZ NOT NULL,
    end_time                TIMESTAMPTZ NOT NULL,
    description             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. Indexing Requirements
-- ============================================================
CREATE INDEX idx_water_level_dam_time ON water_level_readings (dam_id, reading_time DESC);
CREATE INDEX idx_inflow_dam_time ON inflow_readings (dam_id, reading_time DESC);
CREATE INDEX idx_downstream_level_dam_time ON downstream_level_readings (dam_id, reading_time DESC);
CREATE INDEX idx_rainfall_readings_location_time ON rainfall_readings (location_id, reading_time DESC);
CREATE INDEX idx_rainfall_locations_dam ON rainfall_locations (nearest_dam_id);
CREATE INDEX idx_calculated_metrics_dam_time ON calculated_metrics (dam_id, calc_time DESC);
CREATE INDEX idx_threshold_calc_dam_time ON threshold_calculations (dam_id, calc_time DESC);
CREATE INDEX idx_risk_status_dam_time ON risk_status (dam_id, status_time DESC);
CREATE INDEX idx_release_reco_dam_time ON release_recommendations (dam_id, calc_time DESC);
CREATE INDEX idx_predicted_values_run ON predicted_values (run_id);
CREATE INDEX idx_prediction_runs_dam_time ON prediction_runs (dam_id, run_time DESC);
CREATE INDEX idx_alerts_log_dam_time ON alerts_log (dam_id, alert_time DESC);
CREATE INDEX idx_deescalation_dam ON deescalation_tracking (dam_id);
