'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

// Import Tabs
import OverviewTab from '@/components/tabs/OverviewTab';
import AnalysisTab from '@/components/tabs/AnalysisTab';
import LogsTab from '@/components/tabs/LogsTab';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/processed?limit=180');
        const json = await res.json();

        if (json && json.length > 0) {
          setHistory(json);
          setData(json[json.length - 1]);
        }
      } catch (e) {
        console.error("Failed to fetch data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner}></div>
        <div>INITIALIZING SCADA TERMINAL...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.loadingScreen}>
        <div className="text-red font-mono">CONNECTION FAILED</div>
        <div className="text-muted mt-4">NO DATA STREAMS DETECTED. VERIFY TELEMETRY LINK.</div>
      </div>
    );
  }

  // Derive top-bar properties
  const isStale = (new Date() - new Date(data.timestamp)) > 120000; // 2 minutes
  const freshness = isStale ? 'DELAYED' : 'LIVE';

  return (
    <div className={styles.dashboard}>
      
      {/* TOP COMMAND BAR */}
      <header className={styles.commandBar}>
        <div className={styles.commandLeft}>
          <span className={styles.systemName}>FloodGuard OP-CENTER</span>
          <span className="text-muted">|</span>
          <span className="text-primary font-mono">STATION: FLD-ALPHA-01</span>
        </div>
        
        <div className={styles.commandRight}>
          <span>{new Date(data.timestamp).toLocaleTimeString()}</span>
          <div className={styles.dataFreshness}>
            <div className={isStale ? '' : styles.pulseDot} style={{backgroundColor: isStale ? 'var(--status-orange)' : 'var(--status-green)'}}></div>
            <span style={{color: isStale ? 'var(--status-orange)' : 'var(--status-green)'}}>{freshness}</span>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className={styles.tabsContainer}>
        {[
          { id: 'OVERVIEW', label: 'Overview' },
          { id: 'ANALYSIS', label: 'Analysis' },
          { id: 'LOGS', label: 'Logs' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className={styles.contentArea}>
        {activeTab === 'OVERVIEW' && <OverviewTab data={data} history={history} />}
        {activeTab === 'ANALYSIS' && <AnalysisTab data={data} />}
        {activeTab === 'LOGS' && <LogsTab history={history} />}
      </div>
    </div>
  );
}
