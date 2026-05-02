'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';

import LiveMonitoringTab from '@/components/tabs/LiveMonitoringTab';
import TrendsPredictionTab from '@/components/tabs/TrendsPredictionTab';
import EarlyWarningTab from '@/components/tabs/EarlyWarningTab';
import HistoricalAnalysisTab from '@/components/tabs/HistoricalAnalysisTab';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('LIVE'); // LIVE, TRENDS, WARNING, HISTORY

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/processed?limit=60');
        const json = await res.json();

        if (json && json.length > 0) {
          setHistory(json);
          setData(json[json.length - 1]); // Last item is the most recent
        }
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

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>FloodGuard Dashboard</h1>
          <p className={styles.subtitle}>Last Updated: {new Date(data.timestamp).toLocaleTimeString()}</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === 'LIVE' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('LIVE')}
        >
          Live Monitoring
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'TRENDS' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('TRENDS')}
        >
          Trends & Prediction
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'WARNING' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('WARNING')}
        >
          Early Warning & Advisory
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'HISTORY' ? styles.tabButtonActive : ''}`}
          onClick={() => setActiveTab('HISTORY')}
        >
          Historical Analysis
        </button>
      </div>

      {/* Tab Content Rendering */}
      <div>
        {activeTab === 'LIVE' && <LiveMonitoringTab data={data} />}
        {activeTab === 'TRENDS' && <TrendsPredictionTab history={history} />}
        {activeTab === 'WARNING' && <EarlyWarningTab data={data} />}
        {activeTab === 'HISTORY' && <HistoricalAnalysisTab />}
      </div>
    </div>
  );
}

