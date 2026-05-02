# FloodGuard Database

## Overview
This directory contains the database schema and initialization scripts for FloodGuard.
Stores historical data, sensor readings, and prediction results.

## Files
- **schema.sql**: Database structure definition (PostgreSQL)

## Database Setup

### Prerequisites
- PostgreSQL installed and running
- Create a database named 'reservoir'

### Initialize Database
```bash
psql -U [username] -d reservoir -f schema.sql
```

### Default Database Name
Default database name: `reservoir`

## Schema
Includes tables for:
- Sensor readings (water level, rainfall)
- Reservoir data
- Prediction results
- Risk level history
- User alerts and advisories