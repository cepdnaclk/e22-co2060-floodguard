'use client';

import React, { useState } from 'react';

export default function AnalysisTab({ data }) {
  if (!data) return <div className="p-4 font-mono text-muted text-sm">Waiting for data...</div>;

  return (
    <div className="scadaGrid">
      <div className="colSpan12">
        <h2 className="text-muted mb-4 font-mono text-sm">ALGORITHMIC VERIFICATION</h2>
      </div>

      <CollapsibleSection title="1. RISE RATE CALCULATION" defaultOpen={true}>
        {data.rr_short !== undefined ? (
          <div className="font-mono text-sm">
            <Row label="Short-term Rate (15m)" value={`${Number(data.rr_short || 0).toFixed(2)} %/hr`} />
            <Row label="Long-term Rate (60m)" value={`${Number(data.rr_long || 0).toFixed(2)} %/hr`} />
            <Row label="Resulting Risk Band" value={data.rr_band} highlight={data.rr_band === 'CRITICAL' ? 'var(--status-red)' : undefined} />
          </div>
        ) : (
          <div className="text-muted font-mono text-xs">Waiting for enough readings...</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="2. ADAPTIVE THRESHOLD CALCULATION" defaultOpen={true}>
        {data.adaptive_threshold !== undefined ? (
          <div className="font-mono text-sm">
            <Row label="Base Threshold" value="75.00%" />
            <Row label="Rise Rate Penalty" value={`- ${data.rr_band === 'CRITICAL' ? '30' : (data.rr_band === 'HIGH' ? '18' : (data.rr_band === 'ELEVATED' ? '8' : '0'))}%`} />
            <Row label="Rainfall Penalty" value={`- ${Number(data.rainfall || 0) > 50 ? '12' : (Number(data.rainfall || 0) > 25 ? '7' : (Number(data.rainfall || 0) > 10 ? '3' : '0'))}%`} />
            <Row label="Downstream Penalty" value={`- ${Number(data.downstream_level || 0) > 85 ? '15' : (Number(data.downstream_level || 0) > 70 ? '8' : (Number(data.downstream_level || 0) > 50 ? '3' : '0'))}%`} />
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }}></div>
            <Row label="FINAL AT(t)" value={`${Number(data.adaptive_threshold || 0).toFixed(2)}%`} bold />
          </div>
        ) : (
          <div className="text-muted font-mono text-xs">Waiting for enough readings...</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="3. GATE RELEASE MATH" defaultOpen={true}>
        {['ORANGE', 'RED'].includes(data.status) ? (
          <div className="font-mono text-sm">
            <Row label="Raw Required Release Rate" value={`${Number(data.release_rate || 0).toFixed(1)} m³/s`} />
            <Row label="Downstream Safe Limit" value={`${Number(data.max_safe_release || 0).toFixed(1)} m³/s`} />
            <Row label="Applied Release Rate" value={`${Math.min(Number(data.release_rate || 0), Number(data.max_safe_release || 0)).toFixed(1)} m³/s`} highlight={data.conflict_warning ? 'var(--status-orange)' : undefined} />
            <Row label="Converted Gate Opening" value={`${Number(data.gate_opening_percent || 0).toFixed(2)}%`} />
            <Row label="Rounded Gate Opening" value={`${Number(data.gate_opening_percent_rounded || 0)}%`} bold />
            <Row label="Calculated Duration" value={`${Number(data.estimated_duration_minutes || 0).toFixed(1)} mins`} />
          </div>
        ) : (
          <div className="text-muted font-mono text-xs">Release recommendation inactive.</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="4. DE-ESCALATION STATUS" defaultOpen={false}>
        <div className="font-mono text-sm text-muted">
          Current alert level: {data.status}. 
          <br/>
          (De-escalation timers are tracked backend-side. UI visualization pending data schema extension.)
        </div>
      </CollapsibleSection>

    </div>
  );
}

function CollapsibleSection({ title, defaultOpen, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="colSpan6 card" style={{ padding: 0 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isOpen ? 'var(--bg-secondary)' : 'transparent', borderBottom: isOpen ? '1px solid var(--border-color)' : 'none' }}
      >
        <span className="font-mono text-xs text-cyan font-bold">{title}</span>
        <span className="text-muted font-mono">{isOpen ? '▼' : '▶'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '1rem' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: bold ? 'bold' : 'normal', color: highlight || 'inherit' }}>
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
