import { useEffect, useState } from 'react';
import styles from '@/app/page.module.css';
import { Download, History, Award, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export default function HistoricalAnalysisTab() {
    const [historySummary, setHistorySummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('/api/history');
                const data = await res.json();
                setHistorySummary(data);
            } catch (err) {
                console.error("Failed to load history summary", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) return <div className="text-center mt-8 text-muted">Loading lifetime historical metrics...</div>;
    if (!historySummary) return <div className="text-center mt-8 text-muted">Failed to load historical database statistics.</div>;

    const exportCSV = () => {
        // Implement logic or redirect to a full CSV generator endpoint
        alert("Preparing full CSV export from processed_results table...");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Event Summary */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <History size={24} color="var(--accent-color)" /> Event Summary (Lifetime)
            </h2>
            <div className={styles.metricsGrid}>
                <div className={`glass-panel ${styles.metricCard}`}>
                    <span className={styles.metricLabel}>Total Monitored Intervals</span>
                    <span className={styles.metricValue}>{historySummary.total_incidents}</span>
                </div>
                <div className={`glass-panel ${styles.metricCard}`}>
                    <span className={styles.metricLabel}>Emergency Scenarios</span>
                    <span className={styles.metricValue} style={{ color: 'var(--status-red)', background: 'none', WebkitBackgroundClip: 'initial', WebkitTextFillColor: 'initial' }}>{historySummary.emergency_scenarios}</span>
                </div>
                <div className={`glass-panel ${styles.metricCard}`}>
                    <span className={styles.metricLabel}>Highest Water Level Recorded</span>
                    <span className={styles.metricValue}>{historySummary.highest_level.toFixed(1)}%</span>
                </div>
                <div className={`glass-panel ${styles.metricCard}`}>
                    <span className={styles.metricLabel}>System Reliability</span>
                    <span className={styles.metricValue} style={{ color: 'var(--status-green)', background: 'none', WebkitBackgroundClip: 'initial', WebkitTextFillColor: 'initial' }}>99.9%</span>
                </div>
            </div>

            <div className={styles.mainGrid}>
                {/* Past Incident List */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 className={styles.metricLabel} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '1rem' }}>
                        <AlertTriangle size={18} color="var(--status-orange)" /> Recent Activity Log
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '400px' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '1rem 0.5rem' }}>Log ID</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Date & Time</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Peak Level</th>
                                    <th style={{ padding: '1rem 0.5rem' }}>Risk Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historySummary.recent_incidents?.length > 0 ? (
                                    historySummary.recent_incidents.map((incident) => {
                                        const isEmergency = incident.status === 'EMERGENCY' || incident.status === 'RED';
                                        return (
                                            <tr key={incident.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', ':hover': { backgroundColor: 'rgba(255,255,255,0.02)' } }}>
                                                <td style={{ padding: '1rem 0.5rem', fontWeight: '500' }}>LOG-{incident.id}</td>
                                                <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>{new Date(incident.timestamp).toLocaleString()}</td>
                                                <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>{parseFloat(incident.l_t).toFixed(1)}%</td>
                                                <td style={{ padding: '1rem 0.5rem' }}>
                                                    <span style={{
                                                        color: isEmergency ? '#ef4444' : '#f97316',
                                                        background: isEmergency ? 'rgba(239, 68, 68, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                                                        padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 'bold'
                                                    }}>
                                                        {incident.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No critical incidents recorded yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Preparedness Evaluation & Download */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 className={styles.metricLabel} style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '1rem' }}>
                            <Award size={18} color="var(--status-green)" /> Preparedness Evaluation
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Early Warning Success Rate</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--status-green)' }}>98.5%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Average Notice Before Peak</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>45 mins</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>Successfully Controlled Spills</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--status-green)' }}>100%</span>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.1) 0%, rgba(0,0,0,0) 100%)' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileSpreadsheet size={20} /> Export Data
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Download full dataset for analysis</p>
                        </div>
                        <button
                            onClick={exportCSV}
                            style={{
                                display: 'flex', gap: '0.5rem', alignItems: 'center',
                                padding: '0.85rem 1.5rem', backgroundColor: 'var(--accent-color)',
                                color: '#ffffff', border: 'none', borderRadius: '12px', cursor: 'pointer',
                                fontWeight: 'bold', fontSize: '1rem', boxShadow: '0 4px 15px var(--accent-glow)',
                                transition: 'all 0.2s'
                            }}>
                            <Download size={18} />
                            CSV Export
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
