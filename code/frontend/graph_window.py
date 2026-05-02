"""
graph_window.py – Live Sensor Graph Window

Embeds a matplotlib animated line graph inside a tkinter Toplevel.
  • X axis : elapsed time in seconds
  • Y axis : sensor reading (0 – 100 %)
Refreshes every 500 ms via FuncAnimation.
"""

import tkinter as tk
import matplotlib
matplotlib.use("TkAgg")                        # backend must be set before pyplot import

import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from datetime import datetime

# ── colour palette (mirrors slider_window) ───────────────────────────────────
BG_DARK   = "#1a1a2e"
BG_PANEL  = "#16213e"
ACCENT    = "#e94560"
GRID_COL  = "#2a2a4a"
TEXT_COL  = "#eaeaea"
DIM_COL   = "#8892a4"
LINE_COL  = "#38bdf8"   # sky-blue line


class GraphWindow:
    """Creates and manages the live graph window."""

    REFRESH_MS   = 500     # animation interval (milliseconds)

    def __init__(self, parent: tk.Tk, sensor_state):
        self.sensor = sensor_state
        self._start_time = datetime.now()

        self._window = tk.Toplevel(parent)
        self._window.title("Live Sensor Graph")
        self._window.configure(bg=BG_DARK)
        self._window.resizable(True, True)

        self._build_graph()

    # ------------------------------------------------------------------
    def _build_graph(self) -> None:
        win = self._window

        # ── Title bar inside window ──────────────────────────────────────
        header = tk.Frame(win, bg=BG_DARK)
        header.pack(fill="x", padx=16, pady=(14, 0))

        tk.Label(header, text="LIVE SENSOR GRAPH",
                 font=("Segoe UI", 11, "bold"), bg=BG_DARK, fg=ACCENT).pack(side="left")

        self._live_dot = tk.Label(header, text="● LIVE",
                                  font=("Segoe UI", 9, "bold"), bg=BG_DARK, fg="#4ade80")
        self._live_dot.pack(side="right", padx=4)
        self._dot_visible = True

        # ── Matplotlib figure ────────────────────────────────────────────
        self._fig, self._ax = plt.subplots(figsize=(7, 4), facecolor=BG_DARK)
        self._ax.set_facecolor(BG_PANEL)

        # Axes styling
        self._ax.set_xlim(0, 30)   # grows dynamically in _update_graph
        self._ax.set_ylim(-2, 102)
        self._ax.set_xlabel("Time (s)", color=DIM_COL, fontsize=9, labelpad=6)
        self._ax.set_ylabel("Sensor Reading (%)", color=DIM_COL, fontsize=9, labelpad=6)
        self._ax.tick_params(colors=DIM_COL, labelsize=8)
        for spine in self._ax.spines.values():
            spine.set_edgecolor(GRID_COL)
        self._ax.grid(True, color=GRID_COL, linewidth=0.6, linestyle="--", alpha=0.8)

        # Horizontal reference lines
        for level, label, col in [
            (40,  "Low/Med (40%)",  "#4ade80"),
            (70,  "Med/High (70%)", "#fbbf24"),
            (100, "Max (100%)",     "#f87171"),
        ]:
            self._ax.axhline(level, color=col, linewidth=0.6,
                             linestyle=":", alpha=0.55, label=label)

        self._ax.legend(loc="upper right", fontsize=7,
                        facecolor=BG_PANEL, edgecolor=GRID_COL,
                        labelcolor=DIM_COL)

        # The data line (starts empty)
        self._line, = self._ax.plot([], [], color=LINE_COL,
                                    linewidth=2, solid_capstyle="round")

        # Fill under the line
        self._fill = self._ax.fill_between([], [], alpha=0)   # placeholder

        self._fig.tight_layout(pad=1.8)

        # ── Embed in tkinter ─────────────────────────────────────────────
        canvas = FigureCanvasTkAgg(self._fig, master=win)
        canvas.get_tk_widget().pack(fill="both", expand=True, padx=12, pady=(6, 12))
        self._canvas = canvas

        # ── Stats bar ────────────────────────────────────────────────────
        stats_frame = tk.Frame(win, bg=BG_DARK)
        stats_frame.pack(fill="x", padx=16, pady=(0, 12))

        self._lbl_current = self._stat_label(stats_frame, "Current", "0.0 %")
        self._lbl_min      = self._stat_label(stats_frame, "Min",     "—")
        self._lbl_max      = self._stat_label(stats_frame, "Max",     "—")
        self._lbl_avg      = self._stat_label(stats_frame, "Avg",     "—")
        self._lbl_samples  = self._stat_label(stats_frame, "Samples", "0")

        # ── Animation ────────────────────────────────────────────────────
        self._ani = animation.FuncAnimation(
            self._fig,
            self._update_graph,
            interval=self.REFRESH_MS,
            blit=False,
            cache_frame_data=False,
        )
        canvas.draw()

        # Blink the LIVE dot separately
        self._blink_dot()

    # ------------------------------------------------------------------
    @staticmethod
    def _stat_label(parent, title: str, initial: str) -> tk.Label:
        """Create a grouped title + value label pair inside the stats bar."""
        box = tk.Frame(parent, bg="#16213e", padx=10, pady=5)
        box.pack(side="left", expand=True, fill="x", padx=4)
        tk.Label(box, text=title.upper(), font=("Segoe UI", 7),
                 bg="#16213e", fg="#8892a4").pack()
        lbl = tk.Label(box, text=initial, font=("Segoe UI", 13, "bold"),
                       bg="#16213e", fg="#eaeaea")
        lbl.pack()
        return lbl

    # ------------------------------------------------------------------
    def _update_graph(self, _frame) -> None:
        """FuncAnimation callback – redraw each tick."""
        history = self.sensor.get_history()
        if not history:
            return

        now = datetime.now()
        # Use ALL history from t=0 — never trim
        t_vals = [(ts - self._start_time).total_seconds() for ts, _ in history]
        y_vals = [v for _, v in history]

        # Grow X axis from 0 to current elapsed time (never scrolls back)
        elapsed = (now - self._start_time).total_seconds()
        x_max = max(elapsed, t_vals[-1]) + 2   # small right-padding
        self._ax.set_xlim(0, x_max)

        # Update line
        self._line.set_data(t_vals, y_vals)

        # Redraw fill
        self._fill.remove()
        self._fill = self._ax.fill_between(
            t_vals, y_vals, alpha=0.12, color=LINE_COL
        )

        # Stats bar — always over the full session
        current = y_vals[-1]
        self._lbl_current.config(text=f"{current:.1f} %")
        self._lbl_min.config(text=f"{min(y_vals):.1f} %")
        self._lbl_max.config(text=f"{max(y_vals):.1f} %")
        avg = sum(y_vals) / len(y_vals)
        self._lbl_avg.config(text=f"{avg:.1f} %")
        self._lbl_samples.config(text=str(len(history)))

        self._canvas.draw_idle()

    # ------------------------------------------------------------------
    def _blink_dot(self) -> None:
        """Blink the ● LIVE indicator every 800 ms."""
        if self._dot_visible:
            self._live_dot.config(fg=BG_DARK)
        else:
            self._live_dot.config(fg="#4ade80")
        self._dot_visible = not self._dot_visible
        self._window.after(800, self._blink_dot)
