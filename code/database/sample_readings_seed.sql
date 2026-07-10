-- ============================================================
-- FloodGuard — Sample Time-Series Readings Seed Script
-- Period: 2026-04-04 00:00 to 2026-07-10 00:00 (today)
-- Dam: Victoria Dam (assumes sample_dam_and_rainfall_data.sql already run)
--
-- SCOPE: this script populates RAW input tables only —
--   water_level_readings, inflow_readings, downstream_level_readings,
--   rainfall_readings
-- It deliberately does NOT populate calculated_metrics, threshold_calculations,
-- risk_status, release_recommendations, prediction_runs, predicted_values,
-- graph_crossing_results, deescalation_tracking, or alerts_log.
-- Those tables are the output of the actual calculation engine
-- (02_BACKEND_PROMPT.md) running against real formulas — fabricating them
-- here would duplicate that logic with fake numbers, which breaks this
-- project's own rule that calculation logic lives in exactly one place.
-- Run the real engine against the raw data this script inserts to populate
-- those tables properly.
--
-- REALISM MODEL (not just random noise):
--  - A shared regional "storm intensity" process drives rainfall at all five
--    stations together (real storms affect a whole catchment, not one
--    station in isolation), with per-station factors and independent noise
--    layered on top.
--  - Rainfall gradually trends wetter across the period, reflecting the
--    real seasonal shift from the April inter-monsoon into the wetter
--    southwest monsoon (May-September) that affects this catchment.
--  - Inflow responds to accumulated recent rainfall with a lag/smoothing
--    effect (catchment response time), not an instant jump.
--  - Water level integrates inflow versus a baseline outflow over time,
--    using the dam's actual reservoir_capacity for a physically-scaled
--    (not arbitrary) rate of change — consistent with water level being a
--    slow, integrated signal rather than a noisy one.
--  - Downstream level responds to the same regional rain with its own lag.
--
-- RESOLUTION: 15-minute intervals by default (~9,300 rows per table over
-- this ~97-day period). To switch to full 1-minute resolution, change
-- v_step below to interval '1 minute' — this will produce roughly 8x more
-- rows (~140,000 per table) and take proportionally longer to run.
--
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING against the
-- existing UNIQUE (dam_id/location_id, reading_time) constraints.
-- ============================================================

DO $$
DECLARE
    v_dam_id            INT;
    v_loc_ne            INT;  -- Nuwara Eliya
    v_loc_ky            INT;  -- Kandy
    v_loc_kg            INT;  -- Katugastota
    v_loc_pd            INT;  -- Peradeniya
    v_loc_hg            INT;  -- Hunnasgiriya

    v_start_time        TIMESTAMPTZ := '2026-04-04 00:00:00+05:30';
    v_end_time          TIMESTAMPTZ := '2026-07-10 00:00:00+05:30';
    v_step              INTERVAL   := INTERVAL '15 minutes';
    v_time              TIMESTAMPTZ;

    v_reservoir_capacity DOUBLE PRECISION;
    v_if_baseline        DOUBLE PRECISION;

    -- State variables carried across iterations
    v_water_level       DOUBLE PRECISION := 58.0;   -- %, mid-range starting level
    v_downstream_level  DOUBLE PRECISION := 40.0;   -- %
    v_inflow            DOUBLE PRECISION := 48.0;   -- m^3/s, near if_baseline
    v_storm_intensity   DOUBLE PRECISION := 0.0;    -- shared regional storm state, mm/hr contribution
    v_recent_rain       DOUBLE PRECISION := 0.0;    -- smoothed accumulator driving inflow response

    -- Per-step working values
    v_progress          DOUBLE PRECISION;           -- 0..1 across the whole period, for seasonal ramp
    v_hour_of_day       DOUBLE PRECISION;
    v_seasonal_base     DOUBLE PRECISION;
    v_diurnal           DOUBLE PRECISION;
    v_regional_rain     DOUBLE PRECISION;
    v_target_inflow     DOUBLE PRECISION;
    v_net_flow          DOUBLE PRECISION;
    v_step_seconds      DOUBLE PRECISION;

    v_ne_rain           DOUBLE PRECISION;
    v_ky_rain           DOUBLE PRECISION;
    v_kg_rain           DOUBLE PRECISION;
    v_pd_rain           DOUBLE PRECISION;
    v_hg_rain           DOUBLE PRECISION;

    v_total_seconds     DOUBLE PRECISION;
