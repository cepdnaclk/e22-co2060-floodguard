# Machine Learning Assisted Flood Early-Warning System for the Mahaweli River Basin

Flooding in the Mahaweli River Basin causes severe social and economic damage. One of the major reasons identified is the lack of early prediction mechanisms that consider rainfall trends and reservoir inflow rates. Current systems mainly monitor the current water level of dams, which is insufficient for timely decision-making.

**FloodGuard** is a decision-support application developed as a second-year undergraduate project. It aims to predict short-term future water levels and flood risk using rainfall data and reservoir water-level trends.

---

## 🚀 Project Overview
This project focuses on software development to provide a scalable and industry-ready system architecture. 

### Key Objectives
* **Predictive Monitoring**: Forecast short-term future water levels (30-60 minutes ahead).
* **Risk Categorization**: Generate automated flood risk levels categorized as Safe, Watch, or Danger.
* **Deterministic Logic**: While the system is designed to eventually integrate Machine Learning, this version utilizes a rule-based prediction engine that calculates water-level rise rates using trend-based extrapolation.
* **High-Fidelity Simulation**: In the absence of live public sensor access in Sri Lanka, the system uses simulated data that closely follows realistic environmental and hydrological behavior.

---

## 🛠️ System Architecture
The system consists of four main components:
1. **Frontend Dashboard**: For real-time visualization.
2. **Backend APIs**: For data processing.
3. **Rule-Based Prediction Engine**: Handling short-term trend extrapolation.
4. **ML Enhancement Module**: A modular component designed for future integration of advanced models.

---

## 📊 Data & Simulation Strategy
To ensure academic and practical justification, our simulated data is grounded in official sources:
* **Rainfall Patterns**: Derived from historical characteristics in Sri Lanka's central highlands and NASA GPM satellite estimates.
* **Reservoir Behavior**: Informed by historical operation reports from the Irrigation Department and the Mahaweli Authority of Sri Lanka.
* **Natural Lag**: Includes a time-delay mechanism to represent the lag between upstream rainfall and reservoir inflow.

---

## 📖 Documentation
Detailed technical documentation regarding the methodology, data sources, and system design can be found in the `docs/` folder.

* **Project Site**: [https://cepdnaclk.github.io/e22-co2060-FloodGuard/](https://cepdnaclk.github.io/e22-co2060-FloodGuard/)
* **Methodology & Data Sources**: [See /docs/README.md](./docs/README.md)

---

## 👥 The Team (E22 Batch)
* **L. Sharmilan** - E/22/373 - [e22373@eng.pdn.ac.lk]
* **F. R. Sujeevan** - E/22/382 - [e22382@eng.pdn.ac.lk]
* **S. Kishonithan** - E/22/193 - [e22193@eng.pdn.ac.lk]
* **R. Thilakshan** - E/22/397 - [e22397@eng.pdn.ac.lk]

**Supervisors: M.N.A. Fikry** - E/21/138 - [e21138@eng.pdn.ac.lk]

---

### Special Configurations
This project is automatically added to the [CO2060 Projects Gallery](https://projects.ce.pdn.ac.lk). Detailed project parameters are maintained in `docs/index.json`.