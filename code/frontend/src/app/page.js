'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

// Import Tabs (we will create these next)
import HomeTab from '@/components/tabs/HomeTab';
import LiveReadingsTab from '@/components/tabs/LiveReadingsTab';
import RiskAnalysisTab from '@/components/tabs/RiskAnalysisTab';
import GateReleaseTab from '@/components/tabs/GateReleaseTab';
import TrendsGraphsTab from '@/components/tabs/TrendsGraphsTab';
import AlertsLogTab from '@/components/tabs/AlertsLogTab';
import ConfigurationTab from '@/components/tabs/ConfigurationTab';
import ReportsTab from '@/components/tabs/ReportsTab';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('HOME');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/processed?limit=180'); // Fetch 3 hours of data (180 mins)
        const json = await res.json();

        if (json && json.length > 0) {
          setHistory(json);
          setData(json[json.length - 1]); // Last item is the most recent
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
          <span className={styles.systemName}>Adaptive Dam Reservoir Management System</span>
          <span className="text-muted">STATION: FLD-ALPHA-01</span>
        </div>
        
        <div className={styles.commandCenter}>
          <div className={`${styles.statusBadge} ${styles[`status-${data.status}`]}`}>
            {data.status}
          </div>
          <span>UPDATED: {new Date(data.timestamp).toLocaleTimeString()}</span>
          <div className={styles.dataFreshness}>
            <div className={isStale ? '' : styles.pulseDot} style={{backgroundColor: isStale ? 'var(--status-orange)' : 'var(--status-green)'}}></div>
            <span style={{color: isStale ? 'var(--status-orange)' : 'var(--status-green)'}}>{freshness}</span>
          </div>
        </div>

        <div className={styles.commandRight}>
          <span>{new Date().toLocaleDateString()}</span>
          <span className="text-cyan">AUTH: DAM OFFICER</span>
          {['ORANGE', 'RED'].includes(data.status) && (
            <span className="text-red font-weight-bold" style={{border: '1px solid var(--status-red)', padding: '2px 6px'}}>EMERGENCY MODE</span>
          )}
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className={styles.tabsContainer}>
        {[
          { id: 'HOME', label: 'Home / Overview' },
          { id: 'LIVE', label: 'Live Sensors' },
          { id: 'RISK', label: 'Risk Analysis' },
          { id: 'GATE', label: 'Gate Control' },
          { id: 'TRENDS', label: 'Trends & Graphs' },
          { id: 'LOGS', label: 'Alerts & Event Log' },
          { id: 'CONFIG', label: 'Configuration' },
          { id: 'REPORTS', label: 'Reports / Export' }
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
        {activeTab === 'HOME' && <HomeTab data={data} history={history} setActiveTab={setActiveTab} />}
        {activeTab === 'LIVE' && <LiveReadingsTab data={data} history={history} />}
        {activeTab === 'RISK' && <RiskAnalysisTab data={data} />}
        {activeTab === 'GATE' && <GateReleaseTab data={data} />}
        {activeTab === 'TRENDS' && <TrendsGraphsTab history={history} />}
        {activeTab === 'LOGS' && <AlertsLogTab history={history} />}
        {activeTab === 'CONFIG' && <ConfigurationTab />}
        {activeTab === 'REPORTS' && <ReportsTab data={data} history={history} />}
      </div>
    </div>
  );
}
