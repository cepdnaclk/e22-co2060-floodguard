FROM postgres:15-alpine

# The official PostgreSQL image will automatically execute any SQL files
# found in /docker-entrypoint-initdb.d/ during container initialization.
# They are executed in alphabetical order, so prefixing them in the project ensures
# schema runs before data seeding, though in this case they are named appropriately:
# 1. dam_management_schema.sql
# 2. sample_dam_and_rainfall_data.sql
# 3. sample_readings_seed.sql

COPY code/database/*.sql /docker-entrypoint-initdb.d/
