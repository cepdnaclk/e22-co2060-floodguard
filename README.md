# Machine Learning Assisted Flood Early-Warning System for the Mahaweli River Basin

[cite_start]Flooding in the Mahaweli River Basin causes severe social and economic damage[cite: 3]. [cite_start]One of the major reasons identified is the lack of early prediction mechanisms that consider rainfall trends and reservoir inflow rates[cite: 4]. [cite_start]Current systems mainly monitor the current water level of dams, which is insufficient for timely decision-making[cite: 5].

[cite_start]**FloodGuard** is a decision-support application developed as a second-year undergraduate project[cite: 6, 18]. [cite_start]It aims to predict short-term future water levels and flood risk using rainfall data and reservoir water-level trends[cite: 6].

---

## 🚀 Project Overview
[cite_start]This project focuses on software development to provide a scalable and industry-ready system architecture[cite: 16, 18]. 

### Key Objectives
* [cite_start]**Predictive Monitoring**: Forecast short-term future water levels (30-60 minutes ahead)[cite: 13].
* [cite_start]**Risk Categorization**: Generate automated flood risk levels categorized as Safe, Watch, or Danger[cite: 14].
* [cite_start]**Deterministic Logic**: While the system is designed to eventually integrate Machine Learning, this version utilizes a rule-based prediction engine that calculates water-level rise rates using trend-based extrapolation[cite: 25, 30, 97].
* [cite_start]**High-Fidelity Simulation**: In the absence of live public sensor access in Sri Lanka, the system uses simulated data that closely follows realistic environmental and hydrological behavior[cite: 59, 61].

---

## 🛠️ System Architecture
[cite_start]The system consists of four main components[cite: 22]:
1. [cite_start]**Frontend Dashboard**: For real-time visualization[cite: 23].
2. [cite_start]**Backend APIs**: For data processing[cite: 24].
3. [cite_start]**Rule-Based Prediction Engine**: Handling short-term trend extrapolation[cite: 25].
4. [cite_start]**ML Enhancement Module**: A modular component designed for future integration of advanced models[cite: 26, 31].

---

## 📊 Data & Simulation Strategy
[cite_start]To ensure academic and practical justification, our simulated data is grounded in official sources[cite: 87, 90]:
* [cite_start]**Rainfall Patterns**: Derived from historical characteristics in Sri Lanka's central highlands and NASA GPM satellite estimates[cite: 65, 68].
* [cite_start]**Reservoir Behavior**: Informed by historical operation reports from the Irrigation Department and the Mahaweli Authority of Sri Lanka[cite: 75, 76].
* [cite_start]**Natural Lag**: Includes a time-delay mechanism to represent the lag between upstream rainfall and reservoir inflow[cite: 78].

---

## 📖 Documentation
Detailed technical documentation regarding the methodology, data sources, and system design can be found in the `docs/` folder.

* **Project Site**: [https://cepdnaclk.github.io/e22-co2060-FloodGuard/](https://cepdnaclk.github.io/e22-co2060-FloodGuard/)
* [cite_start]**Methodology & Data Sources**: [See /docs/README.md](./docs/README.md) [cite: 27, 57]

---

## 👥 The Team (E22 Batch)
* **L. Sharmilan** - E/22/373 - [email@eng.pdn.ac.lk]
* **F. R. Sujeevan** - E/22/382 - [email@eng.pdn.ac.lk]
* **S. Kishonithan** - E/22/193 - [email@eng.pdn.ac.lk]
* **R. Thilakshan** - E/22/397 - [email@eng.pdn.ac.lk]

**Supervisors:** [Insert Supervisor Names Here]

---

### Special Configurations
This project is automatically added to the [CO2060 Projects Gallery](https://projects.ce.pdn.ac.lk). Detailed project parameters are maintained in `docs/index.json`.