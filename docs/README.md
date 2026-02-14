---
layout: home
permalink: index.html
repository-name: e22-co2060-floodguard
title: FloodGuard – Reservoir Flood Early-Warning Decision Support System
---

# FloodGuard

A Software-Based Flood Early-Warning and Reservoir Decision Support System  
Focused on Short-Term Water-Level Prediction and Risk Classification

---

## Team
- e22373, L. Sharmilan, e22373@eng.pdn.ac.lk  
- e22382, F. R. Sujeevan, e22382@eng.pdn.ac.lk  
- e22193, S. Kishonithan, e22193@eng.pdn.ac.lk  
- e22397, R. Thilakshan, e22397@eng.pdn.ac.lk  

---

#### Table of Contents
1. Introduction
2. Solution Architecture
3. Software Designs
4. Testing and Validation
5. Conclusion
6. Links

---

## Introduction

Flooding in Sri Lanka, particularly in the Mahaweli River Basin, has resulted in significant social and economic damage. Existing reservoir management approaches primarily depend on monitoring current water levels. During extreme rainfall events, this reactive strategy often leads to delayed gate operations and downstream flooding.

FloodGuard proposes a predictive, software-based decision-support system that estimates short-term future reservoir water levels (30–60 minutes ahead) using rainfall trends and water-level rise rates. Instead of relying solely on real-time sensor readings, the system integrates:

- Rainfall trend analysis  
- Water-level rise-rate estimation  
- Time-lagged reservoir response modeling  
- Deterministic prediction functions  

This project is implemented entirely as a software system using simulated and historical data sources. It does not perform real-time dam control and does not interface with physical sensors. The architecture is designed to allow future integration of advanced machine learning models.

The objective is to demonstrate how predictive analytics can improve early flood warnings compared to traditional monitoring systems.

---

## Solution Architecture

FloodGuard follows a modular and scalable system architecture consisting of four major components:

### 1. Simulation Engine
Generates realistic rainfall and reservoir water-level data based on:
- Historical Sri Lankan rainfall characteristics
- Satellite rainfall references (e.g., GPM)
- Reservoir operational behavior patterns
- Catchment time-delay modeling

### 2. Prediction Engine (Rule-Based)
Implements a deterministic trend-based extrapolation model:

- Computes water-level rise rate
- Incorporates rainfall influence coefficient
- Predicts short-term future water levels

This replaces machine learning in the current implementation while maintaining architectural compatibility for future ML integration.

### 3. Risk Classification Module
Classifies predicted water levels into:

- SAFE  
- WATCH  
- DANGER  

Thresholds are configurable and reflect reservoir capacity levels.

### 4. Frontend Dashboard
Provides visualization of:
- Rainfall trends
- Current water levels
- Predicted future levels
- Flood risk status

The system is implemented using a backend API architecture and a responsive web dashboard.

---

## Software Designs

### 1. Data Simulation Model

Rainfall Simulation:
- Gradual increase
- Peak intensity period
- Decline phase
- Realistic intensity ranges (0–20+ mm)

Reservoir Simulation:
- Progressive water-level response
- Catchment delay mechanism
- Capacity percentage modeling
- No abrupt unrealistic jumps

### 2. Prediction Model

Let:

- W(t) = current water level  
- ΔW = rise rate  
- R_avg = recent rainfall average  
- h = prediction horizon  

Future water level:

W(t + h) = W(t) + (ΔW × h) + (k × R_avg)

Where k is a rainfall influence coefficient.

This model ensures:
- Explainability
- Deterministic behavior
- Engineering interpretability
- Extendability for future ML replacement

### 3. Backend API Design

The backend exposes endpoints for:

- Retrieving simulated rainfall data
- Retrieving reservoir data
- Running prediction
- Fetching risk classification
- Providing dashboard-ready outputs

### 4. Scalability Considerations

The architecture allows:

- Replacement of deterministic prediction with ML-based regression
- Integration of real sensor streams
- Cloud deployment
- Multi-reservoir extension

---

## Testing and Validation

The system is validated using simulated flood scenarios representing:

- Dry conditions
- Moderate rainfall events
- Heavy rainfall bursts
- Sustained rainfall periods

Validation Metrics:

- Mean Absolute Error (MAE)
- Prediction stability
- Risk classification correctness

Comparative testing is performed between:
- Current water-level-only monitoring
- Trend-based predictive approach

Results demonstrate earlier warning generation compared to traditional reactive monitoring.

---

## Conclusion

FloodGuard demonstrates a structured, scalable, and industry-aligned approach to flood early-warning decision support.

The system successfully:

- Predicts short-term future water levels  
- Classifies flood risk levels  
- Simulates realistic environmental conditions  
- Provides visual decision-support outputs  

Although machine learning integration is reserved for future enhancement, the current deterministic model ensures reliability, explainability, and academic validity.

The architecture is intentionally designed to allow seamless integration of advanced predictive models and real-time sensor networks in future research phases.

---

## Links

- Project Repository: https://github.com/cepdnaclk/e22-co2060-floodguard
- Project Page: https://cepdnaclk.github.io/e22-co2060-floodguard
- Department of Computer Engineering: http://www.ce.pdn.ac.lk/
- University of Peradeniya: https://eng.pdn.ac.lk/
