---
layout: home
permalink: index.html
repository-name: e22-co2060-floodguard
title: FloodGuard – Reservoir Flood Early-Warning Decision Support System
---

# FloodGuard

## Reservoir Monitoring & Early-Warning Decision Support System

FloodGuard is a software system for monitoring reservoir conditions and supporting dam operators in identifying potentially hazardous situations.

The system combines reservoir telemetry, rainfall observations, inflow measurements, downstream conditions and derived operational metrics into a centralized data platform and operator-facing dashboard.

This repository contains the **E22 team's implementation of the database and frontend layers** of the FloodGuard project.

The backend processing engine and telemetry simulator used during development are supporting components maintained separately. They provide the data and processing environment required to test and demonstrate the database and frontend implementation.

---

# 1. Project Scope

The FloodGuard project is organized around several cooperating software components.

For this E22 implementation, the primary deliverables are:

```text
┌──────────────────────────────────────────────┐
│              E22 IMPLEMENTATION              │
├──────────────────────┬───────────────────────┤
│                      │                       │
│      PostgreSQL      │       Next.js         │
│       Database       │       Frontend        │
│                      │                       │
└──────────────────────┴───────────────────────┘
```

The database provides persistent storage for configuration, telemetry, processed information, predictions and operational records.

The frontend provides the operator-facing interface for viewing system state, telemetry, warnings, historical data, trends and other operational information.

During development, additional components were implemented to exercise these two deliverables:

```text
┌────────────────────── Development ──────────────────────┐
│                                                         │
│   Backend Processor              Telemetry Simulator    │
│          │                               │              │
│          └───────────────┬───────────────┘              │
│                          │                              │
│                          ▼                              │
│                    PostgreSQL                           │
│                          │                              │
│                          ▼                              │
│                    Next.js UI                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

These supporting components are intended for **integration testing and demonstration** and should not be confused with the primary frontend and database deliverables.

---

# 2. System Architecture

At a high level, FloodGuard follows a data-oriented architecture:

```text
                       DATA SOURCES
                            │
              ┌─────────────┴─────────────┐
              │                           │
         Field Sensors              Development
              │                    Simulation Tools
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
                    PostgreSQL Database
                            │
                 ┌──────────┴──────────┐
                 │                     │
             Raw Data             Derived Data
                 │                     │
                 └──────────┬──────────┘
                            │
                            ▼
                     Application API
                            │
                            ▼
                     Next.js Frontend
                            │
                            ▼
                    Operator Dashboard
```

The database is the central persistence layer.

The frontend does not represent an independent copy of system data. It obtains application data through its API layer and presents that information through the dashboard.

The development backend and simulator can populate and process the database so that the frontend can be exercised without requiring a live field deployment.

---

# 3. Repository Layout

The repository is organized around the two primary implementation areas:

```text
.
├── code/
│   ├── database/
│   │   ├── dam_management_schema.sql
│   │   ├── sample_dam_and_rainfall_data.sql
│   │   ├── sample_readings_seed.sql
│   │   ├── ER-Diagram.pgerd
│   │   ├── ER-Diagram.pgerd.png
│   │   └── Dockerfile
│   │
│   └── frontend/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── lib/
│       ├── public/
│       ├── package.json
│       ├── package-lock.json
│       └── Dockerfile
│
├── docs/
│   ├── README.md
│   ├── images/
│   └── ...
│
├── docker-compose.yml
├── .env.example
├── requirements.txt
└── README.md
```

The `docs/` directory contains the documentation used to generate this project site.

The root `README.md` provides the repository-level overview and development entry point.

---

# 4. Database

## 4.1 Overview

The database is implemented using PostgreSQL.

It acts as the persistent data store for FloodGuard and is designed to separate relatively static configuration from continuously changing telemetry and derived system information.

The schema can be broadly divided into five groups:

```text
Configuration
    │
    ├── dams
    ├── engineers
    └── rainfall_locations

Telemetry
    │
    ├── water_level_readings
    ├── rainfall_readings
    ├── inflow_readings
    └── downstream_level_readings

Calculated Data
    │
    ├── calculated_metrics
    └── threshold_calculations

