import React, { useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TrendingUp, CloudRain, Droplets, Target } from 'lucide-react';
import styles from '@/app/page.module.css';

export default function TrendsPredictionTab({ history }) {
    if (!history || history.length === 0) return <div className="text-muted text-center mt-8">No trend data available. Waiting for updates...</div>;

    const chartData = useMemo(() => {
        const safeFloat = (val) => isNaN(parseFloat(val)) ? 0 : parseFloat(val);
        return history.map(row => {
            const ts = new Date(row.timestamp);
            return {
                time: `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`,
                timestamp: ts.getTime(),
                waterLevel: safeFloat(row.l_t),
                rainfall: safeFloat(row.rf_t),
                riseRate: safeFloat(row.rr_short),
                threshold: safeFloat(row.adaptive_threshold)
            }
        });
    }, [history]);

    const predictionData = useMemo(() => {
        const lastPoint = chartData[chartData.length - 1];
        if (!lastPoint) return [];

        const predData = [];
        predData.push({ time: 'Now', waterLevel: lastPoint.waterLevel, forecastLevel: lastPoint.waterLevel, threshold: lastPoint.threshold });

        // Extrapolate next 30 and 60 minutes based on riseRate (% per hour)
        const currentRise = isNaN(lastPoint.riseRate) ? 0 : lastPoint.riseRate;
        predData.push({
            time: '+30m',
            forecastLevel: lastPoint.waterLevel + (currentRise * 0.5),
            threshold: lastPoint.threshold
        });
        predData.push({
            time: '+60m',
            forecastLevel: lastPoint.waterLevel + currentRise,
            threshold: lastPoint.threshold
        });

        return predData;
    }, [chartData]);


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className={styles.mainGrid}>
                {/* Rainfall Trend */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 className={styles.metricLabel} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--text-main)' }}>
                        <CloudRain size={18} color="#3b82f6" /> Rainfall Trend Graph (mm/hr)
                    </h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRf" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 'dataMax + 10']} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="rainfall" name="Rainfall" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRf)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Water Level Trend */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 className={styles.metricLabel} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--text-main)' }}>
                        <Droplets size={18} color="#10b981" /> Water Level Trend Graph (%)
                    </h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorWl" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                <Legend verticalAlign="top" height={36} />
                                <Area type="monotone" dataKey="waterLevel" name="Water Level" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWl)" />
                                <Line type="stepAfter" dataKey="threshold" name="Adaptive Threshold" stroke="#f97316" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className={styles.mainGrid}>
                {/* Rise Rate Trend */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <h3 className={styles.metricLabel} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--text-main)' }}>
                        <TrendingUp size={18} color="#8b5cf6" /> Rise Rate Trend (%/hr increase)
                    </h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorRr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="riseRate" name="Rise Rate" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRr)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Prediction Curve */}
                <div className="glass-panel" style={{ padding: '2rem', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: '0 0 30px rgba(239,68,68,0.1)' }}>
                    <h3 className={styles.metricLabel} style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: 'var(--status-red)' }}>
                        <Target size={18} color="var(--status-red)" /> Short-Term Prediction Curve (+1 Hr)
                    </h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={predictionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', borderColor: '#ef4444', borderRadius: '8px' }} />
                                <Legend verticalAlign="top" height={36} />
                                <Line type="monotone" dataKey="forecastLevel" name="Forecasted Level" stroke="#ef4444" strokeWidth={4} dot={{ r: 6, fill: '#ef4444' }} strokeDasharray="6 6" />
                                <Line type="stepAfter" dataKey="threshold" name="Danger Threshold" stroke="#f97316" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

