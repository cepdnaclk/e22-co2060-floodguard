"""
main.py – FloodGuard System Orchestrator

This script acts as the master controller for the backend architecture.
It spawns both the data simulator and the processor engine simultaneously
so you don't need to manage multiple terminals.

Run with:
    python code/main.py
"""

import sys
import os
import subprocess
import time

def main():
    # Ensure paths are resolved correctly relative to main.py
    current_dir = os.path.dirname(os.path.abspath(__file__))
    simulator_script = os.path.join(current_dir, "simulation", "db_simulator.py")
    processor_script = os.path.join(current_dir, "backend", "processor_engine", "processor.py")

    print("==================================================")
    print("      Starting FloodGuard Backend Services")
    print("==================================================\n")

    try:
        # Spawn the simulator process
        print("[System] Spawning DB Simulator at 60x speed to accelerate scenario testing...")
        sim_process = subprocess.Popen(
            [sys.executable, "-u", simulator_script, "--speed", "60.0"],
            stdout=sys.stdout,
            stderr=sys.stderr,
            cwd=os.path.dirname(simulator_script)
        )

        # Give the simulator a moment to start and establish its DB connection
        time.sleep(2)

        # Spawn the processor engine
        print("[System] Spawning Processor Engine...\n")
        proc_process = subprocess.Popen(
            [sys.executable, "-u", processor_script],
            stdout=sys.stdout,
            stderr=sys.stderr,
            cwd=os.path.dirname(processor_script)
        )

        # Wait infinitely until the user presses Ctrl+C
        print("[System] Both services are running. Press Ctrl+C to stop.\n")
        sim_process.wait()
        proc_process.wait()

    except KeyboardInterrupt:
        print("\n[System] Shutting down services gracefully...")
        
        # Terminate processes if they are still running
        if 'sim_process' in locals() and sim_process.poll() is None:
            sim_process.terminate()
        if 'proc_process' in locals() and proc_process.poll() is None:
            proc_process.terminate()
            
        print("[System] Shutdown complete.")
        sys.exit(0)

if __name__ == "__main__":
    main()
