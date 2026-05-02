# FloodGuard Backend

## Overview
This directory contains the backend processing engine for the FloodGuard system.
Handles data ingestion, prediction logic, and API endpoints.

## Structure
- **processor_engine/**: Core prediction and data processing module

## Features
- Rule-based water level prediction using trend extrapolation
- Simulated sensor data generation
- Risk categorization (Safe, Watch, Danger)
- API endpoint integration with frontend

## Components
- Prediction Engine: Processes rainfall and reservoir data
- Data Simulator: Generates realistic hydrological data
- API Service: Provides endpoints for frontend dashboard