Prediction Data
    │
    ├── prediction_runs
    ├── predicted_values
    └── graph_crossing_results

Operational Data
    │
    ├── risk_status
    ├── release_recommendations
    └── deescalation_tracking
```

---

## 4.2 Entity Relationship Model

The database design is represented by the ER diagram stored in:

```text
code/database/ER-Diagram.pgerd
code/database/ER-Diagram.pgerd.png
```

The model establishes relationships between dams, rainfall stations, telemetry readings and derived operational information.

The general relationship is:

```text
                         dams
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
 water_level_readings  inflow_readings  downstream_level_readings
          │
          │
          └──────────────────────┐
                                 │
rainfall_locations               │
          │                      │
          ▼                      ▼
rainfall_readings        calculated_metrics
                                 │
                                 ▼
                      threshold_calculations
                                 │
                                 ▼
                           risk_status
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
          release_recommendations     deescalation_tracking
```

Prediction-related tables provide a separate path for forecast runs and their results.

---

## 4.3 Configuration Tables

### `dams`

Stores dam-level configuration and physical operating limits.

Important attributes include:

* dam identity and location
* geographic coordinates
* reservoir capacity
* downstream capacity
* gate capacity
* baseline inflow
* base safety threshold
* threshold floor

### `engineers`

Stores application users and operator-related information.

The table includes:

* engineer identity
* name
* role
* contact information
* assigned dam
* password hash

### `rainfall_locations`

Represents rainfall measurement stations associated with the catchment.

Station configuration includes:

* station identity
* location
* coordinates
* weighting coefficient
* rainfall delay
* station code
* active/inactive state

---

# 5. Telemetry Model

FloodGuard stores sensor measurements as timestamped records.

## `water_level_readings`

Stores reservoir water-level observations.

```text
reading_id
dam_id
reading_time
water_level_pct
```

The combination of dam and timestamp is unique.

---

## `rainfall_readings`

Stores rainfall observations associated with meteorological stations.

```text
reading_id
location_id
reading_time
rainfall_mm_hr
```

The combination of station and timestamp is unique.

---

## `inflow_readings`

Stores upstream inflow measurements.

```text
reading_id
dam_id
reading_time
inflow_rate_m3s
```

---

## `downstream_level_readings`

Stores downstream channel-level measurements.

```text
reading_id
dam_id
reading_time
downstream_level_pct
```

---

# 6. Derived and Prediction Data

The database also contains relations for information calculated from telemetry.

## `calculated_metrics`

Stores intermediate hydrological metrics such as:

* short-term rise rate
* long-term rise rate
* acceleration
* rolling average
* deviation score
* rise-rate severity band

---

## `threshold_calculations`

Stores the adaptive safety threshold and the individual adjustment factors contributing to it.

```text
rr_adj
rf_adj
if_adj
dl_adj
adaptive_threshold
floor_triggered
ceiling_triggered
```

---

## `prediction_runs`

Represents an individual prediction/calculation execution.

A run records:

* dam
* execution time
* input data window
* prediction method
* execution status

---

## `predicted_values`

Stores forecast values associated with a prediction run.

The stored information can include:

* predicted water level
* predicted rainfall/runoff
* predicted inflow
* predicted downstream level
* predicted rise rate
* predicted acceleration
* predicted adaptive threshold
* prediction gap

---

## `graph_crossing_results`

Stores the summarized result of predicted threshold-crossing analysis.

Important fields include:

* estimated Time-To-Crossing
* minimum predicted gap
* gap trend
* resulting risk status

---

# 7. Operational State

## `risk_status`

Represents the evaluated operational state of a dam.

FloodGuard uses four status levels:

```text
GREEN
YELLOW
ORANGE
RED
```

A status record can contain:

* current state
* timestamp
* Time-To-Crossing
* trigger reason
* previous state

The frontend uses this information to present the current operational condition to the operator.

---

## `release_recommendations`

Stores release recommendations generated for elevated-risk situations.

The stored information includes:

* release strategy
* rise rate used
* desired discharge
* downstream available capacity
* final release rate
* gate opening recommendation
* conflict warning
* estimated duration

These values are presented as recommendations for operator decision support.

---

## `deescalation_tracking`

Stores information required to prevent rapid oscillation between risk states.

The table tracks:

* when an improving condition began
* elapsed improvement time
* required duration
* transition state
* eligibility for downgrade

---

# 8. Database Integrity

The database uses standard relational integrity mechanisms to maintain consistent data.

These include:

```text
Primary Keys
Foreign Keys
Unique Constraints
Enumerated / Domain Types
Indexes
```

Foreign keys maintain relationships between configuration, telemetry and derived data.

Timestamp-based uniqueness constraints prevent duplicate telemetry observations for the same source and time.

Indexes are provided for common chronological telemetry access patterns.

The complete schema is available at:

```text
code/database/dam_management_schema.sql
```

---

# 9. Frontend

## 9.1 Overview

The frontend is implemented using **Next.js**.

It provides the operator-facing web interface for interacting with FloodGuard data.

The application is organized around several operational views:

```text
Dashboard
│
├── Overview
├── Live Monitoring
├── Early Warning
├── Analysis
├── Historical Analysis
├── Trends & Prediction
└── Logs
```

The frontend is designed to expose the information stored in the database without requiring operators to interact directly with database structures.

---

# 10. Frontend Architecture

The frontend follows the application structure provided by Next.js.

At a simplified level:

```text
                         Browser
                            │
                            ▼
                     Next.js Application
                            │
             ┌──────────────┴──────────────┐
             │                             │
        UI Components                  API Routes
             │                             │
             │                             ▼
             │                         Database
             │
             └──────────────┬──────────────┘
                            │
                            ▼
                     Dashboard Views
