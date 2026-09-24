FROM postgres:15-alpine

# The official PostgreSQL image will automatically execute any SQL files
# found in /docker-entrypoint-initdb.d/ during container initialization.
# Files are executed in alphabetical order, so we prefix them to ensure
# correct execution sequence:
#   1. dam_management_schema.sql   — schema creation (tables, types, indexes)
#   2. sample_dam_and_rainfall_data.sql — reference data (dam config, rainfall stations)
#   3. seed_engineers.sql          — default engineer accounts
#
# NOTE: Time-series sensor data (water levels, inflow, rainfall readings)
# is NOT seeded here. It is populated at runtime by the FloodGuard
# Simulation Tool (code/simulation/db_simulator.py), which generates
# realistic scenario-driven readings and inserts them into the database.

COPY code/database/dam_management_schema.sql /docker-entrypoint-initdb.d/01_schema.sql
COPY code/database/sample_dam_and_rainfall_data.sql /docker-entrypoint-initdb.d/02_reference_data.sql
COPY code/database/seed_engineers.sql /docker-entrypoint-initdb.d/03_seed_engineers.sql
