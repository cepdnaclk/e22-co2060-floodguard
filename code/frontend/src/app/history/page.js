'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Clock, Search, Download, Filter, Calendar } from 'lucide-react';
import styles from './history.module.css';

const CATEGORIES = [
  { id: 'water-level', label: 'Water Level Readings (%)' },
  { id: 'rainfall', label: 'Rainfall Readings (mm/hr)' },
  { id: 'inflow', label: 'Inflow Rates (m³/s)' },
  { id: 'downstream-level', label: 'Downstream Level (%)' },
  { id: 'risk-status', label: 'Risk State Transitions' },
  { id: 'alerts', label: 'Alerts & Acknowledgment Log' },
];

export default function HistoryPage() {
  const { selectedDamId, selectedDam } = useApp();

  const [category, setCategory] = useState('water-level');
  const [fromTime, setFromTime] = useState(() => {
    const d = new Date(Date.now() - 24 * 3600 * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [toTime, setToTime] = useState(() => {
    return new Date().toISOString().slice(0, 16);
  });

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!selectedDamId) return;
    setLoading(true);
    try {
      const fromIso = new Date(fromTime).toISOString();
      const toIso = new Date(toTime).toISOString();
      const res = await fetch(
        `/api/dams/${selectedDamId}/history/${category}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDamId, category, fromTime, toTime]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Statistics calculation for numeric logs
  const stats = useMemo(() => {
    if (!logs.length || category === 'risk-status' || category === 'alerts') return null;
    const values = logs.map((l) => Number(l.value)).filter((v) => !isNaN(v));
    if (!values.length) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      count: values.length,
      min: min.toFixed(2),
      max: max.toFixed(2),
      avg: avg.toFixed(2),
    };
  }, [logs, category]);

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = Object.keys(logs[0]).join(',');
    const rows = logs.map((row) =>
      Object.values(row)
        .map((val) => `"${val != null ? String(val).replace(/"/g, '""') : ''}"`)
        .join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floodguard-${category}-${selectedDam?.dam_name || 'dam'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.headingGroup}>
          <h1 className={styles.pageTitle}>Historical Archive & Telemetry Audit</h1>
          <p className={styles.pageSubtitle}>
            {selectedDam?.dam_name || 'Reservoir'} — Query logged physical readings, algorithmic states & dispatch records
          </p>
        </div>
      </div>

      {/* Filter Controls Card */}
      <Card>
        <CardContent>
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Telemetry Domain</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={styles.select}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>From Time</label>
              <input
                type="datetime-local"
                value={fromTime}
                onChange={(e) => setFromTime(e.target.value)}
                className={styles.dateInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>To Time</label>
              <input
                type="datetime-local"
                value={toTime}
                onChange={(e) => setToTime(e.target.value)}
                className={styles.dateInput}
              />
            </div>

            <div className={styles.actionsGroup}>
              <button onClick={fetchHistory} disabled={loading} className={styles.queryBtn}>
                <Search size={14} />
                <span>{loading ? 'Querying...' : 'Query Log'}</span>
              </button>
              <button
                onClick={exportCSV}
                disabled={!logs.length}
                className={styles.exportBtn}
                title="Export current table to CSV format"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Numerical Stats Strip if applicable */}
      {stats && (
        <div className={styles.statsStrip}>
          <div className={styles.statCard}>
            <span className={styles.statCardLabel}>Total Observations</span>
            <span className={styles.statCardVal}>{stats.count}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardLabel}>Period Minimum</span>
            <span className={styles.statCardVal}>{stats.min}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardLabel}>Period Maximum</span>
            <span className={styles.statCardVal}>{stats.max}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statCardLabel}>Arithmetic Average</span>
            <span className={styles.statCardVal}>{stats.avg}</span>
          </div>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Archived Records ({logs.length} rows)</CardTitle>
          <CardDescription>
            Chronological sensor observations recorded into PostgreSQL
          </CardDescription>
        </CardHeader>
        <CardContent noPadding>
          <div className={styles.tableContainer}>
            {logs.length === 0 ? (
              <div className={styles.emptyState}>
                <span>No telemetry records found for this period and category.</span>
              </div>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  {category === 'water-level' && (
                    <tr>
                      <th>Timestamp</th>
                      <th>Water Level (%)</th>
                    </tr>
                  )}
                  {category === 'rainfall' && (
                    <tr>
                      <th>Timestamp</th>
                      <th>Station</th>
                      <th>Rainfall (mm/hr)</th>
                    </tr>
                  )}
                  {category === 'inflow' && (
                    <tr>
                      <th>Timestamp</th>
                      <th>Inflow Rate (m³/s)</th>
                    </tr>
                  )}
                  {category === 'downstream-level' && (
                    <tr>
                      <th>Timestamp</th>
                      <th>Downstream Channel Level (%)</th>
                    </tr>
                  )}
                  {category === 'risk-status' && (
                    <tr>
                      <th>Timestamp</th>
                      <th>Risk Status</th>
                      <th>Previous</th>
                      <th>TTC (Minutes)</th>
                      <th>Trigger Factor</th>
                    </tr>
                  )}
                  {category === 'alerts' && (
                    <tr>
                      <th>Timestamp</th>
                      <th>Transition</th>
                      <th>Message</th>
                      <th>Acknowledged By</th>
                      <th>Acknowledged At</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {logs.map((row, idx) => (
                    <tr key={idx}>
                      <td className={styles.monoCell}>
                        {new Date(row.time).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      {category === 'water-level' && (
                        <td className={styles.monoCell}>
                          <strong>{Number(row.value).toFixed(2)}%</strong>
                        </td>
                      )}
                      {category === 'rainfall' && (
                        <>
                          <td>{row.station || '—'}</td>
                          <td className={styles.monoCell}>
                            {Number(row.value).toFixed(2)} mm/h
                          </td>
                        </>
                      )}
                      {category === 'inflow' && (
                        <td className={styles.monoCell}>
                          {Number(row.value).toFixed(2)} m³/s
                        </td>
                      )}
                      {category === 'downstream-level' && (
                        <td className={styles.monoCell}>
                          {Number(row.value).toFixed(2)}%
                        </td>
                      )}
                      {category === 'risk-status' && (
                        <>
                          <td>
                            <Badge
                              variant={
                                row.status === 'CRITICAL'
                                  ? 'critical'
                                  : row.status === 'WARNING'
                                  ? 'warning'
                                  : row.status === 'WATCH'
                                  ? 'watch'
                                  : 'normal'
                              }
                            >
                              {row.status}
                            </Badge>
                          </td>
                          <td className={styles.monoCell}>{row.previous_status || '—'}</td>
                          <td className={styles.monoCell}>{row.ttc_minutes ?? '—'}</td>
                          <td>{row.trigger_reason || '—'}</td>
                        </>
                      )}
                      {category === 'alerts' && (
                        <>
                          <td>
                            {row.previous_status} →{' '}
                            <strong>{row.new_status}</strong>
                          </td>
                          <td>{row.message}</td>
                          <td>{row.acknowledged_by || <Badge variant="yellow">Pending</Badge>}</td>
                          <td className={styles.monoCell}>
                            {row.acknowledged_at
                              ? new Date(row.acknowledged_at).toLocaleTimeString()
                              : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
