"""
sensor.py – Thread-safe shared sensor state.

SensorState acts as the single source of truth for the current slider
reading and its timestamped history. Both the slider window and the
graph/logger read from this object.
"""

import threading
from datetime import datetime


class SensorState:
    """Thread-safe container for sensor readings."""

    def __init__(self):
        self._lock = threading.Lock()
        self._value: float = 0.0          # current reading  (0 – 100)
        self._history: list[tuple] = []   # [(datetime, float), ...]

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def set_value(self, value: float) -> None:
        """Update the current reading and append to history."""
        value = max(0.0, min(100.0, float(value)))
        with self._lock:
            self._value = value
            self._history.append((datetime.now(), value))

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    @property
    def value(self) -> float:
        with self._lock:
            return self._value

    def get_history(self) -> list[tuple]:
        """Return a shallow copy of the history list."""
        with self._lock:
            return list(self._history)

    def clear_history(self) -> None:
        with self._lock:
            self._history.clear()
