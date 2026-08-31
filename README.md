# FloodGuard

### Dam Management & Early-Warning Decision Support System

FloodGuard is a reservoir monitoring and flood-risk decision-support system designed to assist dam operators in observing changing reservoir conditions and responding to potentially hazardous situations.

This repository contains the **E22 team's implementation of the PostgreSQL database system and the web-based frontend dashboard** for the FloodGuard project.

The database provides the persistent data model for reservoir, rainfall, inflow, downstream and system-status information, while the frontend provides the operator-facing interface for monitoring, analysis and visualization.

> **Project scope:** The database and frontend are the primary deliverables of this repository. A separate backend and simulation environment was developed by the team for integration testing and demonstration.

---

## Contents

```text
.
├── code/
│   ├── database/       PostgreSQL schema, seed data and ERD
│   └── frontend/       Next.js web application
│
├── docs/               Project documentation
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Architecture

```text
                         FloodGuard
                             |
             +---------------+---------------+
             |                               |
          Frontend                         Database
          (Next.js)                      (PostgreSQL)
             |                               |
             +---------------+---------------+
                             |
                       Application API
                             |
                    Development / Testing
                             |
             +---------------+---------------+
             |                               |
          Backend                        Simulator
        (separate)                       (separate)
```

The backend processor and telemetry simulator exist primarily to provide data and processing during development and demonstration. They are not the primary deliverables of this repository.

---

## Database

The database is implemented in PostgreSQL.

It contains the persistent model used by FloodGuard, including:

```text
Configuration
    dams
    engineers
    rainfall_locations

Telemetry
    water_level_readings
    rainfall_readings
    inflow_readings
    downstream_level_readings

Processed data
    calculated_metrics
    threshold_calculations
    risk_status

Prediction data
    prediction_runs
    predicted_values
    graph_crossing_results

Operational data
    release_recommendations
    deescalation_tracking
```

The schema uses foreign-key constraints, uniqueness constraints and time-oriented indexes for telemetry queries.

The database design and ER diagram are available under:

```text
code/database/
```

---

## Frontend

The frontend is a Next.js application providing the operator interface.

```text
Dashboard
|
├── Overview
├── Live Monitoring
├── Early Warning
├── Analysis
├── Historical Analysis
├── Trends & Prediction
└── Logs
```

Application API routes are located under:

```text
code/frontend/src/app/api/
```

Current API areas include:

```text
auth
dams
alerts
history
raw
processed
```

---

## Development

### Requirements

```text
Docker
Docker Compose
Git
```

### Clone

```sh
git clone https://github.com/cepdnaclk/e22-co2060-floodguard.git
cd e22-co2060-floodguard
```

### Configuration

```sh
cp .env.example .env
```

Edit `.env` if required.

### Start

```sh
docker compose up -d --build
```

The frontend is served on:

```text
http://localhost:3000
```

To stop the environment:

```sh
docker compose down
```

---

## Testing and Demonstration

The FloodGuard frontend and database require changing telemetry and processed data to demonstrate their operation. During development, the team therefore developed a separate backend processor and telemetry/weather simulation environment.

These supporting components are used to generate test readings and exercise the frontend/database integration under simulated operating conditions.

They are maintained outside this repository.

> Simulated data and demonstration predictions should not be interpreted as live field measurements or as a production dam-control system.

---

## Documentation

**Project Site:**
https://cepdnaclk.github.io/e22-co2060-floodguard/

The documentation contains the database design, system architecture, implementation details and supporting technical material.

---

## Team

**E22 Batch — Department of Computer Engineering, University of Peradeniya**

* **L. Sharmilan** — E/22/373 — [e22373@eng.pdn.ac.lk](mailto:e22373@eng.pdn.ac.lk)
* **F. R. Sujeevan** — E/22/382 — [e22382@eng.pdn.ac.lk](mailto:e22382@eng.pdn.ac.lk)
* **S. Kishonithan** — E/22/193 — [e22193@eng.pdn.ac.lk](mailto:e22193@eng.pdn.ac.lk)
* **R. Thilakshan** — E/22/397 — [e22397@eng.pdn.ac.lk](mailto:e22397@eng.pdn.ac.lk)

### Supervisor

**M.N.A. Fikry** — E/21/138 — [e21138@eng.pdn.ac.lk](mailto:e21138@eng.pdn.ac.lk)

---

## Links

* **Project Site:** https://cepdnaclk.github.io/e22-co2060-floodguard/
* **Full Documentation:** [docs/README.md](./docs/README.md)
* **CO2060 Projects Gallery:** https://projects.ce.pdn.ac.lk
* **Department of Computer Engineering:** http://www.ce.pdn.ac.lk/
* **University of Peradeniya:** https://eng.pdn.ac.lk/

---

*This project is automatically listed in the [CO2060 Projects Gallery](https://projects.ce.pdn.ac.lk). Project metadata is maintained in `docs/index.json`.*
