-- ============================================================
-- FloodGuard — Sample Reference Data
-- Dam: Victoria Dam, Sri Lanka (Mahaweli River, Teldeniya, Kandy District)
-- Catchment: Rainfall stations within the actual Victoria Reservoir
--            catchment area (Nuwara Eliya, Kandy, Matale districts)
--
-- SOURCING NOTE: Fields marked [SOURCED] come from public references
-- (Wikipedia, Mahaweli Authority of Sri Lanka, published dam technical
-- summaries) as of July 2026. Fields marked [ESTIMATE] have no public
-- source and are placeholder calibration values — consistent with this
-- project's existing convention that thresholds/weights/delays are
-- provisional until validated with real operational or hydrological data.
-- Do not present [ESTIMATE] values to end users as verified facts.
-- ============================================================

-- ============================================================
-- 1. Dam record
-- ============================================================
INSERT INTO dams (
    dam_name,
    location,
    latitude,                 -- [SOURCED] 07°14'29"N
    longitude,                -- [SOURCED] 80°47'05"E
    reservoir_capacity,       -- [SOURCED] gross storage capacity, 722,000,000 m^3
    downstream_capacity,      -- [ESTIMATE] safe downstream channel capacity — not publicly documented;
                              --            replace with real hydrological/engineering data when available
    max_gate_capacity,        -- [SOURCED] combined spillway discharge capacity, ~8,200 m^3/s (8 radial gates)
    if_baseline,              -- [ESTIMATE] derived, not directly sourced — see note below
    base_threshold,           -- system default
    threshold_floor           -- system default
) VALUES (
    'Victoria Dam',
    'Teldeniya, Kandy District, Central Province, Sri Lanka',
    7.2414,
    80.7847,
    722000000,
    600,
    8200,
    50,
    75.0,
    30.0
);

-- if_baseline derivation note (not stored in the DB, kept here for the team's reference):
-- Victoria's average annual generation is reported around 716-780 GWh across 3x70MW Francis
-- turbines at a design head of ~190m. Back-calculating an average through-plant flow:
--   Average power  = 716,000 MWh / 8,760 h ≈ 81.7 MW
--   Q = P / (rho * g * H * efficiency) = 81.7e6 / (9,810 * 190 * 0.9) ≈ 48.7 m^3/s
-- This gives a defensible order-of-magnitude estimate (~50 m^3/s) for baseline inflow, but it is
-- a derived approximation, not a measured baseline — replace with real gauged inflow data
-- (e.g. from the Mahaweli Authority's Water Management Secretariat) as soon as it's available.

-- ============================================================
-- 2. Rainfall stations (catchment)
-- ============================================================
-- Victoria's catchment area is 1,869 km^2, spanning Nuwara Eliya, Kandy, and
-- Matale districts, drained by the Mahaweli Ganga and its Hulu Ganga tributary
-- before reaching the reservoir. [SOURCED]
--
-- The five locations below are real towns within that catchment. Their weights
-- and delay_minutes are [ESTIMATE] engineering placeholders based on relative
-- distance/elevation from the reservoir, not a calibrated hydrological travel-
-- time study — flag these for validation before relying on them operationally.
-- Latitude/longitude are approximate town-center coordinates, not surveyed
-- gauge-station coordinates; update with exact station coordinates once
-- physical gauges are installed.

INSERT INTO rainfall_locations (
    location_name, description, latitude, longitude, elevation_m,
    district, province, nearest_dam_id, weight, delay_minutes,
    station_code, is_active, installed_at
) VALUES
(
    'Nuwara Eliya',
    'Upper-catchment headwater station in the central highlands; furthest from the reservoir, longest travel time.',
    6.9497, 80.7891, 1868,
    'Nuwara Eliya', 'Central Province',
    (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'),
    0.30, 90,
    'RF-NE-01', TRUE, CURRENT_DATE
),
(
    'Kandy',
    'Mid-catchment station near the historic city center, along the Mahaweli mainstem upstream of the reservoir.',
    7.2906, 80.6337, 500,
    'Kandy', 'Central Province',
    (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'),
    0.25, 60,
    'RF-KY-01', TRUE, CURRENT_DATE
),
(
    'Katugastota',
    'Station on the Mahaweli mainstem just north of Kandy, a historically used rainfall/streamflow reference point for this catchment.',
    7.3167, 80.6167, 470,
    'Kandy', 'Central Province',
    (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'),
    0.20, 50,
    'RF-KG-01', TRUE, CURRENT_DATE
),
(
    'Peradeniya',
    'Station near Peradeniya, upstream on the Mahaweli mainstem; a long-standing hydrological gauging reference point for this river.',
    7.2599, 80.5977, 460,
    'Kandy', 'Central Province',
    (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'),
    0.15, 70,
    'RF-PD-01', TRUE, CURRENT_DATE
),
(
    'Hunnasgiriya',
    'Near the Hulu Ganga tributary, close to its confluence with the Mahaweli just above the reservoir — shortest travel time to the dam.',
    7.3667, 80.8333, 900,
    'Kandy', 'Central Province',
    (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'),
    0.10, 20,
    'RF-HG-01', TRUE, CURRENT_DATE
);

-- Sanity check: weights for this dam's active stations should sum to 1.0
-- (0.30 + 0.25 + 0.20 + 0.15 + 0.10 = 1.00) — verify after any future edits:
--
-- SELECT SUM(weight) FROM rainfall_locations
-- WHERE nearest_dam_id = (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam')
--   AND is_active = TRUE;
