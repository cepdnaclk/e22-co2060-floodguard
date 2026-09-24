'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatDateTime } from '@/lib/dateUtils';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Clock,
  Gauge,
  Sliders,
  Waves,
  TrendingUp,
  Shield,
} from 'lucide-react';
import styles from './monitoring.module.css';

const TIMEFRAMES = [
  { id: '1H', label: '1H', ms: 1 * 3600 * 1000 },
  { id: '6H', label: '6H', ms: 6 * 3600 * 1000 },
  { id: '1D', label: '24H', ms: 24 * 3600 * 1000 },
  { id: '1W', label: '7D', ms: 7 * 24 * 3600 * 1000 },
  { id: '1M', label: '30D', ms: 30 * 24 * 3600 * 1000 },
];

export default function MonitoringPage() {
  const { selectedDamId, selectedDam } = useApp();

  const [timeframe, setTimeframe] = useState('6H');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusData, setStatusData] = useState(null);
  const [crossingData, setCrossingData] = useState(null);
  const [waterLevelData, setWaterLevelData] = useState({ live: [], predicted: [] });
  const [thresholdData, setThresholdData] = useState({ live: [], predicted: [] });
  const [inflowData, setInflowData] = useState({ live: [], predicted: [] });
  const [releaseData, setReleaseData] = useState({ live: [], predicted: [] });
  const [riseRateData, setRiseRateData] = useState({ live: [], predicted: [] });

  const getFromTime = useCallback((tf) => {
    const item = TIMEFRAMES.find((t) => t.id === tf) || TIMEFRAMES[1];
    return new Date(Date.now() - item.ms).toISOString();
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedDamId) return;
    const fromTime = getFromTime(timeframe);

    try {
      const [
        statusRes,
        crossingRes,
        wlRes,
        thRes,
        ifRes,
        relRes,
        rrRes,
      ] = await Promise.all([
        fetch(`/api/dams/${selectedDamId}/status`),
        fetch(`/api/dams/${selectedDamId}/crossing`),
        fetch(`/api/dams/${selectedDamId}/chart/water-level?from=${encodeURIComponent(fromTime)}`),
        fetch(`/api/dams/${selectedDamId}/chart/threshold?from=${encodeURIComponent(fromTime)}`),
        fetch(`/api/dams/${selectedDamId}/chart/inflow?from=${encodeURIComponent(fromTime)}`),
        fetch(`/api/dams/${selectedDamId}/chart/release?from=${encodeURIComponent(fromTime)}`),
        fetch(`/api/dams/${selectedDamId}/chart/rise-rate?from=${encodeURIComponent(fromTime)}`),
      ]);

      if (statusRes.ok) setStatusData(await statusRes.json());
      if (crossingRes.ok) setCrossingData(await crossingRes.json());
      if (wlRes.ok) setWaterLevelData(await wlRes.json());
      if (thRes.ok) setThresholdData(await thRes.json());
      if (ifRes.ok) setInflowData(await ifRes.json());
      if (relRes.ok) setReleaseData(await relRes.json());
      if (rrRes.ok) setRiseRateData(await rrRes.json());
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDamId, timeframe, getFromTime]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Merge Water Level and Threshold into single timeline
  const levelChartSeries = useMemo(() => {
    const map = new Map();

    (waterLevelData.live || []).forEach((d) => {
      const t = new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      map.set(d.time, { time: t, iso: d.time, waterLevel: d.value });
    });

    (thresholdData.live || []).forEach((d) => {
      const existing = map.get(d.time) || {
        time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        iso: d.time,
      };
      existing.threshold = d.value;
      map.set(d.time, existing);
    });

    (waterLevelData.predicted || []).forEach((d) => {
      const t = new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const existing = map.get(d.time) || { time: t, iso: d.time };
      existing.predictedLevel = d.value;
      map.set(d.time, existing);
    });

    (thresholdData.predicted || []).forEach((d) => {
      const existing = map.get(d.time) || {
        time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        iso: d.time,
      };
      existing.predictedThreshold = d.value;
      map.set(d.time, existing);
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.iso) - new Date(b.iso));
  }, [waterLevelData, thresholdData]);

  // Inflow & Release Chart Series
  const inflowReleaseSeries = useMemo(() => {
    const map = new Map();

    (inflowData.live || []).forEach((d) => {
      const t = new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      map.set(d.time, { time: t, iso: d.time, inflow: d.value });
    });

    (releaseData.live || []).forEach((d) => {
      const existing = map.get(d.time) || {
        time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        iso: d.time,
      };
      existing.release = d.value;
      existing.gatePct = d.gate_pct;
      map.set(d.time, existing);
    });

    return Array.from(map.values()).sort((a, b) => new Date(a.iso) - new Date(b.iso));
  }, [inflowData, releaseData]);

  // Rise rate series
  const riseRateSeries = useMemo(() => {
    return (riseRateData.live || []).map((d) => ({
      time: new Date(d.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      iso: d.time,
      rr_short: d.rr_short,
      rr_long: d.rr_long,
      acc: d.acc,
    }));
  }, [riseRateData]);

  const releaseInfo = statusData?.release;
  const isConflict = releaseInfo?.conflict_warning;
  const ttcMinutes = crossingData?.ttc_minutes;
  const latestTelemetryTime =
    statusData?.water_level?.reading_time ||
    statusData?.risk_status?.status_time ||
    statusData?.threshold?.calc_time;

  return (
    <div className={styles.container}>
      {/* Formal Government Agency & SCADA Sync Bar */}
      <div className={styles.agencyStrip}>
        <div className={styles.agencyTitle}>
          <Shield size={14} style={{ color: 'var(--accent)' }} />
          <span>Hydrometric Station SCADA • Telemetry Stream</span>
        </div>
        <div className={styles.telemetryClock}>
          <span className={styles.liveDot} />
          <span>Latest Ingestion: {formatDateTime(latestTelemetryTime)}</span>
        </div>
      </div>

      {/* Top Header & Controls */}
      <div className={styles.topBar}>
        <div className={styles.headingGroup}>
          <h1 className={styles.pageTitle}>Live Telemetry & Curves</h1>
          <p className={styles.pageSubtitle}>
            {selectedDam?.dam_name || 'Reservoir'} — Real-time sensor synchronization & predictive projections
          </p>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.timeframeGroup}>
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`${styles.tfBtn} ${timeframe === tf.id ? styles.tfBtnActive : ''}`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button onClick={handleRefresh} className={styles.refreshBtn} title="Refresh Telemetry">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Decision Support & Crossing Panels */}
      <div className={styles.strategyGrid}>
        {/* Release Recommendation Card */}
        <Card>
          <CardHeader
            action={
              <Badge variant={isConflict ? 'orange' : 'normal'}>
                {releaseInfo?.strategy || 'STABLE'}
              </Badge>
            }
          >
            <CardTitle>Spillway Release Decision Strategy</CardTitle>
            <CardDescription>Automated hydraulic rule-curve & downstream clearance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.strategyContent}>
              <div className={styles.strategyStats}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Recommended Release</span>
                  <span className={styles.statVal}>
                    {releaseInfo?.q_release != null ? `${Number(releaseInfo.q_release).toFixed(1)} m³/s` : '—'}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Gate Opening Target</span>
                  <span className={styles.statVal}>
                    {releaseInfo?.gate_opening_applied_pct != null
                      ? `${Number(releaseInfo.gate_opening_applied_pct).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Target Safe Level</span>
                  <span className={styles.statVal}>
                    {releaseInfo?.target_safe_level != null
                      ? `${Number(releaseInfo.target_safe_level).toFixed(1)}%`
                      : '65.0%'}
                  </span>
                </div>
              </div>

              {isConflict ? (
                <div className={styles.conflictAlert}>
                  <AlertTriangle size={16} />
                  <span>
                    <strong>Downstream Capacity Constraint:</strong> Recommended release throttled to prevent river channel flooding.
                  </span>
                </div>
              ) : (
                <div className={styles.safeNotice}>
                  <CheckCircle size={16} />
                  <span>Downstream channel capacity nominal. Spillway discharge operating within safe discharge envelope.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Crossing Time Prediction Card */}
        <Card>
          <CardHeader>
            <CardTitle>Threshold Crossing Forecast</CardTitle>
            <CardDescription>Predictive extrapolation based on inflow gradient</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.crossingContent}>
              <div className={styles.crossingHero}>
                <span className={styles.ttcNumber}>
                  {ttcMinutes != null ? (ttcMinutes > 0 ? ttcMinutes : '0') : '—'}
                </span>
                <span className={styles.ttcUnit}>
                  {ttcMinutes != null ? 'Minutes to Threshold' : 'No Crossing Detected'}
                </span>
              </div>

              <div className={styles.crossingDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Crossing Probability</span>
                  <span className={styles.detailVal}>
                    {crossingData?.crossing_detected ? 'HIGH' : 'LOW'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Projected Timestamp</span>
                  <span className={styles.detailVal}>
                    {crossingData?.projected_crossing_time
                      ? formatDateTime(crossingData.projected_crossing_time)
                      : 'N/A'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Water Rise Gradient</span>
                  <span className={styles.detailVal}>
                    {statusData?.release?.rise_rate_used != null
                      ? `${Number(statusData.release.rise_rate_used).toFixed(2)} %/hr`
                      : '0.00 %/hr'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Primary Chart: Water Level vs Adaptive Threshold */}
      <Card>
        <CardHeader
          action={
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#2563eb' }} />
                <span>Water Level (%)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#ea580c' }} />
                <span>Adaptive Threshold (%)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#93c5fd', borderTop: '2px dashed #2563eb' }} />
                <span>Forecast Curve</span>
              </div>
            </div>
          }
        >
          <CardTitle>Water Level vs. Adaptive Threshold</CardTitle>
          <CardDescription>
            Continuous reservoir stage monitoring and 2-hour predictive safety trajectory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={levelChartSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  domain={['auto', 'auto']}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.iso ? formatDateTime(payload[0].payload.iso) : label
                  }
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e5e9',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="waterLevel"
                  name="Water Level"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="threshold"
                  name="Adaptive Threshold"
                  stroke="#ea580c"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="predictedLevel"
                  name="Predicted Level"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="predictedThreshold"
                  name="Predicted Threshold"
                  stroke="#ea580c"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Charts: Inflow/Release & Rise Rate */}
      <div className={styles.twoCols}>
        <Card>
          <CardHeader>
            <CardTitle>Inflow & Discharge Rates</CardTitle>
            <CardDescription>Catchment inflow vs. controlled spillway discharge (m³/s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={inflowReleaseSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.iso ? formatDateTime(payload[0].payload.iso) : label
                    }
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e5e9',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="inflow"
                    name="Inflow (m³/s)"
                    stroke="#0284c7"
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="release"
                    name="Spillway Release (m³/s)"
                    stroke="#16a34a"
                    strokeWidth={1.8}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Water Rise Rate Dynamics</CardTitle>
            <CardDescription>Short-term and long-term rate of change (% / hr)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riseRateSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <Tooltip
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.iso ? formatDateTime(payload[0].payload.iso) : label
                    }
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e5e9',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="rr_short"
                    name="RR Short (15m)"
                    stroke="#8b5cf6"
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rr_long"
                    name="RR Long (1h)"
                    stroke="#ec4899"
                    strokeWidth={1.6}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
