'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import styles from './page.module.css';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/processed');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="container text-center mt-8">Loading live data...</div>;
  if (!data) return <div className="container text-center mt-8 text-muted">No processed data available. Please ensure simulator and processor are running.</div>;

  const statusClass = styles[data.status] || styles.GREEN;
  const cardGlowClass = styles[`card${data.status}`] || '';

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <h1 className={styles.title}>Live Dashboard</h1>
        <p className={styles.subtitle}>Last Updated: {new Date(data.timestamp).toLocaleTimeString()}</p>
      </header>

      <div className={styles.mainGrid}>
        {/* Left Col: Main Status */}
        <div className={`glass-panel ${styles.statusCard} ${cardGlowClass}`}>
          <div className={`${styles.statusIndicator} ${statusClass}`}>
            <span className={styles.statusText}>{data.status}</span>
          </div>
          <div className={styles.actionMessage}>{data.action_message}</div>
          <div className="text-muted mt-1">Risk Band: {data.rr_band}</div>
        </div>

        {/* Right Col: Metrics */}
        <div>
          <div className={styles.metricsGrid}>
            <div className={`glass-panel ${styles.metricCard}`}>
              <span className={styles.metricLabel}>Reservoir Level</span>
              <span className={styles.metricValue}>{parseFloat(data.l_t).toFixed(1)}%</span>
              <span className={styles.metricSub}>Adaptive Threshold: <span style={{color: 'var(--status-orange)'}}>{parseFloat(data.adaptive_threshold).toFixed(1)}%</span></span>
            </div>
            <div className={`glass-panel ${styles.metricCard}`}>
              <span className={styles.metricLabel}>Rise Rate (1H)</span>
              <span className={styles.metricValue}>{parseFloat(data.rr_long).toFixed(1)}% / hr</span>
              <span className={styles.metricSub}>Acceleration: {parseFloat(data.acc).toFixed(1)}</span>
            </div>
            <div className={`glass-panel ${styles.metricCard}`}>
              <span className={styles.metricLabel}>Rainfall</span>
              <span className={styles.metricValue}>{parseFloat(data.rf_t).toFixed(1)} mm/hr</span>
            </div>
            <div className={`glass-panel ${styles.metricCard}`}>
              <span className={styles.metricLabel}>Inflow</span>
              <span className={styles.metricValue}>{parseFloat(data.if_t).toFixed(0)} m³/s</span>
            </div>
          </div>

          {/* Release Recommendation Box */}
          {data.release_active && (
            <div className={styles.alertBox}>
              <div className={styles.alertTitle}>
                <AlertTriangle size={20} />
                GATE RELEASE RECOMMENDED
              </div>
              <div className={styles.releaseGrid}>
                <div>
                  <div className={styles.metricLabel}>Gate Opening</div>
                  <div className={styles.metricValue} style={{color: 'var(--text-main)'}}>{data.gate_opening_percent}%</div>
                </div>
                <div>
                  <div className={styles.metricLabel}>Required Rate</div>
                  <div className={styles.metricValue} style={{color: 'var(--text-main)'}}>{parseFloat(data.release_rate).toFixed(0)} m³/s</div>
                </div>
                <div>
                  <div className={styles.metricLabel}>Est. Duration</div>
                  <div className={styles.metricValue} style={{color: 'var(--text-main)'}}>{data.est_duration_mins} mins</div>
                </div>
                <div>
                  <div className={styles.metricLabel}>Target Level</div>
                  <div className={styles.metricValue} style={{color: 'var(--text-main)'}}>{parseFloat(data.target_safe_level).toFixed(1)}%</div>
                </div>
              </div>
              {data.conflict_warning && (
                <div style={{color: 'var(--status-red)', marginTop: '1rem', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start'}}>
                  <Info size={16} />
                  <span>{data.conflict_warning}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
