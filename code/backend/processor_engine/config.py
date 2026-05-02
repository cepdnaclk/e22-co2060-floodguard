"""
Configuration settings for the Processor Engine.
All values are constants mapped exactly to the prompt requirements.
"""

# Base operating levels
BASE_THRESHOLD = 75.0            # Default safe operating level in %
MIN_ADAPTIVE_THRESHOLD = 30.0    # Floor threshold in %
MAX_ADAPTIVE_THRESHOLD = 75.0    # Ceiling threshold in %

# Time windows
SHORT_WINDOW_MINUTES = 15
LONG_WINDOW_MINUTES = 60
ROLLING_AVERAGE_WINDOW_MINUTES = 180

# Reassessment intervals
RELEASE_REASSESS_INTERVAL_MINUTES = 15
DEESCALATION_CHECK_INTERVAL_MINUTES = 15

# Target safe buffer below threshold
TARGET_SAFE_BUFFER = 10.0        # TargetSafeLevel = AT(t) - 10%

# Dam-specific physical characteristics (Configurable)
ReservoirCapacity = 10000000.0   # Example: 10 million cubic meters
MaxGateCapacity = 5000.0         # Example: 5000 m3/s max discharge
DownstreamCapacity = 2000.0      # Example: 2000 m3/s max safe downstream release
IF_baseline = 120.0              # Normal baseline inflow

# Status severities
STATUS_SEVERITY = {
    "GREEN": 0,
    "YELLOW": 1,
    "ORANGE": 2,
    "RED": 3,
    "UNKNOWN": -1,
    "DATA_INSUFFICIENT": -1
}