BEGIN
    SELECT dam_id, reservoir_capacity, if_baseline
      INTO v_dam_id, v_reservoir_capacity, v_if_baseline
      FROM dams WHERE dam_name = 'Victoria Dam';

    IF v_dam_id IS NULL THEN
        RAISE EXCEPTION 'Victoria Dam not found — run sample_dam_and_rainfall_data.sql first.';
    END IF;

    SELECT location_id INTO v_loc_ne FROM rainfall_locations WHERE station_code = 'RF-NE-01';
    SELECT location_id INTO v_loc_ky FROM rainfall_locations WHERE station_code = 'RF-KY-01';
    SELECT location_id INTO v_loc_kg FROM rainfall_locations WHERE station_code = 'RF-KG-01';
    SELECT location_id INTO v_loc_pd FROM rainfall_locations WHERE station_code = 'RF-PD-01';
    SELECT location_id INTO v_loc_hg FROM rainfall_locations WHERE station_code = 'RF-HG-01';

    v_step_seconds := EXTRACT(EPOCH FROM v_step);
    v_total_seconds := EXTRACT(EPOCH FROM (v_end_time - v_start_time));

    v_time := v_start_time;

    WHILE v_time <= v_end_time LOOP

        v_progress    := EXTRACT(EPOCH FROM (v_time - v_start_time)) / v_total_seconds;
        v_hour_of_day := EXTRACT(HOUR FROM v_time) + EXTRACT(MINUTE FROM v_time) / 60.0;

        -- Seasonal ramp: light in early April, wetter through May-July (SW monsoon onset)
        v_seasonal_base := 1.5 + 5.0 * v_progress;

        -- Diurnal cycle: tropical convective rain peaks in the afternoon/evening
        v_diurnal := GREATEST(0, 3.0 * SIN(PI() * (v_hour_of_day - 12.0) / 12.0));

        -- Regional storm process: slow decay + occasional random bursts
        v_storm_intensity := v_storm_intensity * 0.97;
        IF random() < 0.004 THEN
            v_storm_intensity := v_storm_intensity + (10 + random() * 45);
        END IF;

        v_regional_rain := GREATEST(0, v_seasonal_base + v_diurnal + v_storm_intensity + (random() - 0.5) * 1.5);

        -- Per-station rainfall: shared regional signal, station factor, independent noise
        v_ne_rain := GREATEST(0, v_regional_rain * 1.15 + (random() - 0.5) * 2.0);  -- highland exposure
        v_ky_rain := GREATEST(0, v_regional_rain * 1.00 + (random() - 0.5) * 2.0);
        v_kg_rain := GREATEST(0, v_regional_rain * 0.95 + (random() - 0.5) * 2.0);
        v_pd_rain := GREATEST(0, v_regional_rain * 1.05 + (random() - 0.5) * 2.0);
        v_hg_rain := GREATEST(0, v_regional_rain * 0.90 + (random() - 0.5) * 2.0);

        -- Catchment response: smoothed accumulator feeding inflow, then inflow relaxes toward target
        v_recent_rain := v_recent_rain * 0.90 + v_regional_rain * 0.10;
        v_target_inflow := v_if_baseline + v_recent_rain * 3.2;
        v_inflow := v_inflow + 0.08 * (v_target_inflow - v_inflow) + (random() - 0.5) * 1.5;
        v_inflow := GREATEST(10, LEAST(300, v_inflow));

        -- Water level: integrate net flow (inflow vs. baseline outflow) scaled by reservoir capacity
        v_net_flow := v_inflow - v_if_baseline;  -- baseline outflow approximated as if_baseline (steady operation)
        v_water_level := v_water_level + (v_net_flow * v_step_seconds / v_reservoir_capacity) * 100;
        v_water_level := GREATEST(22, LEAST(93, v_water_level));

        -- Downstream level: responds to the same regional rain with its own lag, stays in a calmer band
        v_downstream_level := v_downstream_level + 0.05 * ((30 + v_recent_rain * 1.8) - v_downstream_level)
                               + (random() - 0.5) * 1.0;
        v_downstream_level := GREATEST(15, LEAST(92, v_downstream_level));

        -- Inserts
        INSERT INTO water_level_readings (dam_id, reading_time, water_level_pct)
        VALUES (v_dam_id, v_time, ROUND(v_water_level::numeric, 2))
        ON CONFLICT (dam_id, reading_time) DO NOTHING;

        INSERT INTO inflow_readings (dam_id, reading_time, inflow_rate_m3s)
        VALUES (v_dam_id, v_time, ROUND(v_inflow::numeric, 2))
        ON CONFLICT (dam_id, reading_time) DO NOTHING;

        INSERT INTO downstream_level_readings (dam_id, reading_time, downstream_level_pct)
        VALUES (v_dam_id, v_time, ROUND(v_downstream_level::numeric, 2))
        ON CONFLICT (dam_id, reading_time) DO NOTHING;

        INSERT INTO rainfall_readings (location_id, reading_time, rainfall_mm_hr) VALUES
            (v_loc_ne, v_time, ROUND(v_ne_rain::numeric, 2)),
            (v_loc_ky, v_time, ROUND(v_ky_rain::numeric, 2)),
            (v_loc_kg, v_time, ROUND(v_kg_rain::numeric, 2)),
            (v_loc_pd, v_time, ROUND(v_pd_rain::numeric, 2)),
            (v_loc_hg, v_time, ROUND(v_hg_rain::numeric, 2))
        ON CONFLICT (location_id, reading_time) DO NOTHING;

        v_time := v_time + v_step;

    END LOOP;

    RAISE NOTICE 'Seed complete: readings inserted from % to % at % intervals.', v_start_time, v_end_time, v_step;
END $$;

-- ============================================================
-- Quick sanity checks after running
-- ============================================================
-- SELECT count(*), min(reading_time), max(reading_time) FROM water_level_readings;
-- SELECT min(water_level_pct), max(water_level_pct), avg(water_level_pct) FROM water_level_readings;
-- SELECT count(*) FROM rainfall_readings;
-- SELECT location_id, max(rainfall_mm_hr) FROM rainfall_readings GROUP BY location_id;
