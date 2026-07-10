"""
Configuration settings for the FloodGuard Processor Engine.
Constants are aligned with the project specification.
"""

# Time windows and horizons for Rise Rate calculations
SHORT_WINDOW_MINUTES = 15             # Represents the immediate reaction window
LONG_WINDOW_MINUTES = 60              # Represents the sustained rise rate over an hour
ROLLING_AVERAGE_WINDOW_MINUTES = 180  # 3 hours for rolling average rise rate RA(t) to track deviations

# Prediction settings for extrapolation
PREDICTIONS_HORIZON_MINUTES = [15, 30, 45, 60, 90, 120]  # Time steps for checking future threshold crossings
ROLLING_HISTORY_WINDOW_HOURS = 6                         # We use 3-6 hours of history to select extrapolation nodes safely

# Status severities mapped to numerical weights for comparison logic
STATUS_SEVERITY = {
    "GREEN": 0,             # Normal conditions
    "YELLOW": 1,            # Elevated risk, monitor closely
    "ORANGE": 2,            # High risk, gate release plan generated
    "RED": 3,               # Critical, imminent or active threshold breach
    "UNKNOWN": -1,          # Initial or error state
    "DATA_INSUFFICIENT": -1 # State when lacking required nodes for predictions
}
