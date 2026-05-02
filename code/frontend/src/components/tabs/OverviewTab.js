'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

export default function OverviewTab({ data, history }) {
  if (!data) return null;

  const isRed = data.status === 'RED';
  const isOrange = data.status === 'ORANGE';
  const isActive = isRed || isOrange;

  // Plain action message
  let actionMessage = '';
  if (data.status === 'GREEN') actionMessage = 'Continue monitoring';
  if (data.status === 'YELLOW') actionMessage = 'Standby and prepare';
  if (data.status === 'ORANGE') actionMessage = 'Controlled release recommended';
  if (data.status === 'RED') actionMessage = 'Immediate gate operation required';

  // Math for Main Status Panel
  const diffRaw = Number(data.l_t || 0) - Number(data.adaptive_threshold || 0);
  const isAbove = diffRaw > 0;
  const diffString = `Reservoir is ${Math.abs(diffRaw).toFixed(1)}% ${isAbove ? 'above' : 'below'} threshold`;

  // Trend determination (very simple)
  let trend = 'Stable';
  if (Number(data.rr_short || 0) > 0.5) trend = 'Rising';
  if (Number(data.rr_short || 0) < -0.5) trend = 'Dropping';

  // Acceleration determination
  let accState = 'Stable';
  if (Number(data.acceleration || 0) > 0.5) accState = 'Worsening';
  if (Number(data.acceleration || 0) < -0.5) accState = 'Improving';

  // Recommendation message
  let recMessage = 'No gate release required. Continue monitoring.';
  if (isActive && data.conflict_warning) {
    recMessage = 'Immediate operation required. Full release is limited by downstream capacity.';
  } else if (isActive) {
    recMessage = `Controlled release recommended: open gate to ${Number(data.gate_opening_percent || 0)}% for approximately ${Number(data.est_duration_mins || 0).toFixed(0)} minutes.`;
  } else if (data.status === 'YELLOW') {
    recMessage = 'Prepare controlled release. Downstream level is within safe capacity.';
  }

  // Graph Time Range
  const [timeRangeHours, setTimeRangeHours] = useState(3);
  const graphData = history ? history.slice(-timeRangeHours * 60) : []; // Assuming 1 row = 1 minute

  return (
    <div className="scadaGrid">
      
      {/* 1. MAIN STATUS PANEL */}
      <div className={`colSpan6 card ${isActive ? (isRed ? 'status-pulse-red' : '') : ''}`} style={{ borderColor: `var(--status-${data.status.toLowerCase()})`, borderWidth: '2px' }}>
        <h2 className="text-muted font-mono text-xs mb-2">CURRENT SYSTEM STATUS</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '800', color: `var(--status-${data.status.toLowerCase()})`, lineHeight: 1 }}>
            {data.status}
          </div>
          <div className="text-primary font-mono text-lg">{actionMessage}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div className="text-muted font-mono text-xs">RESERVOIR LEVEL L(t)</div>
            <div className="text-primary font-mono text-2xl">{Number(data.l_t || 0).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-muted font-mono text-xs">ADAPTIVE THRESHOLD AT(t)</div>
            <div className="text-primary font-mono text-2xl">{Number(data.adaptive_threshold || 0).toFixed(1)}%</div>
          </div>
        </div>

        <div className="bg-panel p-3 font-mono text-sm mb-3 text-cyan">
          {diffString}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <div>
            <div className="text-muted font-mono text-xs">TREND</div>
            <div className="text-primary font-mono text-sm">{trend}</div>
          </div>
          <div>
            <div className="text-muted font-mono text-xs">ACCELERATION</div>
            <div className="text-primary font-mono text-sm">{accState}</div>
          </div>
          <div>
            <div className="text-muted font-mono text-xs">NEXT UPDATE</div>
            <div className="text-primary font-mono text-sm">In 60s</div>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL RECOMMENDATION PANEL */}
      <div className="colSpan6 card">
        <h2 className="text-muted font-mono text-xs mb-4">OPERATIONAL RECOMMENDATION</h2>
        
        <div className="font-mono text-sm mb-4" style={{ color: isActive ? 'var(--status-orange)' : 'var(--text-primary)' }}>
          {recMessage}
        </div>

        {isActive ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', backgroundColor: 'var(--bg-secondary)', padding: '1rem', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
            <div>
              <div className="text-muted font-mono text-[10px]">GATE OPENING</div>
              <div className="font-mono text-2xl text-red">{Number(data.gate_opening_percent || 0)}%</div>
            </div>
            <div>
              <div className="text-muted font-mono text-[10px]">RELEASE RATE</div>
              <div className="font-mono text-2xl">{Number(data.release_rate || 0).toFixed(0)} m³/s</div>
            </div>
            <div>
              <div className="text-muted font-mono text-[10px]">EST. DURATION</div>
              <div className="font-mono text-2xl">{Number(data.est_duration_mins || 0).toFixed(0)} min</div>
            </div>
          </div>
        ) : (
          <div className="text-muted font-mono text-sm bg-panel p-4 mb-4 text-center">
            Release recommendation inactive
          </div>
        )}

        <div className="mb-4">
          <div className="text-muted font-mono text-xs">DOWNSTREAM CONSTRAINT</div>
          {data.conflict_warning ? (
            <div className="text-orange font-mono text-sm font-bold">LIMITED (Max Safe: {Number(data.max_safe_release || 0).toFixed(0)} m³/s)</div>
          ) : (
             <div className="text-green font-mono text-sm">SAFE</div>
          )}
        </div>

        {isActive && (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-primary flex-1">ACKNOWLEDGE</button>
            <button className="btn-emergency flex-1">EMERGENCY CHECKLIST</button>
          </div>
        )}
      </div>

      {/* 3. KEY READINGS ROW */}
      <div className="colSpan12" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <CompactTile label="RESERVOIR LEVEL" value={Number(data.l_t || 0).toFixed(1)} unit="%" status={Number(data.l_t || 0) > 85 ? 'Critical' : 'Normal'} statusColor={Number(data.l_t || 0) > 85 ? 'var(--status-red)' : 'var(--status-green)'} />
        <CompactTile label="RAINFALL" value={Number(data.rf_t || 0).toFixed(1)} unit="mm/h" status={Number(data.rf_t || 0) > 50 ? 'High' : 'Normal'} statusColor={Number(data.rf_t || 0) > 50 ? 'var(--status-orange)' : 'var(--text-muted)'} />
        <CompactTile label="UPSTREAM INFLOW" value={Number(data.if_t || 0).toFixed(0)} unit="m³/s" status={Number(data.if_t || 0) > 100 ? 'Elevated' : 'Normal'} statusColor={Number(data.if_t || 0) > 100 ? 'var(--status-yellow)' : 'var(--text-muted)'} />
        <CompactTile label="DOWNSTREAM LEVEL" value={Number(data.dl_t || 0).toFixed(1)} unit="%" status={Number(data.dl_t || 0) > 80 ? 'Limited' : 'Safe'} statusColor={Number(data.dl_t || 0) > 80 ? 'var(--status-orange)' : 'var(--status-green)'} />
      </div>

      {/* 4. PROCESSED SIGNAL ROW */}
      <div className="colSpan12" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        <CompactTile label="SHORT RISE RATE" value={Number(data.rr_short || 0).toFixed(2)} unit="%/hr" status={data.rr_band} statusColor={`var(--status-${data.rr_band === 'CRITICAL' ? 'red' : (data.rr_band === 'HIGH' ? 'orange' : 'green')})`} />
        <CompactTile label="LONG RISE RATE" value={Number(data.rr_long || 0).toFixed(2)} unit="%/hr" status={Number(data.rr_long || 0) > 4 ? 'High' : 'Normal'} statusColor={Number(data.rr_long || 0) > 4 ? 'var(--status-orange)' : 'var(--text-muted)'} />
        <CompactTile label="ACCELERATION" value={Number(data.acceleration || 0).toFixed(2)} unit="" status={Number(data.acceleration || 0) > 1 ? 'High' : 'Normal'} statusColor={Number(data.acceleration || 0) > 1 ? 'var(--status-orange)' : 'var(--text-muted)'} />
        <CompactTile label="DEVIATION" value={Number(data.deviation || 0).toFixed(2)} unit="" status={Number(data.deviation || 0) > 5 ? 'Critical' : 'Normal'} statusColor={Number(data.deviation || 0) > 5 ? 'var(--status-red)' : 'var(--text-muted)'} />
      </div>

      {/* 5. MAIN GRAPH & REASON BOX */}
      <div className="colSpan9 card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="text-muted font-mono text-xs">RESERVOIR LEVEL VS ADAPTIVE THRESHOLD</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 3, 6].map(h => (
              <button key={h} className={`font-mono text-xs ${timeRangeHours === h ? 'text-primary border-b border-[var(--text-primary)]' : 'text-muted'}`} onClick={() => setTimeRangeHours(h)}>{h}H</button>
            ))}
          </div>
        </div>
        <div style={{ height: '220px', width: '100%' }}>
          {graphData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="var(--border-color)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} minTickGap={30} />
                <YAxis domain={['auto', 'auto']} stroke="var(--border-color)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
                
                <ReferenceArea y1={Number(data.adaptive_threshold || 75)} y2={100} fill="var(--status-red)" fillOpacity={0.05} />
                
                <Line type="monotone" dataKey="l_t" stroke="var(--water-blue)" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="stepAfter" dataKey="adaptive_threshold" stroke="var(--status-red)" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center font-mono text-muted text-sm">Waiting for graph data...</div>
          )}
        </div>
      </div>

      <div className="colSpan3 card">
        <h2 className="text-muted font-mono text-xs mb-3">REASON FOR STATUS</h2>
        <div className="bg-panel p-3">
          <ul className="font-mono text-xs text-primary" style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.8 }}>
            <li>{data.action_message || 'Algorithm evaluated normally.'}</li>
            {data.conflict_warning && <li className="text-orange mt-2">Downstream capacity limiting optimal release.</li>}
            {isAbove && <li className="text-red mt-2">Level exceeds dynamic threshold.</li>}
          </ul>
        </div>
      </div>

    </div>
  );
}

function CompactTile({ label, value, unit, status, statusColor }) {
  return (
    <div className="card" style={{ padding: '0.75rem' }}>
      <div className="text-muted font-mono text-[10px] mb-1 uppercase truncate">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span className="font-mono text-xl font-bold text-primary">{value}</span>
        <span className="font-mono text-muted text-xs">{unit}</span>
      </div>
      <div className="font-mono text-[10px] mt-2 font-bold" style={{ color: statusColor }}>
        {status.toUpperCase()}
      </div>
    </div>
  );
}
