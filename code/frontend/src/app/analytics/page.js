'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, Database, CloudRain } from 'lucide-react';
import styles from './analytics.module.css';

export default function Analytics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/raw?limit=100');
        const json = await res.json();
        // Format timestamp for charts
        const formatted = json.map(row => ({
          ...row,
          time: new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          l: parseFloat(row.water_level_pct),
          rf: parseFloat(row.rainfall_mm_hr),
          inf: parseFloat(row.inflow_m3s),
          dl: parseFloat(row.downstream_lvl_pct)
        }));
        setData(formatted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="container text-center mt-8">Loading analytics data...</div>;
  if (!data || data.length === 0) return <div className="container text-center mt-8 text-muted">No raw data available.</div>;

  return (
    <div className={styles.analytics}>
      <header className={styles.header}>
        <h1 className={styles.title}>Raw Analytics</h1>
        <p className={styles.subtitle}>Historical sensor inputs and environmental conditions</p>
      </header>

      {/* Reservoir Level Chart */}
      <div className={`glass-panel ${styles.chartCard}`}>
        <h2 className={styles.chartTitle}><Activity size={20} color="var(--status-orange)" /> Reservoir Level Over Time</h2>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--status-orange)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--status-orange)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
              <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--text-main)' }}
              />
              <Area type="monotone" dataKey="l" name="Level (%)" stroke="var(--status-orange)" strokeWidth={3} fillOpacity={1} fill="url(#colorL)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rainfall & Inflow Chart */}
      <div className={`glass-panel ${styles.chartCard}`}>
        <h2 className={styles.chartTitle}><CloudRain size={20} color="#3b82f6" /> Environmental Inputs</h2>
        <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
              <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line yAxisId="left" type="monotone" dataKey="rf" name="Rainfall (mm/hr)" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line yAxisId="right" type="monotone" dataKey="inf" name="Inflow (m³/s)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Raw Data Table */}
      <div className={`glass-panel ${styles.chartCard}`}>
        <h2 className={styles.chartTitle}><Database size={20} /> Raw Data Log</h2>
        <div className={styles.tableContainer}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Level (%)</th>
                <th>Rainfall (mm/hr)</th>
                <th>Inflow (m³/s)</th>
                <th>Downstream (%)</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((row, i) => (
                <tr key={i}>
                  <td>{new Date(row.timestamp).toLocaleString()}</td>
                  <td>{row.l.toFixed(2)}</td>
                  <td>{row.rf.toFixed(2)}</td>
                  <td>{row.inf.toFixed(2)}</td>
                  <td>{row.dl.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
