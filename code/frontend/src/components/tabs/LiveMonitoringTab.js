import { AlertTriangle, Info, Clock, Droplets, Activity, CloudRain, Target } from 'lucide-react';
import styles from '@/app/page.module.css';

export default function LiveMonitoringTab({ data }) {
    if (!data) return <div className="text-center mt-8 text-muted">No processed data available. Please ensure simulator and processor are running.</div>;

    const statusClass = styles[data.status] || styles.GREEN;
    const cardGlowClass = styles[`card${data.status}`] || '';

    const safeFloat = (val) => {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    return (
        <div className={styles.mainGrid}>
            {/* Left Col: Main Status */}
            <div className={`glass-panel ${styles.statusCard} ${cardGlowClass}`}>
                <div className={`${styles.statusIndicator} ${statusClass}`}>
                    <span className={styles.statusText}>{data.status}</span>
                </div>
                <div className={styles.metricLabel} style={{ fontSize: '1rem', marginTop: '1rem' }}>Risk Level</div>
                <div className={styles.actionMessage}>{data.action_message}</div>
                <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', width: '100%' }}>
                    <div className={styles.metricLabel}>Suggested Action</div>
                    <div style={{ fontWeight: '600', color: 'var(--text-main)', marginTop: '0.5rem' }}>{data.status === 'SAFE' ? 'Continue Routine Operations' : data.status === 'RED' ? 'EVACUATE DOWNSTREAM' : 'PREPARE GATES'}</div>
                </div>
            </div>

            {/* Right Col: Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className={styles.metricsGrid}>
                    <div className={`glass-panel ${styles.metricCard}`}>
                        <span className={styles.metricLabel}><Droplets size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />Current Water Level (%)</span>
                        <span className={styles.metricValue}>{safeFloat(data.l_t).toFixed(1)}%</span>
                        <span className={styles.metricSub}>Adaptive Threshold: <span style={{ color: 'var(--status-orange)' }}>{safeFloat(data.adaptive_threshold).toFixed(1)}%</span></span>
                    </div>
                    <div className={`glass-panel ${styles.metricCard}`}>
                        <span className={styles.metricLabel}><CloudRain size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />Current Rainfall</span>
                        <span className={styles.metricValue}>{safeFloat(data.rf_t).toFixed(1)} mm/hr</span>
                        <span className={styles.metricSub}>Catchment Area Average</span>
                    </div>
                    <div className={`glass-panel ${styles.metricCard}`}>
                        <span className={styles.metricLabel}><Activity size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />Rise Rate</span>
                        <span className={styles.metricValue}>{safeFloat(data.rr_short).toFixed(2)}% / hr</span>
                        <span className={styles.metricSub}>Acceleration: {safeFloat(data.acc).toFixed(2)}</span>
                    </div>
                    <div className={`glass-panel ${styles.metricCard}`}>
                        <span className={styles.metricLabel}><Target size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />Predicted Water Level</span>
                        <span className={styles.metricValue} style={{ color: 'var(--status-orange)' }}>
                            {(safeFloat(data.l_t) + (safeFloat(data.rr_short) * (data.est_duration_mins || 60) / 60)).toFixed(1)}%
                        </span>
                        <span className={styles.metricSub}>Projected at critical time</span>
                    </div>
                </div>

                {/* Forecast & Timing Box */}
                <div className={`glass-panel ${styles.metricCard}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}>
                            <Clock size={24} color={data.status === 'RED' || data.status === 'ORANGE' ? 'var(--status-red)' : 'var(--text-main)'} />
                        </div>
                        <div>
                            <span className={styles.metricLabel}>Time to Critical Level</span>
                            <span style={{ fontSize: '2rem', display: 'block', fontWeight: '800', color: data.status === 'RED' || data.status === 'ORANGE' ? 'var(--status-red)' : 'var(--text-main)' }}>
                                {data.est_duration_mins ? `${data.est_duration_mins} mins` : 'Stable (> 2 hrs)'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Persistent Gate Operations Box */}
                <div className={styles.alertBox} style={{ borderColor: data.release_active ? 'var(--status-red)' : 'var(--status-green)', background: data.release_active ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)' }}>
                    <div className={styles.alertTitle} style={{ color: data.release_active ? 'var(--status-red)' : 'var(--status-green)' }}>
                        <AlertTriangle size={20} />
                        {data.release_active ? 'GATE RELEASE ACTIVE' : 'GATES CLOSED (SAFE STATUS)'}
                    </div>
                    <div className={styles.releaseGrid}>
                        <div>
                            <div className={styles.metricLabel}>Gate Opening</div>
                            <div className={styles.metricValue} style={{ color: 'var(--text-main)' }}>
                                {data.release_active ? `${safeFloat(data.gate_opening_percent).toFixed(1)}%` : '0.0%'}
                            </div>
                        </div>
                        <div>
                            <div className={styles.metricLabel}>Discharge Rate</div>
                            <div className={styles.metricValue} style={{ color: 'var(--text-main)' }}>
                                {data.release_active ? `${safeFloat(data.release_rate).toFixed(0)} m³/s` : '0 m³/s'}
                            </div>
                        </div>
                        <div>
                            <div className={styles.metricLabel}>Opening Condition</div>
                            <div className={styles.metricValue} style={{ color: 'var(--text-main)', fontSize: '1.25rem' }}>
                                {data.release_active ? `Threshold > ${safeFloat(data.target_safe_level).toFixed(1)}%` : 'Below Threshold'}
                            </div>
                        </div>
                    </div>
                    {data.conflict_warning && data.release_active && (
                        <div style={{ color: 'var(--status-red)', marginTop: '1rem', fontSize: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <Info size={16} />
                            <span>{data.conflict_warning}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

