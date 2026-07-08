# FloodGuard — Dam Management & Early-Warning System

**FloodGuard** is a real-time dam monitoring and predictive flood-risk management platform. It ingests sensor and weather data, computes hydrological risk indicators, determines a dam's current risk status, and recommends safe water-release actions to on-site engineers — before conditions become dangerous.

> 📖 For full technical detail — database schema, formula derivations, ERD, ML integration contract — see **[docs/README.md](./docs/README.md)** or the [project site](https://cepdnaclk.github.io/e22-co2060-floodguard/).

---

## What This System Does

The core idea: a fixed danger threshold is not enough. By the time water crosses a static line, the safe response window has often already closed. FloodGuard uses an **adaptive threshold** that moves dynamically based on four live inputs — rise rate, upstream rainfall, inflow rate, and downstream channel capacity.

The pipeline runs every minute:

1. Reads sensor data (water level, rainfall, inflow, downstream level)
2. Computes rise rate, acceleration, deviation score, and a risk-band classification
3. Calculates an adaptive safety threshold (floor: 30%, ceiling: 75%)
4. Assigns a risk status — 🟢 Green / 🟡 Yellow / 🟠 Orange / 🔴 Red
5. At Orange/Red: generates a gate-release recommendation (rate, opening %, estimated duration)
6. De-escalates only after sustained improvement (15 / 30 / 60 minutes, depending on transition)

---

## Completed

- **Database system** — Full PostgreSQL schema with 9 tables:
  - `dams` (static config), `engineers`, `sensor_readings`
  - `calculated_metrics`, `threshold_calculations`, `risk_status`
  - `release_recommendations`, `deescalation_tracking`, `alerts_log`, `simulation_config`
- **Prediction formula** — A deterministic reference algorithm covering rise rate (short & long term), acceleration, rolling average, deviation score, adaptive threshold calculation, and a 4-level risk classification with gate-release logic
- **Database–backend connection** — Direct database connection from the backend processor engine (no API layer between them)
- **Simulation engine** — Configurable scenario generator that writes realistic sensor data into the database, enabling full end-to-end testing without physical hardware; supports scenarios like monsoon spikes, sustained rises, downstream congestion, and recovery

---

## Upcoming

- **Frontend dashboard** — Engineer-facing UI for live status, charts, and release recommendations
- **Formula fine-tuning** — Calibrating rise-rate band thresholds and adjustment weights against realistic data
- **Simulator fine-tuning** — Improving realism of generated sensor sequences
- **Manual simulator controls** — Allow engineers to trigger specific scenarios on demand
- **API layer** — REST endpoints to connect the backend and database to the frontend

---

## The Team (E22 Batch)
* **L. Sharmilan** - E/22/373 - [e22373@eng.pdn.ac.lk]
* **F. R. Sujeevan** - E/22/382 - [e22382@eng.pdn.ac.lk]
* **S. Kishonithan** - E/22/193 - [e22193@eng.pdn.ac.lk]
* **R. Thilakshan** - E/22/397 - [e22397@eng.pdn.ac.lk]

**Supervisors: M.N.A. Fikry** - E/21/138 - [e21138@eng.pdn.ac.lk]

---

## Links

- **Project Site:** <https://cepdnaclk.github.io/e22-co2060-floodguard/>
- **Full Documentation:** [docs/README.md](./docs/README.md)
- **Department of Computer Engineering:** <http://www.ce.pdn.ac.lk/>
- **University of Peradeniya:** <https://eng.pdn.ac.lk/>

---

*This project is automatically listed in the [CO2060 Projects Gallery](https://projects.ce.pdn.ac.lk). Project metadata is maintained in `docs/index.json`.*
