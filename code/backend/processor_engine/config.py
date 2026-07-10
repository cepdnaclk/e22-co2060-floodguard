"""
Configuration settings for the FloodGuard Processor Engine.
Constants are aligned with the project specification.
"""

# Time windows and horizons
SHORT_WINDOW_MINUTES = 15
LONG_WINDOW_MINUTES = 60
ROLLING_AVERAGE_WINDOW_MINUTES = 180  # 3 hours for rolling average rise rate RA(t)

# Prediction settings
PREDICTIONS_HORIZON_MINUTES = [15, 30, 45, 60, 90, 120]
ROLLING_HISTORY_WINDOW_HOURS = 6      # We use 3-6 hours of history to select extrapolation nodes

# Status severities
STATUS_SEVERITY = {
    "GREEN": 0,
    "YELLOW": 1,
    "ORANGE": 2,
    "RED": 3,
    "UNKNOWN": -1,
    "DATA_INSUFFICIENT": -1
}
