'use client';

// React Core
import { useEffect, useState, useCallback } from 'react';

// Recharts (Data Visualization)
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Legend 
} from 'recharts';

// Lucide React (Icons)
import { Waves, AlertTriangle, Shield, CheckCircle, Clock, User, LogOut, Loader2, Calendar } from 'lucide-react';

// Styles
import styles from './page.module.css';

export default function Dashboard() {
  // --------------------------------------------------------
  // 1. Core Data States
  // --------------------------------------------------------
  const [isMounted, setIsMounted] = useState(false);
  const [dams, setDams] = useState([]);
  const [selectedDamId, setSelectedDamId] = useState('');
  const [damInfo, setDamInfo] = useState(null);
  const [damStatus, setDamStatus] = useState(null);
  const [crossingResult, setCrossingResult] = useState(null);
  const [stations, setStations] = useState([]);
  const [stationRainfall, setStationRainfall] = useState({});
  const [maxRainfallStation, setMaxRainfallStation] = useState(null);

  // --------------------------------------------------------
  // 2. Chart Data States
  // --------------------------------------------------------
  const [charts, setCharts] = useState({
    waterLevel: { live: [], predicted: [] },
    threshold: { live: [], predicted: [] },
    netRainfall: { live: [], predicted: [] },
    inflow: { live: [], predicted: [] },
    release: { live: [], predicted: [] },
    riseRate: { live: [], predicted: [] }
  });

  // Navigation & Control States
  const [activeTab, setActiveTab] = useState('HOME');
  const [timeframe, setTimeframe] = useState('6H');
  const [staleConnection, setStaleConnection] = useState(false);
  const [loading, setLoading] = useState(true);

  // Authentication & Alert Management States
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginFields, setLoginFields] = useState({ name: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [unackAlerts, setUnackAlerts] = useState([]);

  // History Tab States
  const [historyCategory, setHistoryCategory] = useState('water-level');
  const [historyRange, setHistoryRange] = useState(() => ({
    from: new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 16), // last 24h
    to: new Date().toISOString().slice(0, 16)
  }));
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dateError, setDateError] = useState('');
  const [referenceTime, setReferenceTime] = useState(null);

  // Helper to compute from timestamp
  const getFromTime = useCallback((tf) => {
    const now = new Date();
    if (tf === '1H') return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    if (tf === '6H') return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
    if (tf === '1D') return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    if (tf === '1W') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    if (tf === '1M') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  }, []);

  // Check auth session
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    }
  };

  // Fetch alerts
  const fetchAlerts = useCallback(async (damId) => {
    if (!damId) return;
    try {
      const res = await fetch(`/api/dams/${damId}/alerts?acknowledged=false`);
      if (res.ok) {
        const data = await res.json();
        setUnackAlerts(data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, []);

  // Fetch static and dynamic data
  const fetchData = useCallback(async () => {
    if (!selectedDamId) return;
    
    try {
      const fromTime = getFromTime(timeframe);
      const toTime = new Date().toISOString();
      
      // Determine resolution hint based on timeframe
      let resolution = 'raw';
      if (timeframe === '1D') resolution = '15m';
      if (timeframe === '1W' || timeframe === '1M') resolution = '1h';

      // 1. Fetch Dam Static Details
      const infoRes = await fetch(`/api/dams/${selectedDamId}`);
      if (!infoRes.ok) throw new Error('Dam info failed');
      const infoData = await infoRes.json();
      setDamInfo(infoData);

      // 2. Fetch Dam Latest Status
      const statusRes = await fetch(`/api/dams/${selectedDamId}/status`);
      if (!statusRes.ok) throw new Error('Dam status failed');
      const statusData = await statusRes.json();
      setDamStatus(statusData);

      // 3. Fetch Crossing forecast results
      const crossingRes = await fetch(`/api/dams/${selectedDamId}/crossing`);
      if (crossingRes.ok) {
        const crossingData = await crossingRes.json();
        setCrossingResult(crossingData);
      } else {
        setCrossingResult(null);
      }

      // 4. Fetch Rainfall Stations List
      const stationsRes = await fetch(`/api/dams/${selectedDamId}/rainfall-stations`);
      if (stationsRes.ok) {
        const stationsData = await stationsRes.json();
        setStations(stationsData);
        
        // Fetch latest rainfall reading for each station to find the maximum reporting station
        let maxStation = null;
        let maxVal = -1;
        const stationRainMap = {};

        await Promise.all(stationsData.map(async (st) => {
          const rfRes = await fetch(`/api/dams/${selectedDamId}/rainfall-stations/${st.location_id}/rainfall?from=${new Date(Date.now() - 30 * 60 * 1000).toISOString()}`); // check last 30m
          if (rfRes.ok) {
            const rfData = await rfRes.json();
            const latest = rfData.live && rfData.live.length > 0 ? rfData.live[rfData.live.length - 1].value : 0.0;
            stationRainMap[st.location_id] = latest;
            if (latest > maxVal) {
              maxVal = latest;
              maxStation = { name: st.location_name, value: latest };
            }
          }
        }));
        
        setStationRainfall(stationRainMap);
        setMaxRainfallStation(maxStation);
      }

      // 5. Fetch Chart Metrics
      const metrics = ['water-level', 'threshold', 'net-rainfall', 'inflow', 'release', 'rise-rate'];
      const chartResults = {};

      await Promise.all(metrics.map(async (m) => {
        const chartRes = await fetch(`/api/dams/${selectedDamId}/chart/${m}?from=${fromTime}&to=${toTime}&resolution=${resolution}`);
        if (chartRes.ok) {
          chartResults[m] = await chartRes.json();
        } else {
          chartResults[m] = { live: [], predicted: [] };
        }
      }));

      setCharts({
        waterLevel: chartResults['water-level'] || { live: [], predicted: [] },
        threshold: chartResults['threshold'] || { live: [], predicted: [] },
        netRainfall: chartResults['net-rainfall'] || { live: [], predicted: [] },
        inflow: chartResults['inflow'] || { live: [], predicted: [] },
        release: chartResults['release'] || { live: [], predicted: [] },
        riseRate: chartResults['rise-rate'] || { live: [], predicted: [] }
      });

      // Clear stale connection flag on success
      setStaleConnection(false);
      setLoading(false);

    } catch (err) {
      console.error('API Fetch Error:', err);
      setStaleConnection(true);
      setLoading(false);
    }
  }, [selectedDamId, timeframe, getFromTime]);

  // Load list of dams on mount
  useEffect(() => {
    // Defer mount updates to satisfy React purity rules and avoid cascading renders
    const timer = setTimeout(() => {
      setIsMounted(true);
      setReferenceTime(Date.now());
      checkAuth();
    }, 0);

    const fetchDamsList = async () => {
      try {
        const res = await fetch('/api/dams');
        if (res.ok) {
          const data = await res.json();
          setDams(data);
          if (data.length > 0) {
            setSelectedDamId(data[0].dam_id.toString());
          }
        } else {
          setStaleConnection(true);
        }
      } catch (err) {
        setStaleConnection(true);
      }
    };
    
    fetchDamsList();
    return () => clearTimeout(timer);
  }, []);

  // Poll for updates
  useEffect(() => {
    if (!selectedDamId) return;
    
    // Defer initial telemetry fetch to satisfy compiler rules and prevent cascading renders
    const timer = setTimeout(() => {
      fetchData();
      fetchAlerts(selectedDamId);
    }, 0);
    
    const interval = setInterval(() => {
      fetchData();
      fetchAlerts(selectedDamId);
      setReferenceTime(Date.now());
    }, 15000); // 15-second update loop
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [selectedDamId, timeframe, fetchData, fetchAlerts]);

  // Perform history search
  const handleQueryHistory = async () => {
    if (!selectedDamId) return;
    setDateError('');
    
    const fromTime = new Date(historyRange.from).getTime();
    const toTime = new Date(historyRange.to).getTime();
    
    if (fromTime > toTime) {
      setDateError('Error: "From" date cannot be after "To" date.');
      return;
    }
    
    setHistoryLoading(true);
    try {
      const fromISO = new Date(historyRange.from).toISOString();
      const toISO = new Date(historyRange.to).toISOString();
      const res = await fetch(`/api/dams/${selectedDamId}/history/${historyCategory}?from=${fromISO}&to=${toISO}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      } else {
        setHistoryData([]);
      }
    } catch (err) {
      console.error('History API error:', err);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Perform login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginFields)
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setShowLoginModal(false);
        setLoginFields({ name: '', password: '' });
        if (selectedDamId) fetchAlerts(selectedDamId);
      } else {
        const data = await res.json();
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Server unreachable');
    }
  };

  // Perform logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setUnackAlerts([]);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = async (alertId) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        if (selectedDamId) {
          fetchAlerts(selectedDamId);
          fetchData();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Acknowledge failed');
      }
    } catch (err) {
      alert('Network error acknowledging alert');
    }
  };

  // Merge water-level and threshold data for main chart plotting
  const mergeMainChartData = () => {
    const map = {};
    
    charts.waterLevel.live?.forEach(p => {
      const t = new Date(p.time).getTime();
      if (!map[t]) map[t] = { time: t };
      map[t].live_level = p.value;
    });
    
    charts.waterLevel.predicted?.forEach(p => {
      const t = new Date(p.time).getTime();
      if (!map[t]) map[t] = { time: t };
      map[t].pred_level = p.value;
    });
    
    charts.threshold.live?.forEach(p => {
      const t = new Date(p.time).getTime();
      if (!map[t]) map[t] = { time: t };
      map[t].live_threshold = p.value;
    });
    
    charts.threshold.predicted?.forEach(p => {
      const t = new Date(p.time).getTime();
      if (!map[t]) map[t] = { time: t };
      map[t].pred_threshold = p.value;
    });
    
    return Object.values(map).sort((a, b) => a.time - b.time);
  };

  // Merge supporting single series (live + predicted)
  const mergeSeriesData = (series) => {
    const map = {};
    
    series.live?.forEach(p => {
      const t = new Date(p.time).getTime();
      if (!map[t]) map[t] = { time: t };
      map[t].live_val = p.value;
    });
    
    series.predicted?.forEach(p => {
      const t = new Date(p.time).getTime();
      if (!map[t]) map[t] = { time: t };
      map[t].pred_val = p.value;
    });
    
    return Object.values(map).sort((a, b) => a.time - b.time);
  };

  // Format timestamp for XAxis
  const formatXAxisTime = (timeMs) => {
    return new Date(timeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Status badge logic
  const getStatusColor = (status) => {
    if (status === 'RED') return 'var(--status-red)';
    if (status === 'ORANGE') return 'var(--status-orange)';
    if (status === 'YELLOW') return 'var(--status-yellow)';
    return 'var(--status-green)';
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <Loader2 className={styles.spinner} size={40} />
        <div>LOAD SCADA DASHBOARD TELEMETRY...</div>
      </div>
    );
  }

  const activeStatus = damStatus?.risk_status?.status || 'GREEN';
  const mainChartData = mergeMainChartData();

  return (
    <div className={styles.dashboard}>
      {/* CONNECTION ERROR FLOATING BANNER */}
      {staleConnection && (
        <div className={styles.connectionBanner}>
          <AlertTriangle size={16} />
          <span>DATABASE SERVICE LINK LOSS — RECONNECTING... BANNERING LAST FREQUENCY PACKET</span>
        </div>
      )}

      {/* TOP COMMAND BAR */}
      <header className={styles.commandBar}>
        <div className={styles.commandLeft}>
          <div className={styles.logoText}>
            <Waves size={20} />
            <span>FloodGuard</span>
          </div>
          <label htmlFor="dam-selector" className="sr-only" style={{ display: 'none' }}>Select Reservoir Dam</label>
          <select 
            id="dam-selector"
            aria-label="Select Reservoir Dam"
            className={styles.damSelector} 
            value={selectedDamId} 
            onChange={(e) => {
              setSelectedDamId(e.target.value);
              setLoading(true);
            }}
          >
            {dams.map(dam => (
              <option key={dam.dam_id} value={dam.dam_id}>{dam.dam_name}</option>
            ))}
          </select>
        </div>

        {damInfo && (
          <div className={styles.commandCenter}>
            <div className={styles.bannerItem}>
              <span className={styles.bannerLabel}>COORDINATES</span>
              <span className={styles.bannerValue}>{Number(damInfo.latitude).toFixed(4)}°N, {Number(damInfo.longitude).toFixed(4)}°E</span>
            </div>
            <div className={styles.bannerItem}>
              <span className={styles.bannerLabel}>ELEVATION</span>
              <span className={styles.bannerValue}>{damInfo.elevation_m ? `${damInfo.elevation_m}m ASL` : 'N/A'}</span>
            </div>
            <div className={styles.bannerItem}>
              <span className={styles.bannerLabel}>CAPACITY</span>
              <span className={styles.bannerValue}>
                {damStatus?.water_level?.water_level_pct ? `${Number(damStatus.water_level.water_level_pct).toFixed(1)}% / 100%` : 'N/A'}
              </span>
            </div>
          </div>
        )}

        <div className={styles.commandRight}>
          <div className={styles.dataFreshness}>
            <div 
              className={styles.pulseDot} 
              style={{ color: staleConnection ? 'var(--status-orange)' : 'var(--status-green)' }}
            ></div>
            <span style={{ color: staleConnection ? 'var(--status-orange)' : 'var(--status-green)' }}>
              {staleConnection ? 'STALE' : 'ONLINE'}
            </span>
          </div>

          {user ? (
            <div className={styles.userPanel}>
              <User size={14} />
              <span className="font-mono">{user.name} ({user.role})</span>
              <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button type="button" className={styles.loginBtn} onClick={() => setShowLoginModal(true)}>
              ENGINEER LOGIN
            </button>
          )}
        </div>
      </header>

      {/* TABS CONTAINER */}
      <div className={styles.tabsContainer}>
        <div className={styles.tabList}>
          <button 
            type="button"
            className={`${styles.tabButton} ${activeTab === 'HOME' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('HOME')}
          >
            Home
          </button>
          <button 
            type="button"
            className={`${styles.tabButton} ${activeTab === 'RAINFALL' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('RAINFALL')}
          >
            Rainfall Details
          </button>
          <button 
            type="button"
            className={`${styles.tabButton} ${activeTab === 'HISTORY' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            History
          </button>
          {user && (
            <button 
              type="button"
              className={`${styles.tabButton} ${activeTab === 'DASHBOARD' ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab('DASHBOARD')}
            >
              Control Panel {unackAlerts.length > 0 && <span style={{ color: 'var(--status-red)', fontWeight: 'bold' }}>({unackAlerts.length})</span>}
            </button>
          )}
        </div>

        {activeTab === 'HOME' && (
          <div className={styles.timeframeSelector}>
            {['1H', '6H', '1D', '1W', '1M'].map(tf => (
              <button
                key={tf}
                type="button"
                className={`${styles.timeframeBtn} ${timeframe === tf ? styles.timeframeBtnActive : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MAIN CONTENT PORT */}
      <main className={styles.contentArea}>
        {/* ============================================================ */}
        {/* TABS 1: HOME */}
        {/* ============================================================ */}
        {activeTab === 'HOME' && damStatus && (
          <div className={styles.scadaGrid}>
            {/* Quick Status Cards */}
            <div className={`${styles.colSpan8} ${styles.statsRow}`}>
              {/* Card 1: Max Rainfall */}
              <div className={styles.statItem}>
                <span className={styles.statLabel}>MAX STATION RAINFALL</span>
                {maxRainfallStation ? (
                  <div className={styles.statValue}>
                    {maxRainfallStation.value.toFixed(1)} <span className="text-xs text-muted">mm/h</span>
                    <div className="text-[10px] text-cyan truncate mt-1">{maxRainfallStation.name}</div>
                  </div>
                ) : (
                  <div className={styles.statValue}>N/A</div>
                )}
              </div>

              {/* Card 2: Current Reservoir State */}
              <div className={styles.statItem} style={{ borderLeft: `3px solid ${getStatusColor(activeStatus)}` }}>
                <span className={styles.statLabel}>RESERVOIR STATUS</span>
                <div className={styles.statValue} style={{ color: getStatusColor(activeStatus) }}>
                  {activeStatus}
                  <span className="text-xs text-primary font-normal font-mono ml-2">
                    ({damStatus.water_level?.water_level_pct?.toFixed(1) || '0.0'}% L)
                  </span>
                </div>
              </div>

              {/* Card 3: Future Warnings */}
              <div className={styles.statItem}>
                <span className={styles.statLabel}>FORECAST STATE (TTC)</span>
                <div className={styles.statValue}>
                  {crossingResult && crossingResult.crossing_time_minutes !== null ? (
                    <span className="text-red">Crossing: {crossingResult.crossing_time_minutes} min</span>
                  ) : (
                    <span className="text-green">No Crossing</span>
                  )}
                  <div className="text-[10px] text-muted truncate mt-1">
                    {crossingResult ? `Gap Trend: ${crossingResult.gap_trend}` : 'No trend data'}
                  </div>
                </div>
              </div>
            </div>

            {/* Warning / Release Panel */}
            <div className={`${styles.colSpan4} ${styles.card} ${styles['status' + activeStatus]}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle} title="Calculated gate opening and release rate recommended by the decision support system based on current reservoir level and adaptive thresholds">RELEASE STRATEGY</span>
                <span className={`${styles.badge} ${styles['badge' + activeStatus]}`}>{activeStatus}</span>
              </div>
              {damStatus.release ? (
                <div>
                  <div className="font-mono text-sm mb-3">
                    Piecewise: <span className="text-cyan">{damStatus.release.strategy}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3 bg-panel p-2 font-mono text-xs">
                    <div>GATE APPLIED: <span className="text-red font-bold">{damStatus.release.gate_opening_applied_pct}%</span></div>
                    <div>RELEASE FLOW: <span>{damStatus.release.q_release?.toFixed(0)} m³/s</span></div>
                    <div>EST. DURATION: <span>{damStatus.release.estimated_duration_minutes ? `${damStatus.release.estimated_duration_minutes.toFixed(0)} min` : 'Continuous'}</span></div>
                    <div>TARGET SAFE: <span>{damStatus.release.target_safe_level?.toFixed(1)}% L</span></div>
                  </div>
                  {damStatus.release.conflict_warning && (
                    <div className="text-[10px] text-orange bg-[rgba(255,159,28,0.1)] p-2 border border-orange rounded">
                      WARNING: Release target exceeds safe downstream channel capacity! Recommended rate is clamped.
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.emptyState} style={{ padding: '1rem' }}>
                  No release recommendation required. Dam operating safely.
                </div>
              )}
            </div>

            {/* Main Graph (L vs AT) */}
            <div className={`${styles.colSpan8} ${styles.card}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Reservoir Level L(t) vs Adaptive Threshold AT(t)</span>
                <span className="text-[10px] text-muted font-mono">Dashed lines represent predictions</span>
              </div>
              <div style={{ width: '100%', height: 350 }}>
                {isMounted && mainChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mainChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        type="number"
                        domain={['auto', 'auto']}
                        tickFormatter={formatXAxisTime} 
                        stroke="var(--border-color)"
                        tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                      />
                      <YAxis stroke="var(--border-color)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}
                        labelFormatter={(l) => new Date(l).toLocaleString()}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font-mono)' }} />
                      
                      {/* Live level */}
                      <Line name="Level (Live)" type="monotone" dataKey="live_level" stroke="var(--water-blue)" strokeWidth={2.5} dot={false} connectNulls />
                      
                      {/* Predicted level */}
                      <Line name="Level (Predicted)" type="monotone" dataKey="pred_level" stroke="var(--water-blue)" strokeDasharray="5 5" strokeWidth={2.5} dot={false} connectNulls />
                      
                      {/* Live threshold */}
                      <Line name="Threshold (Live)" type="stepAfter" dataKey="live_threshold" stroke="var(--status-red)" strokeWidth={1.8} dot={false} connectNulls />
                      
                      {/* Predicted threshold */}
                      <Line name="Threshold (Predicted)" type="stepAfter" dataKey="pred_threshold" stroke="var(--status-red)" strokeDasharray="3 3" strokeWidth={1.8} dot={false} connectNulls />
                      
                      {referenceTime && (
                        <ReferenceLine x={referenceTime} stroke="var(--text-muted)" strokeDasharray="3 3" label={{ value: 'NOW', fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)', position: 'insideTopLeft' }} />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.emptyState}>No chart readings found for selected timeframe.</div>
                )}
              </div>
            </div>

            {/* Sidebar Graphs */}
            <div className={`${styles.colSpan4} ${styles.card}`} style={{ maxHeight: 440, overflowY: 'auto' }}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Supporting Telemetry Sidebar</span>
              </div>
              
              {/* Graph 1: Net Rainfall */}
              <div className="mb-4">
                <div className="text-[10px] font-mono text-muted mb-1 text-uppercase">NET RAINFALL R_net(t)</div>
                <div style={{ height: 100, width: '100%' }}>
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mergeSeriesData(charts.netRainfall)} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <XAxis dataKey="time" type="number" domain={['auto', 'auto']} hide />
                        <YAxis hide />
                        <Tooltip labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
                        <Area type="monotone" dataKey="live_val" stroke="var(--rain-indigo)" fill="rgba(122, 140, 255, 0.15)" strokeWidth={1.5} dot={false} connectNulls />
                        <Area type="monotone" dataKey="pred_val" stroke="var(--rain-indigo)" fill="none" strokeDasharray="3 3" strokeWidth={1.5} dot={false} connectNulls />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Graph 2: Inflow Rate */}
              <div className="mb-4">
                <div className="text-[10px] font-mono text-muted mb-1 text-uppercase">INFLOW RATE IF(t)</div>
                <div style={{ height: 100, width: '100%' }}>
                  {isMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mergeSeriesData(charts.inflow)} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <XAxis dataKey="time" type="number" domain={['auto', 'auto']} hide />
                        <YAxis hide />
                        <Tooltip labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
                        <Line type="monotone" dataKey="live_val" stroke="var(--inflow-teal)" strokeWidth={1.5} dot={false} connectNulls />
                        <Line type="monotone" dataKey="pred_val" stroke="var(--inflow-teal)" strokeDasharray="3 3" strokeWidth={1.5} dot={false} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Graph 3: Outflow / Release */}
              <div>
                <div className="text-[10px] font-mono text-muted mb-1 text-uppercase">RECOMMENDED RELEASE Q_release</div>
                <div style={{ height: 100, width: '100%' }}>
                  {isMounted && charts.release.live && charts.release.live.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={charts.release.live} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                        <XAxis dataKey="time" hide />
                        <YAxis hide />
                        <Tooltip labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
                        <Area type="step" dataKey="value" stroke="var(--status-orange)" fill="rgba(255, 159, 28, 0.1)" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center font-mono text-[10px] text-muted border border-dashed var(--border-color)">
                      Release recommendation inactive
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TABS 2: RAINFALL DETAILS */}
        {/* ============================================================ */}
        {activeTab === 'RAINFALL' && (
          <div className={styles.scadaGrid}>
            <div className={`${styles.colSpan12} ${styles.card}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>RAINFALL STATIONS DETAILS</span>
                <span className="text-xs text-muted font-mono">Sensors in the reservoir catchment area</span>
              </div>
              {stations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stations.map(st => {
                    return (
                      <div key={st.location_id} className="border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 rounded">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-mono text-xs font-bold text-primary">{st.location_name}</span>
                          <span className="text-[10px] font-mono bg-panel p-1 rounded">w={st.weight.toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-muted font-mono mb-2">
                          Delay: {st.delay_minutes} min | District: {st.district || 'N/A'}
                        </div>
                        <div style={{ height: 140, width: '100%' }}>
                          {isMounted && (
                            <StationRainfallChart 
                              locationId={st.location_id} 
                              selectedDamId={selectedDamId}
                              timeframe={timeframe}
                              getFromTime={getFromTime}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>No rainfall stations configured for this dam.</div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TABS 3: HISTORY */}
        {/* ============================================================ */}
        {activeTab === 'HISTORY' && (
          <div className={styles.scadaGrid}>
            <div className={`${styles.colSpan12} ${styles.card}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>HISTORICAL LOG RETRIEVAL</span>
              </div>
              
              {/* Date pickers & filters */}
              <div className={styles.filterRow}>
                <div className={styles.filterItem}>
                  <label htmlFor="history-category-select" className={styles.filterLabel}>CATEGORY</label>
                  <select 
                    id="history-category-select"
                    className={styles.damSelector}
                    value={historyCategory}
                    onChange={(e) => setHistoryCategory(e.target.value)}
                  >
                    <option value="water-level">Water Level</option>
                    <option value="rainfall">Rainfall (Catchment)</option>
                    <option value="inflow">Inflow</option>
                    <option value="downstream-level">Downstream Level</option>
                    <option value="risk-status">Risk Status History</option>
                    <option value="alerts">Escalation Alerts</option>
                  </select>
                </div>
                <div className={styles.filterItem}>
                  <label htmlFor="history-from-date" className={styles.filterLabel}>FROM</label>
                  <input 
                    id="history-from-date"
                    type="datetime-local" 
                    className={styles.dateInput}
                    value={historyRange.from}
                    onChange={(e) => setHistoryRange({ ...historyRange, from: e.target.value })}
                  />
                </div>
                <div className={styles.filterItem}>
                  <label htmlFor="history-to-date" className={styles.filterLabel}>TO</label>
                  <input 
                    id="history-to-date"
                    type="datetime-local" 
                    className={styles.dateInput}
                    value={historyRange.to}
                    onChange={(e) => setHistoryRange({ ...historyRange, to: e.target.value })}
                  />
                </div>
                <button className={styles.queryBtn} onClick={handleQueryHistory}>
                  {historyLoading ? 'QUERYING...' : 'RUN QUERY'}
                </button>
              </div>
              {dateError && (
                <div style={{ color: 'var(--status-red)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  {dateError}
                </div>
              )}

              {/* Data result table */}
              {historyLoading ? (
                <div className={styles.emptyState}>
                  <Loader2 className={styles.spinner} />
                  <span>Loading query payload...</span>
                </div>
              ) : historyData.length > 0 ? (
                <div className={styles.historyTableWrapper}>
                  <table className={styles.historyTable}>
                    <thead>
                      {historyCategory === 'water-level' && (
                        <tr>
                          <th>TIMESTAMP</th>
                          <th>WATER LEVEL PERCENT (%)</th>
                        </tr>
                      )}
                      {historyCategory === 'rainfall' && (
                        <tr>
                          <th>TIMESTAMP</th>
                          <th>STATION</th>
                          <th>MEASURED (mm/h)</th>
                        </tr>
                      )}
                      {historyCategory === 'inflow' && (
                        <tr>
                          <th>TIMESTAMP</th>
                          <th>INFLOW RATE (m³/s)</th>
                        </tr>
                      )}
                      {historyCategory === 'downstream-level' && (
                        <tr>
                          <th>TIMESTAMP</th>
                          <th>DOWNSTREAM LEVEL (%)</th>
                        </tr>
                      )}
                      {historyCategory === 'risk-status' && (
                        <tr>
                          <th>TIMESTAMP</th>
                          <th>STATUS</th>
                          <th>TTC (MIN)</th>
                          <th>PREVIOUS STATUS</th>
                          <th>TRIGGER FACTOR</th>
                        </tr>
                      )}
                      {historyCategory === 'alerts' && (
                        <tr>
                          <th>TIMESTAMP</th>
                          <th>NEW STATUS</th>
                          <th>ALERT CONTENT MESSAGE</th>
                          <th>ACKNOWLEDGED BY</th>
                          <th>ACKNOWLEDGED TIME</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {historyData.map((row, idx) => (
                        <tr key={idx}>
                          <td>{new Date(row.time).toLocaleString()}</td>
                          {historyCategory === 'water-level' && <td>{row.value}%</td>}
                          {historyCategory === 'rainfall' && (
                            <>
                              <td>{row.station || 'Station'}</td>
                              <td>{row.value} mm/h</td>
                            </>
                          )}
                          {historyCategory === 'inflow' && <td>{row.value} m³/s</td>}
                          {historyCategory === 'downstream-level' && <td>{row.value}%</td>}
                          {historyCategory === 'risk-status' && (
                            <>
                              <td style={{ color: getStatusColor(row.status), fontWeight: 'bold' }}>{row.status}</td>
                              <td>{row.ttc_minutes !== null ? `${row.ttc_minutes} min` : 'N/A'}</td>
                              <td>{row.previous_status || 'N/A'}</td>
                              <td>{row.trigger_reason}</td>
                            </>
                          )}
                          {historyCategory === 'alerts' && (
                            <>
                              <td style={{ color: getStatusColor(row.new_status), fontWeight: 'bold' }}>{row.new_status}</td>
                              <td>{row.message}</td>
                              <td>{row.acknowledged_by || <span className="text-red font-bold">UNACKED</span>}</td>
                              <td>{row.acknowledged_at ? new Date(row.acknowledged_at).toLocaleString() : 'N/A'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>No records found matching query parameters.</div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TABS 4: CONTROL PANEL */}
        {/* ============================================================ */}
        {activeTab === 'DASHBOARD' && user && (
          <div className={styles.scadaGrid}>
            <div className={`${styles.colSpan12} ${styles.card}`}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>ENGINEER COMMAND CONSOLE</span>
              </div>
              <div className="mb-4 bg-panel p-4 rounded border border-[var(--border-color)]">
                <h3 className="font-mono text-sm font-bold text-cyan mb-2">USER METADATA</h3>
                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div>NAME: {user.name}</div>
                  <div>ROLE: {user.role}</div>
                  <div>ASSIGNED DAM ID: {user.assigned_dam_id || 'Global Operator'}</div>
                  <div>ENGINEER RECORD ID: {user.engineer_id}</div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>UNACKNOWLEDGED ALERTS</span>
                </div>
                {unackAlerts.length > 0 ? (
                  <div className={styles.alertList}>
                    {unackAlerts.map(alert => (
                      <div key={alert.alert_id} className={styles.alertItem}>
                        <div className={styles.alertBody}>
                          <span className={styles.alertTime}>{new Date(alert.alert_time).toLocaleString()}</span>
                          <span className={styles.alertMsg}>
                            <span style={{ color: getStatusColor(alert.new_status), fontWeight: 'bold', marginRight: '0.5rem' }}>
                              [{alert.new_status}]
                            </span>
                            {alert.message}
                          </span>
                        </div>
                        <button 
                          className={styles.ackBtn}
                          onClick={() => handleAcknowledgeAlert(alert.alert_id)}
                        >
                          ACKNOWLEDGE
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyState}>No unacknowledged alerts found. Operating cleanly.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.loginCard}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-md font-bold font-mono text-cyan">SCADA GATEWAY AUTHENTICATION</h3>
              <button className="text-muted hover:text-primary font-mono text-sm" onClick={() => setShowLoginModal(false)}>ESC</button>
            </div>
            
            {loginError && <div className="text-xs text-red bg-[rgba(255,59,59,0.15)] border border-red p-2.5 rounded mb-4 font-mono">{loginError}</div>}
            
            <form onSubmit={handleLoginSubmit}>
              <div className={styles.formGroup}>
                <label htmlFor="login-engineer-name" className={styles.formLabel}>ENGINEER NAME</label>
                <input 
                  id="login-engineer-name"
                  type="text" 
                  className={styles.formInput}
                  required
                  placeholder="e.g. sujee"
                  value={loginFields.name}
                  onChange={(e) => setLoginFields({ ...loginFields, name: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="login-key-phrase" className={styles.formLabel}>KEY PHRASE PASSWORD</label>
                <input 
                  id="login-key-phrase"
                  type="password" 
                  className={styles.formInput}
                  required
                  placeholder="••••••••"
                  value={loginFields.password}
                  onChange={(e) => setLoginFields({ ...loginFields, password: e.target.value })}
                />
              </div>
              <button type="submit" className={styles.submitBtn}>
                AUTHENTICATE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Station specific chart sub-component (client-side dynamic querying)
function StationRainfallChart({ locationId, selectedDamId, timeframe, getFromTime }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRain = async () => {
      try {
        const fromTime = getFromTime(timeframe);
        let resHint = 'raw';
        if (timeframe === '1D') resHint = '15m';
        if (timeframe === '1W' || timeframe === '1M') resHint = '1h';

        const res = await fetch(`/api/dams/${selectedDamId}/rainfall-stations/${locationId}/rainfall?from=${fromTime}&resolution=${resHint}`);
        if (res.ok) {
          const json = await res.json();
          const parsed = (json.live || []).map(p => ({
            ...p,
            time: new Date(p.time).getTime()
          }));
          setData(parsed);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRain();
  }, [locationId, selectedDamId, timeframe, getFromTime]);

  if (loading) {
    return <div className="h-full flex items-center justify-center font-mono text-[10px] text-muted">Reading telemetry...</div>;
  }

  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center font-mono text-[10px] text-muted border border-dashed border-[var(--border-color)]">No reading data</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -35, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis 
          dataKey="time" 
          type="number"
          domain={['auto', 'auto']}
          tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
          stroke="var(--border-color)"
          tick={{ fill: 'var(--text-muted)', fontSize: 8, fontFamily: 'var(--font-mono)' }}
        />
        <YAxis stroke="var(--border-color)" tick={{ fill: 'var(--text-muted)', fontSize: 8, fontFamily: 'var(--font-mono)' }} />
        <Tooltip labelFormatter={(l) => new Date(l).toLocaleString()} contentStyle={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} />
        <Area type="monotone" dataKey="value" stroke="var(--rain-indigo)" fill="rgba(122, 140, 255, 0.15)" strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
