'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/dateUtils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Waves,
  Activity,
  CloudRain,
  Clock,
  Shield,
  RefreshCw,
  ArrowUpRight,
  Droplets,
  Gauge,
  Sliders,
  AlertTriangle,
  CheckCircle,
  MapPin,
  TrendingUp,
  Compass,
  Radio,
  Layers,
  ChevronRight,
} from 'lucide-react';
import styles from './overview.module.css';

export default function OverviewPage() {
  const { dams, selectedDamId, setSelectedDamId, selectedDam } = useApp();

  const [statusData, setStatusData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [stations, setStations] = useState([]);
  const [chartData, setChartData] = useState({
    waterLevel: [],
    threshold: [],
    inflow: [],
    release: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (damId) => {
    if (!damId) return;
    try {
      const fromTime = new Date(Date.now() - 6 * 3600 * 1000).toISOString();

      const [statusRes, alertsRes, stationsRes, wlRes, thRes, ifRes, relRes] =
        await Promise.all([
          fetch(`/api/dams/${damId}/status`),
          fetch(`/api/dams/${damId}/alerts`),
          fetch(`/api/dams/${damId}/rainfall-stations`),
          fetch(`/api/dams/${damId}/chart/water-level?from=${encodeURIComponent(fromTime)}`),
          fetch(`/api/dams/${damId}/chart/threshold?from=${encodeURIComponent(fromTime)}`),
          fetch(`/api/dams/${damId}/chart/inflow?from=${encodeURIComponent(fromTime)}`),
          fetch(`/api/dams/${damId}/chart/release?from=${encodeURIComponent(fromTime)}`),
        ]);

      if (statusRes.ok) setStatusData(await statusRes.json());
      if (alertsRes.ok) {
        const alertsArr = await alertsRes.json();
        setAlerts(Array.isArray(alertsArr) ? alertsArr.slice(0, 6) : []);
      }
      if (stationsRes.ok) {
        const stationsArr = await stationsRes.json();
        setStations(Array.isArray(stationsArr) ? stationsArr : []);
      }

      const wl = wlRes.ok ? await wlRes.json() : { live: [] };
      const th = thRes.ok ? await thRes.json() : { live: [] };
      const inf = ifRes.ok ? await ifRes.json() : { live: [] };
      const rel = relRes.ok ? await relRes.json() : { live: [] };

      setChartData({
        waterLevel: wl.live || [],
        threshold: th.live || [],
        inflow: inf.live || [],
        release: rel.live || [],
      });
    } catch (err) {
      console.error('Failed to fetch SCADA overview data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDamId) {
      setLoading(true);
      fetchData(selectedDamId);
      const interval = setInterval(() => fetchData(selectedDamId), 15000);
      return () => clearInterval(interval);
    }
  }, [selectedDamId, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(selectedDamId);
  };

  // Operational status determination
  const riskStatus = statusData?.risk_status?.status || 'GREEN';
  const riskVariant =
    riskStatus === 'RED' || riskStatus === 'CRITICAL'
      ? 'critical'
      : riskStatus === 'ORANGE' || riskStatus === 'WARNING'
      ? 'warning'
      : riskStatus === 'YELLOW' || riskStatus === 'WATCH'
      ? 'watch'
      : 'normal';

  // Numerical parameters
  const waterLevelNum =
    statusData?.water_level?.water_level_pct != null
      ? Number(statusData.water_level.water_level_pct)
      : null;

  const adaptiveThresholdNum =
    statusData?.threshold?.adaptive_threshold != null
      ? Number(statusData.threshold.adaptive_threshold)
      : 75.0;

  const inflowRateNum =
    statusData?.inflow?.inflow_rate_m3s != null
      ? Number(statusData.inflow.inflow_rate_m3s)
      : null;

  const downstreamLevelNum =
    statusData?.downstream_level?.downstream_level_pct != null
      ? Number(statusData.downstream_level.downstream_level_pct)
      : null;

  const qReleaseNum =
    statusData?.release?.q_release != null
      ? Number(statusData.release.q_release)
      : null;

  const gateOpeningPct =
    statusData?.release?.gate_opening_applied_pct != null
      ? Number(statusData.release.gate_opening_applied_pct).toFixed(1)
      : '0.0';

  const rrShortNum =
    statusData?.metrics?.rr_short != null
      ? Number(statusData.metrics.rr_short)
      : null;

  const rNetNum =
    statusData?.r_net?.r_net != null
      ? Number(statusData.r_net.r_net).toFixed(1)
      : '0.0';

  // Derived engineering dimensions
  const crestElev = selectedDam?.elevation_m || 438.0;
  const currentStageM =
    waterLevelNum != null ? (crestElev * (waterLevelNum / 100)).toFixed(2) : '—';
  const freeboardM =
    waterLevelNum != null
      ? Math.max(0, (crestElev * (1 - waterLevelNum / 100))).toFixed(2)
      : '—';

  const latestTelemetryTime =
    statusData?.water_level?.reading_time ||
    statusData?.risk_status?.status_time ||
    statusData?.threshold?.calc_time;

  // Build Unified Hydrograph Data (Water Level vs Threshold)
  const hydrographSeries = useMemo(() => {
    const map = new Map();

    (chartData.waterLevel || []).forEach((d) => {
      const timeStr = new Date(d.time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      map.set(d.time, { time: timeStr, iso: d.time, waterLevel: Number(d.value).toFixed(2) });
    });

    (chartData.threshold || []).forEach((d) => {
      const existing = map.get(d.time) || {
        time: new Date(d.time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        iso: d.time,
      };
      existing.threshold = Number(d.value).toFixed(2);
      map.set(d.time, existing);
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.iso) - new Date(b.iso));
  }, [chartData.waterLevel, chartData.threshold]);

  // Build Hydraulic Mass Balance Series (Inflow vs Outflow)
  const hydraulicBalanceSeries = useMemo(() => {
    const map = new Map();

    (chartData.inflow || []).forEach((d) => {
      const timeStr = new Date(d.time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      map.set(d.time, { time: timeStr, iso: d.time, inflow: Number(d.value).toFixed(1) });
    });

    (chartData.release || []).forEach((d) => {
      const existing = map.get(d.time) || {
        time: new Date(d.time).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        iso: d.time,
      };
      existing.release = Number(d.value).toFixed(1);
      map.set(d.time, existing);
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.iso) - new Date(b.iso));
  }, [chartData.inflow, chartData.release]);

  return (
    <div className={styles.container}>
      {/* 1. Formal SCADA System Header & Latency Strip */}
      <div className={styles.agencyStrip}>
        <div className={styles.agencyTitle}>
          <Shield size={14} style={{ color: 'var(--accent)' }} />
          <span>Department of Irrigation • National Hydro-Meteorological SCADA Network</span>
        </div>

        <div className={styles.agencyMeta}>
          <div className={`${styles.statusPill} ${styles[riskVariant]}`}>
            <span className={styles.liveDot} />
            <span>OP-STATE: {riskStatus}</span>
          </div>

          <div className={styles.telemetryClock}>
            <span>SCADA Sync: {formatDateTime(latestTelemetryTime)}</span>
          </div>
        </div>
      </div>

      {/* 2. Top Header & Quick Actions */}
      <div className={styles.topBar}>
        <div className={styles.headingGroup}>
          <h1 className={styles.pageTitle}>Reservoir Operations & Early-Warning Console</h1>
          <p className={styles.pageSubtitle}>
            Supervisory Control and Data Acquisition (SCADA) • Automated Hydrological Mass Balance
          </p>
        </div>

        <div className={styles.topActions}>
          <button onClick={handleRefresh} className={styles.refreshBtn} title="Force Database Sync">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Sync DB</span>
          </button>

          <Link href="/monitoring" className={styles.primaryAction}>
            <span>Full Multi-Curve Telemetry</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      {/* 3. Active Hydro-Structure Engineering Banner */}
      <div className={styles.damBanner}>
        <div className={styles.damHeaderMain}>
          <div>
            <div className={styles.damTitleRow}>
              <span className={styles.damName}>{selectedDam?.dam_name || 'Victoria Dam'}</span>
              <span className={styles.damCode}>
                ID: {selectedDam?.dam_id ? `DAM-0${selectedDam.dam_id}` : 'DAM-01'}
              </span>
              <Badge variant={riskVariant}>{riskStatus}</Badge>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <MapPin size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
              <span>{selectedDam?.location || 'Mahaweli River Basin, Central Province'}</span>
            </div>
          </div>

          {statusData?.risk_status?.trigger_reason && (
            <div className={styles.damReason}>
              <strong>Trigger Evaluation:</strong> {statusData.risk_status.trigger_reason}
            </div>
          )}
        </div>

        {/* Structural Specifications Strip */}
        <div className={styles.damSpecsStrip}>
          <div className={styles.specItem}>
            <span className={styles.specLabel}>Crest Elevation</span>
            <span className={styles.specVal}>{crestElev.toFixed(1)} m AMSL</span>
          </div>

          <div className={styles.specItem}>
            <span className={styles.specLabel}>Current Reservoir Stage</span>
            <span className={styles.specVal}>{currentStageM} m AMSL</span>
          </div>

          <div className={styles.specItem}>
            <span className={styles.specLabel}>Remaining Freeboard</span>
            <span className={styles.specVal}>{freeboardM} m to Crest</span>
          </div>

          <div className={styles.specItem}>
            <span className={styles.specLabel}>Gross Reservoir Storage</span>
            <span className={styles.specVal}>
              {selectedDam?.reservoir_capacity ? `${(selectedDam.reservoir_capacity / 1e6).toFixed(0)} MCM` : '722 MCM'}
            </span>
          </div>

          <div className={styles.specItem}>
            <span className={styles.specLabel}>Max Spillway Sluice</span>
            <span className={styles.specVal}>
              {selectedDam?.max_gate_capacity ? `${selectedDam.max_gate_capacity} m³/s` : '8,200 m³/s'}
            </span>
          </div>

          <div className={styles.specItem}>
            <span className={styles.specLabel}>Safe Downstream Limit</span>
            <span className={styles.specVal}>
              {selectedDam?.downstream_capacity ? `${selectedDam.downstream_capacity} m³/s` : '600 m³/s'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Precision SCADA Engineering Metrics Grid (6 Columns) */}
      <div className={styles.metricsGrid}>
        {/* Metric 1: Water Level */}
        <div className={styles.metricBlock}>
          <div className={styles.metricTop}>
            <span className={styles.metricTitle}>Stage Water Level</span>
            <Waves size={14} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNum}>
              {waterLevelNum != null ? waterLevelNum.toFixed(1) : '—'}
            </span>
            <span className={styles.metricUnit}>%</span>
          </div>
          <div className={styles.metricFooter}>
            <span>AMSL: {currentStageM}m</span>
            <span className={styles.metricMeta}>Freeboard: {freeboardM}m</span>
          </div>
        </div>

        {/* Metric 2: Rate of Rise (dL/dt) */}
        <div className={styles.metricBlock}>
          <div className={styles.metricTop}>
            <span className={styles.metricTitle}>Rate of Rise (dL/dt)</span>
            <TrendingUp size={14} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNum}>
              {rrShortNum != null ? (rrShortNum > 0 ? `+${rrShortNum.toFixed(2)}` : rrShortNum.toFixed(2)) : '0.00'}
            </span>
            <span className={styles.metricUnit}>%/hr</span>
          </div>
          <div className={styles.metricFooter}>
            <span>Band: {statusData?.metrics?.rr_band || 'NORMAL'}</span>
            <span className={styles.metricMeta}>
              Acc: {statusData?.metrics?.acc != null ? Number(statusData.metrics.acc).toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Metric 3: Catchment Inflow */}
        <div className={styles.metricBlock}>
          <div className={styles.metricTop}>
            <span className={styles.metricTitle}>Catchment Inflow</span>
            <Droplets size={14} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNum}>
              {inflowRateNum != null ? inflowRateNum.toFixed(1) : '—'}
            </span>
            <span className={styles.metricUnit}>m³/s</span>
          </div>
          <div className={styles.metricFooter}>
            <span>Baseline: {selectedDam?.if_baseline || 50} m³/s</span>
            <span className={styles.metricMeta}>
              {inflowRateNum && selectedDam?.if_baseline
                ? `${(inflowRateNum / selectedDam.if_baseline).toFixed(1)}x`
                : '1.0x'}
            </span>
          </div>
        </div>

        {/* Metric 4: Downstream River Stage */}
        <div className={styles.metricBlock}>
          <div className={styles.metricTop}>
            <span className={styles.metricTitle}>Downstream Riverbed</span>
            <Gauge size={14} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNum}>
              {downstreamLevelNum != null ? downstreamLevelNum.toFixed(1) : '—'}
            </span>
            <span className={styles.metricUnit}>%</span>
          </div>
          <div className={styles.metricFooter}>
            <span>Safe Channel: {selectedDam?.downstream_capacity || 600} m³/s</span>
            <span className={styles.metricMeta}>
              {downstreamLevelNum != null ? `${(100 - downstreamLevelNum).toFixed(0)}% Headroom` : '—'}
            </span>
          </div>
        </div>

        {/* Metric 5: Adaptive Safety Threshold */}
        <div className={styles.metricBlock}>
          <div className={styles.metricTop}>
            <span className={styles.metricTitle}>Adaptive Threshold</span>
            <Sliders size={14} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNum}>
              {adaptiveThresholdNum.toFixed(1)}
            </span>
            <span className={styles.metricUnit}>%</span>
          </div>
          <div className={styles.metricFooter}>
            <span>
              {statusData?.threshold?.floor_triggered ? 'Floor Active (30%)' : 'Dynamic Buffer'}
            </span>
            <span className={styles.metricMeta}>
              {waterLevelNum != null
                ? `Gap: ${(adaptiveThresholdNum - waterLevelNum).toFixed(1)}%`
                : '—'}
            </span>
          </div>
        </div>

        {/* Metric 6: Spillway Discharge Recommendation */}
        <div className={styles.metricBlock}>
          <div className={styles.metricTop}>
            <span className={styles.metricTitle}>Spillway Sluice Target</span>
            <Activity size={14} className={styles.metricIcon} />
          </div>
          <div className={styles.metricValRow}>
            <span className={styles.metricNum}>
              {qReleaseNum != null ? qReleaseNum.toFixed(1) : '0.0'}
            </span>
            <span className={styles.metricUnit}>m³/s</span>
          </div>
          <div className={styles.metricFooter}>
            <span>Gate Opening: {gateOpeningPct}%</span>
            <span className={styles.metricMeta}>
              {statusData?.release?.conflict_warning ? '⚠️ Constrained' : 'Optimal'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Direct SCADA Dual Hydrographs (Stage Level & Hydraulic Mass Balance) */}
      <div className={styles.chartsGrid}>
        {/* Hydrograph 1: Reservoir Stage vs Adaptive Threshold */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Reservoir Stage Hydrograph</div>
              <div className={styles.chartDesc}>
                Water Level percentage vs Real-time Adaptive Threshold (Dynamic Flood Buffer)
              </div>
            </div>
            <div className={styles.chartBadge}>TELEMETRY CURVE (6H)</div>
          </div>

          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                data={hydrographSeries}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                  iconType="plainline"
                />
                <ReferenceLine
                  y={100}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  label={{ value: 'FSL 100%', fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }}
                />
                <ReferenceLine
                  y={75}
                  stroke="#ca8a04"
                  strokeDasharray="4 4"
                  label={{ value: 'Base 75%', fill: '#ca8a04', fontSize: 9, position: 'insideTopRight' }}
                />
                <Line
                  type="monotone"
                  dataKey="waterLevel"
                  name="Water Level (%)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="threshold"
                  name="Adaptive Threshold (%)"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hydrograph 2: Hydraulic Mass Balance (Inflow vs Outflow) */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <div className={styles.chartTitle}>Hydraulic Mass Balance Curve</div>
              <div className={styles.chartDesc}>
                Catchment River Inflow (Qin) vs Recommended Sluice Discharge (Qrelease)
              </div>
            </div>
            <div className={styles.chartBadge}>DISCHARGE (m³/s)</div>
          </div>

          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart
                data={hydraulicBalanceSeries}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickLine={false}
                  unit=" m³/s"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }}
                  iconType="plainline"
                />
                <ReferenceLine
                  y={selectedDam?.downstream_capacity || 600}
                  stroke="#f97316"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Safe River Limit (600 m³/s)',
                    fill: '#f97316',
                    fontSize: 9,
                    position: 'insideTopRight',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="inflow"
                  name="Inflow Qin (m³/s)"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="release"
                  name="Sluice Release Qout (m³/s)"
                  stroke="#10b981"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 6. Technical Engineering Tables (Catchment Network & Recent Alerts) */}
      <div className={styles.tablesGrid}>
        {/* Table A: Catchment Gauging Network (Sub-basin Stations) */}
        <Card>
          <CardHeader
            action={
              <Link href="/rainfall" style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>
                View Catchment Model →
              </Link>
            }
          >
            <CardTitle>Catchment Hydrometric Gauging Stations</CardTitle>
            <CardDescription>
              Isochrone weighted precipitation stations contributing to {selectedDam?.dam_name || 'reservoir'} (Weighted Net: {rNetNum} mm/hr)
            </CardDescription>
          </CardHeader>
          <CardContent noPadding>
            <div className={styles.tableContainer}>
              <table className={styles.scadaTable}>
                <thead>
                  <tr>
                    <th>Station Code</th>
                    <th>Sub-Basin Location</th>
                    <th>Elevation</th>
                    <th>Lag Time</th>
                    <th>Weight (Wi)</th>
                    <th>Rainfall (mm/hr)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stations.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                        Loading hydrometric telemetry...
                      </td>
                    </tr>
                  ) : (
                    stations.map((st) => (
                      <tr key={st.location_id}>
                        <td className={styles.monoCell}>{st.station_code || `MET-0${st.location_id}`}</td>
                        <td className={styles.primaryCell}>{st.location_name}</td>
                        <td className={styles.monoCell}>
                          {st.elevation_m ? `${st.elevation_m}m` : '—'}
                        </td>
                        <td className={styles.monoCell}>{st.delay_minutes} min</td>
                        <td className={styles.monoCell}>{st.weight}</td>
                        <td className={styles.monoCell} style={{ fontWeight: 600 }}>
                          {Number(st.rainfall_mm_hr || 0).toFixed(1)} mm/hr
                        </td>
                        <td>
                          <span className={`${styles.statusIndicator} ${styles.online}`}>
                            <span className={styles.liveDot} />
                            <span>ONLINE</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Table B: SCADA Safety Audit & Event Log */}
        <Card>
          <CardHeader
            action={
              <Link href="/control" style={{ fontSize: '0.72rem', color: 'var(--accent)' }}>
                Audit Console →
              </Link>
            }
          >
            <CardTitle>SCADA Early-Warning Log</CardTitle>
            <CardDescription>Recent threshold violations and automated safety advisories</CardDescription>
          </CardHeader>
          <CardContent noPadding>
            {alerts.length === 0 ? (
              <div className={styles.emptyAlerts}>
                <CheckCircle size={20} style={{ color: 'var(--status-green)' }} />
                <span>All telemetry nominal • Zero active safety alerts</span>
              </div>
            ) : (
              <div className={styles.alertsList}>
                {alerts.map((al) => (
                  <div key={al.alert_id} className={styles.alertItem}>
                    <div className={styles.alertTop}>
                      <Badge
                        variant={
                          al.severity === 'CRITICAL' || al.severity === 'RED'
                            ? 'critical'
                            : al.severity === 'WARNING' || al.severity === 'ORANGE'
                            ? 'warning'
                            : 'watch'
                        }
                      >
                        {al.severity || 'ALERT'}
                      </Badge>
                      <span className={styles.alertTime}>
                        {formatDateTime(al.alert_time || al.created_at)}
                      </span>
                    </div>
                    <div className={styles.alertReason}>
                      {al.message || al.trigger_reason || 'Hydraulic parameter exceeded safety margin.'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 7. Structural Safety Limits Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Hydraulic Operating Parameters & Structural Limits</CardTitle>
          <CardDescription>
            Design limits established under the National Dam Safety Framework for {selectedDam?.dam_name}
          </CardDescription>
        </CardHeader>
        <CardContent noPadding>
          <div className={styles.limitsGrid}>
            <div className={styles.limitBox}>
              <span className={styles.limitTitle}>Crest Elevation (AMSL)</span>
              <span className={styles.limitVal}>{crestElev.toFixed(2)} m</span>
              <span className={styles.limitSub}>Current Stage: {currentStageM} m</span>
            </div>

            <div className={styles.limitBox}>
              <span className={styles.limitTitle}>Spillway Radial Sluices</span>
              <span className={styles.limitVal}>8x Crest Radial Gates</span>
              <span className={styles.limitSub}>
                Max Discharge: {selectedDam?.max_gate_capacity || 8200} m³/s
              </span>
            </div>

            <div className={styles.limitBox}>
              <span className={styles.limitTitle}>Downstream River Capacity</span>
              <span className={styles.limitVal}>{selectedDam?.downstream_capacity || 600} m³/s</span>
              <span className={styles.limitSub}>Non-damage channel limit</span>
            </div>

            <div className={styles.limitBox}>
              <span className={styles.limitTitle}>Operational Safety Margins</span>
              <span className={styles.limitVal}>
                Base: {selectedDam?.base_threshold || 75}% • Floor: {selectedDam?.threshold_floor || 30}%
              </span>
              <span className={styles.limitSub}>Adaptive Algorithm v2.4</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
