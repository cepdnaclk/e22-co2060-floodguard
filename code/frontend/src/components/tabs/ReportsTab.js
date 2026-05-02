'use client';

import React, { useState } from 'react';

export default function ReportsTab({ data, history }) {
  const [reportGenerated, setReportGenerated] = useState(false);

  if (!data) return null;

  return (
    <div className="scadaGrid">
      <div className="colSpan12">
        <h2 className="text-muted mb-4 font-mono text-sm">OPERATIONAL REPORTS & DATA EXPORT</h2>
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">SITUATION REPORT</h3>
        <p className="text-muted text-sm mb-4">Generate an immediate operational snapshot of the current reservoir state, including all active risk parameters and gate release recommendations.</p>
        <button 
          className="btn-primary w-full"
          onClick={() => setReportGenerated(true)}
        >
          GENERATE SITUATION REPORT
        </button>
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">24-HOUR SUMMARY</h3>
        <p className="text-muted text-sm mb-4">Compile a comprehensive summary of all alerts, status escalations, and sensor extremes recorded over the last 24 hours.</p>
        <button className="btn-primary w-full" style={{ opacity: 0.5, cursor: 'not-allowed' }}>GENERATE SUMMARY (DISABLED)</button>
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">RAW DATA EXPORT</h3>
        <p className="text-muted text-sm mb-4">Download complete CSV dumps of the telemetry pipeline, including raw sensor ingestion and algorithmic output values.</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}>EXPORT SENSOR CSV</button>
          <button className="btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.75rem' }}>EXPORT ALERTS CSV</button>
        </div>
      </div>

      {reportGenerated && (
        <div className="colSpan12 mt-4 bg-panel p-6" style={{ border: `1px solid var(--status-${data.status.toLowerCase()})` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div>
              <h3 className="font-mono text-lg text-primary">SITUATION REPORT: FLD-ALPHA-01</h3>
              <div className="font-mono text-xs text-muted">GENERATED: {new Date().toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-xs text-muted">CURRENT STATUS</div>
              <div className={`font-mono font-bold text-${data.status.toLowerCase()}`}>{data.status}</div>
            </div>
          </div>
          
          <div className="font-mono text-sm" style={{ whiteSpace: 'pre-wrap' }}>
            {`1. SENSOR READINGS
   - Reservoir Level:    ${data.water_level?.toFixed(2)}%
   - Upstream Rainfall:  ${data.rainfall?.toFixed(2)} mm/h
   - Upstream Inflow:    ${data.inflow?.toFixed(2)} m³/s
   - Downstream Level:   ${data.downstream_level?.toFixed(2)}%

2. ALGORITHMIC ANALYSIS
   - Short-Term Rise:    ${data.rr_short?.toFixed(2)} %/hr
   - Acceleration:       ${data.acceleration?.toFixed(2)}
   - Deviation:          ${data.deviation?.toFixed(2)}
   - Adaptive Threshold: ${data.adaptive_threshold?.toFixed(2)}%

3. RECOMMENDED ACTION
   - Gate Opening:       ${data.gate_opening_percent_rounded || 0}%
   - Release Rate:       ${data.release_rate?.toFixed(1) || 0} m³/s
   - Est. Duration:      ${data.estimated_duration_minutes?.toFixed(1) || 0} mins
   - Conflict Warning:   ${data.conflict_warning ? 'YES (Downstream Capacity Exceeded)' : 'NONE'}

4. AUTOMATED SUMMARY
   ${data.reason || "System operating normally."}`}
          </div>
          
          <div className="mt-6 flex gap-4">
            <button className="btn-primary" onClick={() => window.print()}>PRINT REPORT</button>
            <button className="btn-primary" style={{ backgroundColor: 'var(--bg-primary)' }} onClick={() => setReportGenerated(false)}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
}