```

Reusable interface components are maintained under:

```text
code/frontend/src/components/
```

Application pages and API routes are maintained under:

```text
code/frontend/src/app/
```

---

# 11. Dashboard Views

## Overview

Provides a high-level view of the current FloodGuard system state.

It is intended to give the operator an immediate understanding of the current condition without requiring navigation through individual datasets.

---

## Live Monitoring

Provides current telemetry and operational measurements.

The view is intended for observing changing conditions such as:

* reservoir level
* rainfall
* inflow
* downstream level
* current risk state

---

## Early Warning

Provides warning-oriented information derived from the system state.

The interface exposes risk conditions and relevant supporting information so that operators can identify situations requiring attention.

---

## Analysis

Provides access to calculated and derived system information.

This allows operational data to be examined beyond the immediate dashboard state.

---

## Historical Analysis

Provides access to historical telemetry and system records.

Historical information is useful for examining previous reservoir behaviour and comparing changing conditions over time.

---

## Trends & Prediction

Provides visualization of trend and prediction-related data stored in the database.

The page can display predicted values and related indicators produced by the processing layer.

---

## Logs

Provides access to operational and system records useful for reviewing system activity and historical events.

---

# 12. Application API

The frontend contains application API routes under:

```text
code/frontend/src/app/api/
```

The current API structure includes areas such as:

```text
api/
├── auth/
├── dams/
├── alerts/
├── history/
├── raw/
└── processed/
```

The API layer provides the boundary between the frontend interface and application data.

Conceptually:

```text
Frontend Component
        │
        ▼
    API Route
        │
        ▼
    Data Access
        │
        ▼
   PostgreSQL
```

This separation allows the frontend interface to remain independent from the underlying database queries and storage implementation.

---

# 13. Data Flow

A typical development/demo data path is:

```text
                    Simulator
                        │
                        ▼
                Raw Telemetry
                        │
                        ▼
                   PostgreSQL
                        │
                        ▼
              Backend Processor
                        │
                        ▼
              Derived / Prediction
                     Data
                        │
                        ▼
                   PostgreSQL
                        │
                        ▼
                  Next.js API
                        │
                        ▼
                Frontend Dashboard
