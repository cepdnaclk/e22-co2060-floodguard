from flask import Flask, Response, abort
import pandas as pd
from datetime import datetime
import io

app = Flask(__name__)

# --- Mock Database Function ---
# Implement your real SQLAlchemy or direct database querying here.
def fetch_incident_data(time_period):
    """
    Fetches incident data (ID, Start Time, Duration, Peak Level, Risk Level) 
    from the database based on the time period requested.
    """
    # Generating mock data matching the frontend's Historical Incidents Log
    mock_db = [
        {"ID": "#EV-2025-042", "Start Time": "2025-10-12 14:30", "Duration": "6h 15m", "Peak Level": "87%", "Risk Level": "WARNING"},
        {"ID": "#EV-2025-041", "Start Time": "2025-09-05 08:20", "Duration": "2h 45m", "Peak Level": "82%", "Risk Level": "WATCH"},
        {"ID": "#EV-2024-118", "Start Time": "2024-08-22 18:00", "Duration": "14h 30m", "Peak Level": "92%", "Risk Level": "EMERGENCY"},
        {"ID": "#EV-2024-094", "Start Time": "2024-07-15 09:10", "Duration": "4h 10m", "Peak Level": "78%", "Risk Level": "WATCH"},
        {"ID": "#EV-2024-051", "Start Time": "2024-04-02 22:45", "Duration": "8h 00m", "Peak Level": "86%", "Risk Level": "WARNING"},
    ]
    
    # Filter based on requested time period dummy logic
    if time_period == '24h':
        return [mock_db[0]] # Just returning 1 recent record
    elif time_period == '7d':
        return mock_db[:2] # Returning 2 recent records
    elif time_period == 'all':
        return mock_db
    else:
        return None

@app.route('/download/<period>', methods=['GET'])
def download_report(period):
    # Validate the input period
    if period not in ['24h', '7d', 'all']:
        abort(400, description="Invalid time period requested. Valid options: '24h', '7d', or 'all'.")
        
    # Fetch incident data
    data = fetch_incident_data(period)
    if not data:
        abort(404, description="No incident data found for this period.")

    # Convert data into a Pandas DataFrame
    df = pd.DataFrame(data)
    
    # Convert the DataFrame to a CSV string in memory
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    # Generate dynamic filename
    filename = f"flood_report_{period}.csv"
    
    # Return the CSV as a downloadable attachment
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

from flask import request, jsonify
import random

@app.route('/api/trends', methods=['GET'])
def get_trends():
    time_range = request.args.get('range', '24h')
    
    # Generate mock data arrays depending on range size
    # Determine number of data points
    points_map = {'1h': 12, '6h': 12, '24h': 24, '7d': 14}
    points = points_map.get(time_range, 24)
    
    # Simulating data dynamically
    # For prediction, we return 3 extension points as dummy forecasts.
    hist_water = [round(random.uniform(60, 82), 1) for _ in range(points)]
    hist_rain = [round(random.uniform(0, 5), 1) for _ in range(points)]
    hist_rise = [round(random.uniform(-0.1, 0.4), 2) for _ in range(points)]
    
    pred_start = hist_water[-1]
    prediction = [pred_start + 2.5, pred_start + 4.1, pred_start + 5.0]
    
    # Optionally generate specific labels depending on time range for the client
    # Instead, we just pass the raw data
    data = {
        "rainfall": hist_rain,
        "water_level": hist_water,
        "rise_rate": hist_rise,
        "prediction": prediction
    }
    
    return jsonify(data)

@app.route('/api/history', methods=['GET'])
def get_history():
    # Provide the dynamic data for the history tab
    history_data = {
        "summary": {
            "total_incidents": 24,
            "total_emergencies": 3,
            "highest_water_level": 94.2,
            "longest_incident": "16h 45m"
        },
        "incidents": [
            {"id": "#EV-2025-042", "start_time": "2025-10-12 14:30", "duration": "6h 15m", "peak_level": 87, "risk_level": "WARNING"},
            {"id": "#EV-2025-041", "start_time": "2025-09-05 08:20", "duration": "2h 45m", "peak_level": 82, "risk_level": "WATCH"},
            {"id": "#EV-2024-118", "start_time": "2024-08-22 18:00", "duration": "14h 30m", "peak_level": 92, "risk_level": "EMERGENCY"},
            {"id": "#EV-2024-094", "start_time": "2024-07-15 09:10", "duration": "4h 10m", "peak_level": 78, "risk_level": "WATCH"},
            {"id": "#EV-2024-051", "start_time": "2024-04-02 22:45", "duration": "8h 00m", "peak_level": 86, "risk_level": "WARNING"}
        ],
        "preparedness": {
            "early_warning_success": 96.5,
            "avg_time_before_emergency": 125, # minutes
            "percent_stabilized": 91.2
        }
    }
    return jsonify(history_data)

if __name__ == '__main__':
    # Run the Flask API on port 5000
    app.run(debug=True, port=5000)
