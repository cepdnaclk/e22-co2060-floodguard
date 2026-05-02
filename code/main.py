"""
main.py – FloodGuard Sensor Simulator Entry Point

Run with:
    python code/main.py           (from project root)

Two windows will open:
  1. Sensor Input       – slider to set the sensor reading (0 – 100 %)
  2. Live Sensor Graph  – real-time animated graph of readings over time

An Excel log (sensor_readings_temp.xlsx) is updated every 2 seconds
inside the code/database/ folder.
"""

import sys
import os
import tkinter as tk

# ── Make sure Python can find sibling packages regardless of CWD ────────────
_HERE = os.path.dirname(os.path.abspath(__file__))   # …/code/
sys.path.insert(0, _HERE)

# ── Project imports ─────────────────────────────────────────────────────────
from backend.inputs.sensor    import SensorState
from frontend.slider_window   import SliderWindow
from frontend.graph_window    import GraphWindow
from frontend.excel_logger    import ExcelLogger


def main() -> None:
    # ── Shared state ─────────────────────────────────────────────────────
    sensor = SensorState()

    # ── Root window → slider ──────────────────────────────────────────────
    root = tk.Tk()
    root.geometry("420x300+200+200")
    SliderWindow(root, sensor)

    # ── Second window → live graph ────────────────────────────────────────
    graph_win = GraphWindow(root, sensor)
    # Position the graph window to the right of the slider
    root.update_idletasks()                       # ensure geometry is resolved
    sw = root.winfo_width()
    sx = root.winfo_x()
    sy = root.winfo_y()
    graph_win._window.geometry(f"760x520+{sx + sw + 20}+{sy}")

    # ── Excel logger (background thread) ─────────────────────────────────
    excel_path = os.path.join(_HERE, "database", "sensor_readings_temp.xlsx")
    logger = ExcelLogger(sensor, excel_path)
    logger.start()

    # ── Graceful shutdown ────────────────────────────────────────────────
    def on_close() -> None:
        logger.stop()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)

    # ── Start event loop ──────────────────────────────────────────────────
    root.mainloop()


if __name__ == "__main__":
    main()
