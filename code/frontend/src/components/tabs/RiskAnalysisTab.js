'use client';

import React from 'react';

export default function RiskAnalysisTab({ data }) {
  if (!data) return null;

  return (
    <div className="scadaGrid">
      <div className="colSpan12">
        <h2 className="text-muted mb-4 font-mono text-sm">ALGORITHMIC RISK BREAKDOWN</h2>
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">RISE RATE & ACCELERATION</h3>
        
        <div className="mb-4">
          <div className="text-muted font-mono text-xs">SHORT-TERM RATE (RR_SHORT)</div>
          <div className="font-mono text-xl">{Number(data.rr_short || 0).toFixed(2)} %/hr</div>
          <div className="text-muted font-mono text-[10px] mt-1">Spike detector (15 min extrapolation)</div>
        </div>
        
        <div className="mb-4">
          <div className="text-muted font-mono text-xs">LONG-TERM RATE (RR_LONG)</div>
          <div className="font-mono text-xl">{Number(data.rr_long || 0).toFixed(2)} %/hr</div>
          <div className="text-muted font-mono text-[10px] mt-1">Sustained trend (60 min window)</div>
        </div>

        <div className="mb-4">
          <div className="text-muted font-mono text-xs">ACCELERATION (ACC)</div>
          <div className="font-mono text-xl">{Number(data.acceleration || 0).toFixed(2)}</div>
          <div className="text-muted font-mono text-[10px] mt-1">Rate of change of RR_LONG over 1 hr</div>
        </div>

        <div className="mb-4">
          <div className="text-muted font-mono text-xs">CALCULATED RISK BAND</div>
          <div className="font-mono text-xl" style={{ color: `var(--status-${data.rr_band === 'CRITICAL' ? 'red' : (data.rr_band === 'HIGH' ? 'orange' : (data.rr_band === 'ELEVATED' ? 'yellow' : 'green'))})` }}>
            {data.rr_band}
          </div>
        </div>
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">ADAPTIVE THRESHOLD AT(t) CALCULATION</h3>
        
        <div className="font-mono text-sm">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="text-muted">BASE THRESHOLD</span>
            <span>75.00%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--status-orange)' }}>
            <span>- RISE RATE PENALTY</span>
            <span>{data.rr_band === 'CRITICAL' ? '30%' : (data.rr_band === 'HIGH' ? '18%' : (data.rr_band === 'ELEVATED' ? '8%' : '0%'))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--rain-indigo)' }}>
            <span>- RAINFALL PENALTY</span>
            <span>{data.rainfall > 50 ? '12%' : (data.rainfall > 25 ? '7%' : (data.rainfall > 10 ? '3%' : '0%'))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--inflow-teal)' }}>
            <span>- INFLOW PENALTY</span>
            <span>Dynamic</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--downstream-amber)' }}>
            <span>- DOWNSTREAM PENALTY</span>
            <span>{data.downstream_level > 85 ? '15%' : (data.downstream_level > 70 ? '8%' : (data.downstream_level > 50 ? '3%' : '0%'))}</span>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem' }}>
            <span className="text-cyan">FINAL AT(t)</span>
            <span>{Number(data.adaptive_threshold || 0).toFixed(2)}%</span>
          </div>
          <div className="text-muted font-mono text-[10px] mt-2 text-right">Must be between 30% and 75%</div>
        </div>
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">DEVIATION & ABNORMAL BEHAVIOR</h3>
        
        <div className="mb-4">
          <div className="text-muted font-mono text-xs">ROLLING AVERAGE (3HR)</div>
          <div className="font-mono text-xl">{Number(data.rolling_avg || 0).toFixed(2)} %/hr</div>
        </div>

        <div className="mb-4">
          <div className="text-muted font-mono text-xs">CURRENT DEVIATION (DEV)</div>
          <div className="font-mono text-xl">{Number(data.deviation || 0).toFixed(2)}</div>
          <div className="text-muted font-mono text-[10px] mt-1">DEV = |RR_SHORT - RA(t)|</div>
        </div>

        <div className="mb-4">
          <div className="text-muted font-mono text-xs">BEHAVIOR STATUS</div>
          <div className="font-mono text-xl" style={{ color: data.deviation > 5.0 ? 'var(--status-red)' : 'var(--status-green)' }}>
            {data.deviation > 5.0 ? 'ERRATIC / CRITICAL' : 'EXPECTED VARIANCE'}
          </div>
        </div>
      </div>

      <div className="colSpan12 card mt-4">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">FINAL STATUS EVALUATION RULE</h3>
        <div className="font-mono text-sm bg-panel p-4" style={{ whiteSpace: 'pre-wrap' }}>
          <strong>MATCHED RULE TRACE:</strong><br/><br/>
          {data.reason || "Algorithm evaluated normally within safe bounds."}<br/><br/>
          <strong>RESULTING ACTION:</strong><br/>
          {data.status === 'RED' && "Initiate immediate emergency protocols and calculate gate release."}
          {data.status === 'ORANGE' && "Calculate controlled gate release to prevent further escalation."}
          {data.status === 'YELLOW' && "Place operators on standby. No physical release authorized."}
          {data.status === 'GREEN' && "Continue background algorithmic monitoring."}
        </div>
      </div>
    </div>
  );
}