```

In an actual deployment, the simulator would be replaced by appropriate field telemetry sources and the development processor would be replaced or complemented by the production processing infrastructure defined by the overall FloodGuard system.

---

# 14. Prediction and Risk Calculation Reference

The FloodGuard concept uses a predictive model rather than relying exclusively on a fixed reservoir-level threshold.

The reference processing model considers:

```text
Reservoir water level
Rainfall
Upstream inflow
Downstream level
Rise rate
Rise-rate acceleration
Historical trends
```

These inputs can be used to derive:

```text
Rise-rate severity
Adaptive safety threshold
Predicted reservoir level
Threshold crossing
Time-To-Crossing
Risk status
Release recommendation
```

The database is designed to store the outputs of this processing independently from the frontend.

This separation is important because the frontend consumes **results**, rather than implementing the hydrological processing itself.

---

# 15. Adaptive Threshold Model

The reference calculation uses an adaptive threshold rather than a single immutable operating value.

Conceptually:

```text
                    Base Threshold
                           │
             ┌─────────────┼─────────────┐
             │             │             │
         Rise Rate       Rainfall       Inflow
             │             │             │
             └─────────────┼─────────────┘
                           │
                    Downstream Level
                           │
                           ▼
                  Adaptive Threshold
                           │
                     [Floor, Base]
```

The threshold is adjusted according to the prevailing conditions and constrained within configured limits.

The resulting threshold is stored in:

```text
threshold_calculations
```

---

# 16. Prediction

The reference implementation includes a divided-difference based extrapolation method.

Historical observations are used to estimate future values over predefined forecast horizons.

The prediction subsystem records:

```text
Prediction Run
      │
      ├── Input window
      ├── Method
      ├── Execution status
      │
      └── Predicted values
              │
              ├── +15 min
              ├── +30 min
              ├── +45 min
              ├── +60 min
              ├── +90 min
              └── +120 min
```

The resulting values are stored in the prediction-related database tables and can subsequently be consumed by the frontend.

---

# 17. Threshold Crossing

A predicted crossing is determined by comparing the predicted reservoir level with the predicted adaptive threshold.

Conceptually:

```text
Gap = Predicted Threshold - Predicted Level
```

A non-positive gap indicates that the predicted level has reached or exceeded the predicted threshold.

The earliest forecast horizon satisfying this condition provides the estimated:

```text
Time-To-Crossing (TTC)
```

The crossing result is stored separately so that the frontend can access a concise representation of the prediction outcome.

---

# 18. Risk Status

The reference system classifies conditions into four operational states:

| State    | Meaning                                           |
| -------- | ------------------------------------------------- |
| `GREEN`  | Normal operating condition                        |
| `YELLOW` | Increased attention required                      |
| `ORANGE` | Significant risk; operator action may be required |
| `RED`    | Critical condition requiring immediate attention  |

Risk status is derived from current and predicted conditions rather than solely from the instantaneous reservoir level.

The evaluated state is stored in:

```text
risk_status
```

and exposed to the frontend through the application API.

---

# 19. Release Recommendation

For elevated-risk conditions, the reference processing layer can calculate a recommended release rate.

The calculation considers:

```text
Current inflow
Reservoir condition
Adaptive threshold
Reservoir capacity
Downstream available capacity
Maximum gate capacity
```

The resulting recommendation is stored in:

```text
release_recommendations
```

The frontend presents these values as **decision-support information**.

The system does not represent an autonomous physical gate-control mechanism.

---

# 20. Testing and Simulation

The frontend and database require changing data to demonstrate their behaviour.

A development simulation environment was therefore implemented to provide controlled telemetry.

The simulator can reproduce several representative environmental scenarios:

```text
Drought / Dry Season
South-West Monsoon
North-East Monsoon Storm
Inter-Monsoon Thunderstorm
Tropical Cyclone Surge
```

These scenarios are intended to exercise different parts of the data and risk pipeline.

For example:

```text
Normal conditions
      │
      ▼
Increasing rainfall
      │
      ▼
Increasing inflow
      │
      ▼
Increasing reservoir level
      │
      ▼
Higher calculated risk
      │
      ▼
