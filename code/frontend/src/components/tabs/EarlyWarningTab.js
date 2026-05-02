import styles from '@/app/page.module.css';
import { AlertCircle, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

export default function EarlyWarningTab({ data }) {
    if (!data) return <div className="text-muted text-center mt-8">No processed data available.</div>;

    const STATUS_CONFIGS = {
        'SAFE': {
            icon: <CheckCircle2 size={64} className="mb-4" stroke="#10b981" />,
            color: '#10b981',
            bg: 'rgba(16, 185, 129, 0.05)',
            border: 'rgba(16, 185, 129, 0.2)',
            title: 'Current Status: SAFE',
            desc: 'No immediate danger detected. Normal dam operations in progress.',
            actions: [
                'Routine system checks and monitoring.',
                'No public action required.'
            ]
        },
        'WATCH': {
            icon: <Info size={64} className="mb-4" stroke="#facc15" />,
            color: '#facc15',
            bg: 'rgba(250, 204, 21, 0.05)',
            border: 'rgba(250, 204, 21, 0.2)',
            title: 'Current Status: WATCH',
            desc: 'Water levels or rainfall are showing an increasing trend.',
            actions: [
                'Stay informed via official channels.',
                'Avoid recreational activities near the riverbanks.',
                'Authorities are conducting continuous monitoring.'
            ]
        },
        'WARNING': {
            icon: <AlertCircle size={64} className="mb-4" stroke="#fb923c" />,
            color: '#fb923c',
            bg: 'rgba(251, 146, 60, 0.05)',
            border: 'rgba(251, 146, 60, 0.2)',
            title: 'Current Status: WARNING',
            desc: 'Critical thresholds approaching. Controlled spillway discharge may commence.',
            actions: [
                'Prepare emergency supply kits.',
                'Communities downstream should move away from the river immediately.',
                'Emergency response teams are on standby.'
            ]
        },
        'EMERGENCY': {
            icon: <ShieldAlert size={64} className="mb-4" stroke="#ef4444" />,
            color: '#ef4444',
            bg: 'rgba(239, 68, 68, 0.05)',
            border: 'rgba(239, 68, 68, 0.3)',
            title: 'Current Status: EMERGENCY',
            desc: 'Severe flood risk detected. Dam threshold exceeded or massive release expected.',
            actions: [
                'Move to higher ground IMMEDIATELY.',
                'Follow evacuation orders without delay.',
                'Sirens and broadcasting activated across the valley.'
            ]
        }
    };

    const statusKey = data.status || 'SAFE';
    let displayKey = statusKey;
    if (displayKey === 'RED') displayKey = 'EMERGENCY';
    if (displayKey === 'ORANGE') displayKey = 'WARNING';
    if (displayKey === 'YELLOW') displayKey = 'WATCH';
    if (displayKey === 'GREEN') displayKey = 'SAFE';

    const config = STATUS_CONFIGS[displayKey] || STATUS_CONFIGS['SAFE'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Official Advisory Banner */}
            <div
                className="glass-panel"
                style={{
                    padding: '3rem',
                    textAlign: 'center',
                    backgroundColor: config.bg,
                    borderColor: config.border,
                    boxShadow: `0 0 40px ${config.bg}`
                }}
            >
                {config.icon}
                <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: config.color, marginBottom: '1rem' }}>
                    {config.title}
                </h2>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', border: `1px solid ${config.border}` }}>
                    <div className={styles.metricLabel} style={{ color: 'var(--text-muted)' }}>Official Advisory Message</div>
                    <p style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>
                        "{data.action_message || config.desc}"
                    </p>
                </div>
            </div>

            <div className={styles.mainGrid}>
                {/* Recommended Public Actions */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 className={styles.metricLabel} style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                        Recommended Public Actions
                    </h3>
                    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '1.1rem', lineHeight: '1.8' }}>
                        {config.actions.map((act, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ minWidth: 12, height: 12, borderRadius: '50%', backgroundColor: config.color, boxShadow: `0 0 10px ${config.color}` }} />
                                {act}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Authority Coordination Status */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 className={styles.metricLabel} style={{ fontSize: '1rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                        Authority Coordination Status
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Dam Operators</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 1rem', borderRadius: '20px' }}>Active & Monitoring</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Emergency Services</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: displayKey === 'EMERGENCY' || displayKey === 'WARNING' ? '#ef4444' : '#10b981', background: displayKey === 'EMERGENCY' || displayKey === 'WARNING' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 1rem', borderRadius: '20px' }}>
                                {displayKey === 'EMERGENCY' || displayKey === 'WARNING' ? 'Deployed' : 'Standby'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: '500' }}>Public Notification System</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: displayKey === 'EMERGENCY' ? '#ef4444' : '#10b981', background: displayKey === 'EMERGENCY' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 1rem', borderRadius: '20px' }}>
                                {displayKey === 'EMERGENCY' ? 'Alerts Sent' : 'Ready'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
