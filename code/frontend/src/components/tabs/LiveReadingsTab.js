'use client';

import React from 'react';

export default function LiveReadingsTab({ data, history }) {
  if (!data) return null;

  return (
    <div className="scadaGrid">
      <div className="colSpan12">
        <h2 className="text-muted mb-4 font-mono text-sm">SENSOR NETWORK INTEGRITY</h2>
      </div>

      <div className="colSpan3 card">
        <div className="text-cyan font-mono text-xs mb-2">RESERVOIR LEVEL PROBE</div>
        <div className="font-mono text-2xl">{data.water_level?.toFixed(2)}%</div>
        <div className="text-muted font-mono text-xs mt-4">
          <div>STATUS: ONLINE</div>
          <div>LATENCY: 42ms</div>
          <div>SIGNAL: 98%</div>
        </div>
      </div>

      <div className="colSpan3 card">
        <div className="text-cyan font-mono text-xs mb-2">UPSTREAM RAIN GAUGE</div>
        <div className="font-mono text-2xl">{data.rainfall?.toFixed(2)} mm/h</div>
        <div className="text-muted font-mono text-xs mt-4">
          <div>STATUS: ONLINE</div>
          <div>LATENCY: 115ms</div>
          <div>SIGNAL: 85%</div>
        </div>
      </div>

      <div className="colSpan3 card">
        <div className="text-cyan font-mono text-xs mb-2">INFLOW FLOWMETER</div>
        <div className="font-mono text-2xl">{data.inflow?.toFixed(2)} m³/s</div>
        <div className="text-muted font-mono text-xs mt-4">
          <div>STATUS: ONLINE</div>
          <div>LATENCY: 88ms</div>
          <div>SIGNAL: 92%</div>
        </div>
      </div>

      <div className="colSpan3 card">
        <div className="text-cyan font-mono text-xs mb-2">DOWNSTREAM RADAR</div>
        <div className="font-mono text-2xl">{data.downstream_level?.toFixed(2)}%</div>
        <div className="text-muted font-mono text-xs mt-4">
          <div>STATUS: ONLINE</div>
          <div>LATENCY: 55ms</div>
          <div>SIGNAL: 99%</div>
        </div>
      </div>

      <div className="colSpan12 card mt-4">
        <h2 className="text-muted mb-4 font-mono text-sm">TELEMETRY DATA STREAM (LAST 50 READINGS)</h2>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }} className="font-mono text-sm">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)' }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.5rem' }}>TIMESTAMP</th>
                <th style={{ padding: '0.5rem' }}>L(t) %</th>
                <th style={{ padding: '0.5rem' }}>RF(t) mm/h</th>
                <th style={{ padding: '0.5rem' }}>IF(t) m³/s</th>
                <th style={{ padding: '0.5rem' }}>DL(t) %</th>
                <th style={{ padding: '0.5rem' }}>QUALITY</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().slice(0, 50).map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(143, 163, 173, 0.1)' }}>
                  <td style={{ padding: '0.5rem' }}>{new Date(row.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--water-blue)' }}>{row.water_level?.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--rain-indigo)' }}>{row.rainfall?.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--inflow-teal)' }}>{row.inflow?.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--downstream-amber)' }}>{row.downstream_level?.toFixed(2)}</td>
                  <td style={{ padding: '0.5rem', color: 'var(--status-green)' }}>VALID</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
