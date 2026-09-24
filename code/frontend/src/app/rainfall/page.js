'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import MetricCard from '@/components/ui/MetricCard';
import Badge from '@/components/ui/Badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatDateTime } from '@/lib/dateUtils';
import { CloudRain, RefreshCw, MapPin, Gauge, Droplets, Clock, Shield } from 'lucide-react';
import styles from './rainfall.module.css';

export default function RainfallPage() {
  const { selectedDamId, selectedDam } = useApp();

  const [stations, setStations] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [stationHistory, setStationHistory] = useState([]);
  const [netRainfallData, setNetRainfallData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStations = useCallback(async () => {
    if (!selectedDamId) return;
    try {
      const res = await fetch(`/api/dams/${selectedDamId}/rainfall-stations`);
      if (res.ok) {
        const data = await res.json();
        setStations(data);
        if (data.length > 0 && !selectedStationId) {
          setSelectedStationId(data[0].location_id);
        }
      }
    } catch (err) {
      console.error('Failed to load stations:', err);
    }
  }, [selectedDamId, selectedStationId]);

  const fetchNetRainfall = useCallback(async () => {
    if (!selectedDamId) return;
    const fromTime = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    try {
      const res = await fetch(
        `/api/dams/${selectedDamId}/chart/net-rainfall?from=${encodeURIComponent(fromTime)}&resolution=15m`
      );
      if (res.ok) {
        const data = await res.json();
        setNetRainfallData(data.live || []);
      }
    } catch (err) {
      console.error('Failed to load net rainfall:', err);
    }
  }, [selectedDamId]);

  const fetchStationHistory = useCallback(async (locId) => {
    if (!selectedDamId || !locId) return;
    const fromTime = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    try {
      const res = await fetch(
        `/api/dams/${selectedDamId}/rainfall-stations/${locId}/rainfall?from=${encodeURIComponent(fromTime)}&resolution=15m`
      );
      if (res.ok) {
        const data = await res.json();
        setStationHistory(data.live || []);
      }
    } catch (err) {
      console.error('Failed to load station history:', err);
    }
  }, [selectedDamId]);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchStations(), fetchNetRainfall()]);
    if (selectedStationId) {
      await fetchStationHistory(selectedStationId);
    }
    setRefreshing(false);
    setLoading(false);
  }, [fetchStations, fetchNetRainfall, fetchStationHistory, selectedStationId]);

  useEffect(() => {
    setLoading(true);
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (selectedStationId) {
      fetchStationHistory(selectedStationId);
    }
  }, [selectedStationId, fetchStationHistory]);

  const netRainfallChart = useMemo(() => {
    return netRainfallData.map((d) => ({
      time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      iso: d.time,
      intensity: Number(d.value || 0).toFixed(2),
    }));
  }, [netRainfallData]);

  const stationHistoryChart = useMemo(() => {
    return stationHistory.map((d) => ({
      time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      iso: d.time,
      rainfall: Number(d.value || 0).toFixed(2),
    }));
  }, [stationHistory]);

  const selectedStation = stations.find((s) => s.location_id === selectedStationId) || stations[0];
  const latestRainfallTime = netRainfallData.length > 0 ? netRainfallData[netRainfallData.length - 1].time : null;

  return (
    <div className={styles.container}>
      {/* Formal Government Agency & SCADA Sync Bar */}
      <div className={styles.agencyStrip}>
        <div className={styles.agencyTitle}>
          <Shield size={14} style={{ color: 'var(--accent)' }} />
          <span>Hydrometric Precipitation Monitoring • Isochrone Gauging Matrix</span>
        </div>
        <div className={styles.telemetryClock}>
          <span className={styles.liveDot} />
          <span>Latest Ingestion: {formatDateTime(latestRainfallTime)}</span>
        </div>
      </div>

      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.headingGroup}>
          <h1 className={styles.pageTitle}>Catchment Rainfall Network</h1>
          <p className={styles.pageSubtitle}>
            {selectedDam?.dam_name || 'Reservoir'} — Hydrometric gauges & Isochrone Time-Area weighting
          </p>
        </div>
        <button onClick={refreshAll} className={styles.refreshBtn} title="Refresh Station Readings">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className={styles.grid}>
        {/* Rainfall Stations Table */}
        <Card>
          <CardHeader>
            <CardTitle>Telemetry Gauging Stations ({stations.length})</CardTitle>
            <CardDescription>
              Catchment stations calibrated with runoff travel delay and isochrone weights
            </CardDescription>
          </CardHeader>
          <CardContent noPadding>
            <table className={styles.stationTable}>
              <thead>
                <tr>
                  <th>Station Name</th>
                  <th>District</th>
                  <th>Elevation</th>
                  <th>Lag Time</th>
                  <th>Weight (w_i)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((st) => {
                  const isSelected = st.location_id === selectedStationId;
                  return (
                    <tr key={st.location_id} className={isSelected ? styles.activeRow : ''}>
                      <td>
                        <div className={styles.stationNameCol}>
                          <strong>{st.location_name}</strong>
                          <span className={styles.stationSub}>{st.station_code || `LOC-${st.location_id}`}</span>
                        </div>
                      </td>
                      <td>{st.district || '—'}</td>
                      <td className={styles.monoCell}>{st.elevation_m ? `${st.elevation_m}m` : '—'}</td>
                      <td className={styles.monoCell}>{st.delay_minutes != null ? `${st.delay_minutes} min` : '0 min'}</td>
                      <td className={styles.monoCell}>
                        <Badge variant="default">
                          {(Number(st.weight || 0) * 100).toFixed(0)}%
                        </Badge>
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedStationId(st.location_id)}
                          style={{
                            fontSize: '0.74rem',
                            padding: '4px 8px',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            background: isSelected ? 'var(--accent)' : 'var(--bg-card)',
                            color: isSelected ? '#070a12' : 'var(--text-secondary)',
                            fontWeight: isSelected ? 600 : 400,
                            cursor: 'pointer',
                          }}
                        >
                          {isSelected ? 'Viewing' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Selected Station Profile */}
        <Card>
          <CardHeader>
            <CardTitle>{selectedStation?.location_name || 'Station Detail'}</CardTitle>
            <CardDescription>Sensor calibration & geographic coordinates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.summaryList}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Station Code</span>
                <span className={styles.summaryVal}>{selectedStation?.station_code || '—'}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Province / District</span>
                <span className={styles.summaryVal}>
                  {selectedStation?.province || '—'} / {selectedStation?.district || '—'}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Coordinates</span>
                <span className={styles.summaryVal}>
                  {selectedStation?.latitude?.toFixed(4)}, {selectedStation?.longitude?.toFixed(4)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Isochrone Runoff Delay</span>
                <span className={styles.summaryVal}>
                  {selectedStation?.delay_minutes || 0} minutes
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Contribution Weight</span>
                <span className={styles.summaryVal}>
                  {((selectedStation?.weight || 0) * 100).toFixed(1)}% of catchment
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate Isochrone Net Rainfall Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weighted Catchment Net Rainfall (R_net)</CardTitle>
          <CardDescription>
            Isochrone-adjusted precipitation gradient aggregated across all active stations (mm/hr)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netRainfallChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" opacity={0.6} vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} unit=" mm/h" />
                <Tooltip
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.iso ? formatDateTime(payload[0].payload.iso) : label
                  }
                  contentStyle={{
                    backgroundColor: '#0f1523',
                    borderColor: '#1e293b',
                    borderRadius: '4px',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    color: '#f8fafc',
                  }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}
                  itemStyle={{ color: '#94a3b8', padding: '2px 0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="intensity"
                  name="Net Catchment Rainfall (mm/hr)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Selected Station History Chart */}
      {selectedStation && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedStation.location_name} — 24-Hour Precipitation Log</CardTitle>
            <CardDescription>Individual rain gauge time series (mm/hr)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stationHistoryChart} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" opacity={0.6} vertical={false} />
                  <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} unit=" mm/h" />
                  <Tooltip
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.iso ? formatDateTime(payload[0].payload.iso) : label
                    }
                    contentStyle={{
                      backgroundColor: '#0f1523',
                      borderColor: '#1e293b',
                      borderRadius: '4px',
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      color: '#f8fafc',
                    }}
                    labelStyle={{ color: '#f8fafc', fontWeight: 600, marginBottom: '4px' }}
                    itemStyle={{ color: '#94a3b8', padding: '2px 0' }}
                  />
                  <Bar
                    dataKey="rainfall"
                    name={`${selectedStation.location_name} (mm/hr)`}
                    fill="#38bdf8"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