Warning / recommendation
```

The simulator is a **development and testing utility**.

It does not represent a real sensor network and should not be interpreted as a production telemetry source.

---

# 21. Development Environment

The project uses Docker to simplify local development.

The primary repository components are:

```text
PostgreSQL
Next.js Frontend
```

The backend processor and simulator are maintained separately.

A complete demonstration environment therefore consists of two repositories:

```text
e22-co2060-floodguard
│
├── database
└── frontend

backend / simulation repository
│
├── backend
└── simulation
```

The repositories remain independently version-controlled while communicating through the application/database interfaces.

---

# 22. Local Development

Clone the project:

```bash
git clone https://github.com/cepdnaclk/e22-co2060-floodguard.git
cd e22-co2060-floodguard
```

Create the local environment file:

```bash
cp .env.example .env
```

Start the database and frontend environment:

```bash
docker compose up -d --build
```

The frontend is available at:

```text
http://localhost:3000
```

Stop the environment with:

```bash
docker compose down
```

Detailed service-specific configuration should be taken from the corresponding project files rather than duplicated here.

---

# 23. Development and Demonstration Boundary

The distinction between implementation and demonstration is important when evaluating this repository.

```text
PRIMARY E22 IMPLEMENTATION
───────────────────────────

PostgreSQL Database
    └── Schema
    └── Data model
    └── Constraints
    └── Indexes
    └── Seed data

Next.js Frontend
    └── Dashboard
    └── Monitoring
    └── Warnings
    └── Analysis
    └── Historical data
    └── Prediction views
    └── Logs
    └── Application API


SUPPORTING DEVELOPMENT ENVIRONMENT
──────────────────────────────────

Backend Processor
    └── Test/development processing

Telemetry Simulator
    └── Controlled test data
    └── Scenario generation
```

The supporting components exist so that the primary implementation can be developed, exercised and demonstrated without requiring a deployed field infrastructure.

---

# 24. Limitations

This repository represents an academic software project and development environment.

In particular:

* simulated telemetry is not live field data;
* prediction results produced by the reference processing environment are not operational forecasts;
* release recommendations are decision-support outputs, not autonomous control commands;
* production deployment would require validated sensor infrastructure, processing models, operational procedures and appropriate safety validation.

The system should therefore be treated as a software engineering and decision-support prototype rather than a certified dam-control system.

---

# 25. Further Development

Possible future development areas include:

```text
Authentication improvements
Manual simulator controls
Additional telemetry sources
Production sensor integration
Model validation
Improved historical analytics
Deployment infrastructure
Operational audit facilities
```

The separation between frontend, database and processing layers allows these components to evolve independently.

---

# 26. Project Resources

### Repository

https://github.com/cepdnaclk/e22-co2060-floodguard

### Project Site

https://cepdnaclk.github.io/e22-co2060-floodguard/

### CO2060 Projects Gallery

https://projects.ce.pdn.ac.lk

### Department of Computer Engineering

http://www.ce.pdn.ac.lk/

### University of Peradeniya

https://eng.pdn.ac.lk/

---

# 27. Team

**E22 Batch — Department of Computer Engineering**

| Name           | Registration | Email                                               |
| -------------- | ------------ | --------------------------------------------------- |
| L. Sharmilan   | E/22/373     | [e22373@eng.pdn.ac.lk](mailto:e22373@eng.pdn.ac.lk) |
| F. R. Sujeevan | E/22/382     | [e22382@eng.pdn.ac.lk](mailto:e22382@eng.pdn.ac.lk) |
| S. Kishonithan | E/22/193     | [e22193@eng.pdn.ac.lk](mailto:e22193@eng.pdn.ac.lk) |
| R. Thilakshan  | E/22/397     | [e22397@eng.pdn.ac.lk](mailto:e22397@eng.pdn.ac.lk) |

### Supervisor

**M.N.A. Fikry** — E/21/138 — [e21138@eng.pdn.ac.lk](mailto:e21138@eng.pdn.ac.lk)

---

# 28. Project Context

FloodGuard is developed as part of the **CO2060 Software Systems Design Project** at the Department of Computer Engineering, Faculty of Engineering, University of Peradeniya.

Project metadata is maintained in:

```text
docs/index.json
```

The project is automatically listed in the CO2060 project collection.
