'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

export default function HomeTab({ data, history, setActiveTab }) {
  if (!data) return null;

  // Determine plain-language interpretation
  let interpretation = '';
  if (data.status === 'GREEN') interpretation = 'Continue monitoring.';
  if (data.status === 'YELLOW') interpretation = 'Standby and prepare.';
  if (data.status === 'ORANGE') interpretation = 'Controlled release recommended.';
  if (data.status === 'RED') interpretation = 'Immediate gate operation required.';

  const isRed = data.status === 'RED';
  const isOrange = data.status === 'ORANGE';
  const pulseClass = isRed ? 'status-pulse-red' : (isOrange ? 'status-pulse-orange' : '');

  return (
    <div className="scadaGrid">
      
      {/* PRIMARY STATUS & SIGNAL CARD */}
      <div className={`colSpan6 card ${pulseClass}`} style={{ borderColor: `var(--status-${data.status.toLowerCase()})` }}>
        <h2 className="text-muted mb-4 font-mono text-sm">OPERATIONAL SIGNAL</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            fontSize: '2rem', fontWeight: 'bold', 
            color: `var(--status-${data.status.toLowerCase()})`
          }}>
            {data.status}
          </div>
          <div style={{ fontSize: '1.2rem' }}>{interpretation}</div>
        </div>
        
        <div className="font-mono text-sm text-muted" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
          <strong>TRIGGER REASON:</strong> {data.reason || "Algorithm evaluated normally within safe bounds."}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <div className="text-muted font-mono text-xs">GATE RECOMMENDATION</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {['ORANGE', 'RED'].includes(data.status) ? `OPEN ${data.gate_opening_percent_rounded || 0}%` : 'NONE'}
            </div>
          </div>
          <div>
            <div className="text-muted font-mono text-xs">ESTIMATED DURATION</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {['ORANGE', 'RED'].includes(data.status) ? `${data.estimated_duration_minutes?.toFixed(1) || 0} MINS` : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-muted font-mono text-xs">ADAPTIVE THRESHOLD AT(t)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{data.adaptive_threshold?.toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-muted font-mono text-xs">CURRENT LEVEL L(t)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{data.water_level?.toFixed(2)}%</div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button 
            className="btn-primary" 
            onClick={() => setActiveTab('GATE')}
            style={{ flex: 1, borderColor: `var(--status-${data.status.toLowerCase()})` }}
          >
            VIEW GATE CONTROL
          </button>
          <button className="btn-primary" onClick={() => setActiveTab('LOGS')} style={{ flex: 1 }}>
            OPEN EVENT LOG
          </button>
        </div>
      </div>

      {/* RAW SENSOR TILES */}
      <div className="colSpan6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <SensorTile title="RESERVOIR LEVEL L(t)" value={data.water_level} unit="%" color="var(--water-blue)" />
        <SensorTile title="RAINFALL RF(t)" value={data.rainfall} unit="mm/h" color="var(--rain-indigo)" />
        <SensorTile title="INFLOW IF(t)" value={data.inflow} unit="m³/s" color="var(--inflow-teal)" />
        <SensorTile title="DOWNSTREAM DL(t)" value={data.downstream_level} unit="%" color="var(--downstream-amber)" />
      </div>

      {/* PRIMARY GRAPH */}
      <div className="colSpan12 card">
        <h2 className="text-muted mb-4 font-mono text-sm">RESERVOIR LEVEL VS ADAPTIVE THRESHOLD (LAST 3 HOURS)</h2>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              />
              <YAxis 
                domain={[30, 100]} 
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}
                labelFormatter={(label) => new Date(label).toLocaleTimeString()}
              />
              
              {/* Alert Zones Backgrounds */}
              <ReferenceArea y1={75} y2={100} fill="var(--status-red)" fillOpacity={0.05} />
              
              {/* Data Lines */}
              <Line type="monotone" dataKey="water_level" stroke="var(--water-blue)" strokeWidth={2} dot={false} name="Level L(t)" />
              <Line type="stepAfter" dataKey="adaptive_threshold" stroke="var(--status-red)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Threshold AT(t)" />
              <Line type="stepAfter" dataKey="margin_3" stroke="var(--status-orange)" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Margin 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PROCESSED METRICS STRIP */}
      <div className="colSpan12" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
        <MetricTile title="RR_SHORT" value={data.rr_short} unit="%/hr" />
        <MetricTile title="RR_LONG" value={data.rr_long} unit="%/hr" />
        <MetricTile title="ACCELERATION" value={data.acceleration} unit="" />
        <MetricTile title="ROLLING AVG" value={data.rolling_avg} unit="%/hr" />
        <MetricTile title="DEVIATION" value={data.deviation} unit="" />
        <MetricTile title="RISK BAND" value={data.rr_band} unit="" isText />
      </div>

    </div>
  );
}

function SensorTile({ title, value, unit, color }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div className="font-mono text-xs text-muted mb-2">{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: color, lineHeight: '1' }}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="font-mono text-muted text-sm">{unit}</span>
      </div>
      <div className="font-mono text-xs text-muted mt-2" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>STATUS: OK</span>
        <span style={{ color: 'var(--status-green)' }}>LIVE</span>
      </div>
    </div>
  );
}

function MetricTile({ title, value, unit, isText=false }) {
  return (
    <div className="bg-panel" style={{ padding: '0.75rem' }}>
      <div className="font-mono text-xs text-muted mb-1">{title}</div>
      <div className="font-mono" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
        {isText ? value : (typeof value === 'number' ? value.toFixed(2) : value)}
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>{unit}</span>
      </div>
    </div>
  );
}
