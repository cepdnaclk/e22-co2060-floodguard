'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/dateUtils';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Lock,
  User,
  Sliders,
  PhoneCall,
  Clock,
  RefreshCw,
  Check,
} from 'lucide-react';
import styles from './control.module.css';

export default function ControlPage() {
  const { user, authLoading, selectedDamId, selectedDam } = useApp();

  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [ackingId, setAckingId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const fetchAlerts = useCallback(async () => {
    if (!selectedDamId) return;
    setLoadingAlerts(true);
    try {
      const res = await fetch(`/api/dams/${selectedDamId}/alerts`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  }, [selectedDamId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId) => {
    setAckingId(alertId);
    setActionMessage('');
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(`Alert #${alertId} successfully acknowledged by ${user.name}`);
        // Refresh alert list
        fetchAlerts();
      } else {
        setActionMessage(`Error: ${data.error || 'Failed to acknowledge alert'}`);
      }
    } catch {
      setActionMessage('Network error while acknowledging alert.');
    } finally {
      setAckingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className={styles.container}>
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Validating clearance session...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.unauthContainer}>
          <div className={styles.unauthIcon}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Operational Clearance Required</h2>
          <p style={{ maxWidth: '420px', color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
            The Engineer Control Panel allows alert acknowledgment, override authorizations, and
            parameter management. Please sign in with your engineering credentials.
          </p>
          <Link href="/login" className={styles.loginPromptBtn}>
            <Shield size={16} />
            <span>Sign In to Access Controls</span>
          </Link>
        </div>
      </div>
    );
  }

  const unackAlerts = alerts.filter((a) => !a.acknowledged_at);

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.headingGroup}>
          <h1 className={styles.pageTitle}>Engineer Control & Clearance Panel</h1>
          <p className={styles.pageSubtitle}>
            {selectedDam?.dam_name || 'Reservoir'} — Operational state actions, alert acknowledgment & SCADA parameters
          </p>
        </div>
        <button onClick={fetchAlerts} className={styles.ackBtn} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          <RefreshCw size={13} className={loadingAlerts ? 'animate-spin' : ''} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {actionMessage && (
        <div style={{ padding: '10px 14px', background: 'var(--status-green-bg)', border: '1px solid rgba(22, 163, 74, 0.3)', borderRadius: '6px', color: 'var(--status-green)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={16} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Two Column Layout: User Profile & Emergency Hotlines */}
      <div className={styles.twoCols}>
        {/* Active Duty Officer Card */}
        <Card>
          <CardHeader>
            <CardTitle>Active Duty Officer</CardTitle>
            <CardDescription>Verified session credentials & cryptographic token</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.profileGrid}>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Engineer Name</span>
                <span className={styles.profileVal}>{user.name}</span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Clearance Role</span>
                <span className={styles.profileVal}>
                  <Badge variant="blue">{user.role}</Badge>
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Assigned Reservoir</span>
                <span className={styles.profileVal}>
                  {user.assigned_dam_id ? `Dam #${user.assigned_dam_id}` : 'Global Jurisdiction (All Dams)'}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.profileLabel}>Session Clearance</span>
                <span className={styles.profileVal}>
                  <Badge variant="green">Authorized</Badge>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Escalation Directory */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Incident Escalation</CardTitle>
            <CardDescription>National command hotlines for spillway alert levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                <div>
                  <div className={styles.contactName}>National Disaster Management Centre (DMC)</div>
                  <div className={styles.contactAgency}>Emergency Operations Command Center</div>
                </div>
                <div className={styles.contactPhone}>117 / 011-2136136</div>
              </div>
              <div className={styles.contactItem}>
                <div>
                  <div className={styles.contactName}>Irrigation Dept. Chief Hydrologist</div>
                  <div className={styles.contactAgency}>Head Office, Colombo</div>
                </div>
                <div className={styles.contactPhone}>011-2581162</div>
              </div>
              <div className={styles.contactItem}>
                <div>
                  <div className={styles.contactName}>CEB Hydro Control Secretariat</div>
                  <div className={styles.contactAgency}>National Power System Control (NLDC)</div>
                </div>
                <div className={styles.contactPhone}>011-2438301</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Unacknowledged Alerts Action Table */}
      <Card>
        <CardHeader
          action={
            <Badge variant={unackAlerts.length > 0 ? 'orange' : 'normal'}>
              {unackAlerts.length} Unacknowledged
            </Badge>
          }
        >
          <CardTitle>Active Unacknowledged Alerts ({unackAlerts.length})</CardTitle>
          <CardDescription>
            Engineers on duty are required by standard operating procedure to review and acknowledge all state transitions
          </CardDescription>
        </CardHeader>
        <CardContent noPadding>
          {unackAlerts.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={28} style={{ color: 'var(--status-green)' }} />
              <span>All reservoir alerts are currently acknowledged. Nominal operation.</span>
            </div>
          ) : (
            <table className={styles.alertTable}>
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Timestamp</th>
                  <th>Severity</th>
                  <th>Transition</th>
                  <th>Trigger Message</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unackAlerts.map((alert) => (
                  <tr key={alert.alert_id}>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>#{alert.alert_id}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {formatDateTime(alert.created_at || alert.alert_time)}
                    </td>
                    <td>
                      <Badge
                        variant={
                          alert.severity === 'CRITICAL'
                            ? 'critical'
                            : alert.severity === 'WARNING'
                            ? 'warning'
                            : 'watch'
                        }
                      >
                        {alert.severity}
                      </Badge>
                    </td>
                    <td>
                      {alert.previous_status || 'NORMAL'} → <strong>{alert.new_status || alert.severity}</strong>
                    </td>
                    <td>{alert.message || alert.trigger_reason}</td>
                    <td>
                      <button
                        onClick={() => handleAcknowledge(alert.alert_id)}
                        disabled={ackingId === alert.alert_id}
                        className={styles.ackBtn}
                      >
                        <Check size={13} />
                        <span>{ackingId === alert.alert_id ? 'Acknowledging...' : 'Acknowledge'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Hydraulic Operating Parameters for Active Dam */}
      {selectedDam && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedDam.dam_name} — Hydraulic Baseline Parameters</CardTitle>
            <CardDescription>
              Fixed reservoir geometric properties and calibrated hydrological coefficients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.paramGrid}>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>Storage Capacity</span>
                <span className={styles.paramVal}>
                  {selectedDam.reservoir_capacity}
                  <span className={styles.paramUnit}>MCM</span>
                </span>
              </div>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>Full Crest Elevation</span>
                <span className={styles.paramVal}>
                  {selectedDam.elevation_m || 122}
                  <span className={styles.paramUnit}>m AMSL</span>
                </span>
              </div>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>Max Spillway Gate Capacity</span>
                <span className={styles.paramVal}>
                  {selectedDam.max_gate_capacity || 4200}
                  <span className={styles.paramUnit}>m³/s</span>
                </span>
              </div>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>Downstream Safe Capacity</span>
                <span className={styles.paramVal}>
                  {selectedDam.downstream_capacity || 1800}
                  <span className={styles.paramUnit}>m³/s</span>
                </span>
              </div>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>Inflow Baseline (IF_baseline)</span>
                <span className={styles.paramVal}>
                  {selectedDam.if_baseline || 400}
                  <span className={styles.paramUnit}>m³/s</span>
                </span>
              </div>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>Base Threshold</span>
                <span className={styles.paramVal}>
                  {selectedDam.base_threshold || 75.0}
                  <span className={styles.paramUnit}>%</span>
                </span>
              </div>
              <div className={styles.paramCard}>
                <span className={styles.paramLabel}>Dynamic Threshold Floor</span>
                <span className={styles.paramVal}>
                  {selectedDam.threshold_floor || 55.0}
                  <span className={styles.paramUnit}>%</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
