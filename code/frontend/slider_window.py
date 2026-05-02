"""
slider_window.py – Sensor Input Window

A polished tkinter window containing:
  • A horizontal slider labelled 0 % → 100 %
  • A large live readout label showing the current percentage
  • Updates SensorState on every slider movement
"""

import tkinter as tk
from tkinter import ttk

# ── colour palette ──────────────────────────────────────────────────────────
BG          = "#1a1a2e"   # deep navy background
ACCENT      = "#e94560"   # vivid red-rose accent
TEXT_LIGHT  = "#eaeaea"   # primary text
TEXT_DIM    = "#8892a4"   # secondary / label text
TRACK_BG    = "#16213e"   # slider trough


class SliderWindow:
    """Creates and manages the sensor-input (slider) window."""

    def __init__(self, root: tk.Tk, sensor_state):
        self.sensor = sensor_state
        self.root   = root

        self._build_ui()
        # Seed the state with 0 so history starts cleanly
        self.sensor.set_value(0.0)
        # Begin continuous periodic sampling (records even without slider movement)
        self._start_sampler()

    # ------------------------------------------------------------------
    def _build_ui(self) -> None:
        root = self.root
        root.title("Sensor Input")
        root.configure(bg=BG)
        root.resizable(False, False)

        # ── Header ──────────────────────────────────────────────────────
        tk.Label(
            root, text="FloodGuard", font=("Segoe UI", 11, "bold"),
            bg=BG, fg=ACCENT
        ).pack(pady=(22, 0))

        tk.Label(
            root, text="SENSOR SIMULATOR", font=("Segoe UI", 9),
            bg=BG, fg=TEXT_DIM
        ).pack()

        # ── Big value readout ────────────────────────────────────────────
        self._var_label = tk.StringVar(value="0 %")
        self._readout = tk.Label(
            root, textvariable=self._var_label,
            font=("Segoe UI", 52, "bold"),
            bg=BG, fg=TEXT_LIGHT,
        )
        self._readout.pack(pady=(24, 4))

        # Sub-label beneath the number
        tk.Label(
            root, text="Sensor Reading", font=("Segoe UI", 10),
            bg=BG, fg=TEXT_DIM
        ).pack()

        # ── Slider container ─────────────────────────────────────────────
        frame = tk.Frame(root, bg=BG)
        frame.pack(padx=40, pady=(28, 8), fill="x")

        # Range labels
        tk.Label(frame, text="0 %",   font=("Segoe UI", 9), bg=BG, fg=TEXT_DIM).pack(side="left")
        tk.Label(frame, text="100 %", font=("Segoe UI", 9), bg=BG, fg=TEXT_DIM).pack(side="right")

        # Style the scale
        style = ttk.Style(root)
        style.theme_use("clam")
        style.configure(
            "Sensor.Horizontal.TScale",
            troughcolor=TRACK_BG,
            background=BG,
            sliderlength=28,
            sliderrelief="flat",
        )
        style.map(
            "Sensor.Horizontal.TScale",
            background=[("active", ACCENT)],
        )

        self._slider_var = tk.DoubleVar(value=0.0)
        self._slider = ttk.Scale(
            frame,
            from_=0, to=100,
            orient="horizontal",
            variable=self._slider_var,
            style="Sensor.Horizontal.TScale",
            command=self._on_slide,
            length=320,
        )
        self._slider.pack(side="left", expand=True, fill="x", padx=8)

        # ── Tick marks (thin canvas) ─────────────────────────────────────
        self._draw_ticks(root)

        # ── Footer ──────────────────────────────────────────────────────
        tk.Label(
            root, text="Drag the slider to simulate a sensor reading",
            font=("Segoe UI", 8), bg=BG, fg=TEXT_DIM
        ).pack(pady=(2, 20))

    # ------------------------------------------------------------------
    def _draw_ticks(self, parent) -> None:
        """Draw subtle tick marks beneath the slider."""
        canvas = tk.Canvas(parent, bg=BG, height=14, highlightthickness=0, width=360)
        canvas.pack()
        offset = 20
        width  = 320
        for i in range(11):
            x = offset + (i / 10) * width
            canvas.create_line(x, 0, x, 6 if i % 5 == 0 else 4,
                               fill=TEXT_DIM, width=1)

    # ------------------------------------------------------------------
    # ------------------------------------------------------------------
    SAMPLE_INTERVAL_MS = 500   # record a data point every 500 ms

    def _start_sampler(self) -> None:
        """Kick off the periodic sampler loop."""
        self._sample()

    def _sample(self) -> None:
        """Record the current slider reading, then schedule the next call."""
        self.sensor.set_value(self._slider_var.get())
        # Re-schedule; store ID so we could cancel it on close if needed
        self._sample_id = self.root.after(self.SAMPLE_INTERVAL_MS, self._sample)

    def _on_slide(self, value) -> None:
        """Called on every slider movement – update display only (sampler handles data)."""
        val = float(value)
        self._var_label.set(f"{val:.1f} %")

        # Colour the readout: green → amber → red as reading rises
        if val < 40:
            colour = "#4ade80"    # green
        elif val < 70:
            colour = "#fbbf24"    # amber
        else:
            colour = "#f87171"    # red
        self._readout.config(fg=colour)

        self.sensor.set_value(val)
