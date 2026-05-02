'use client';

import React from 'react';

export default function GateReleaseTab({ data }) {
  if (!data) return null;

  const isActive = ['ORANGE', 'RED'].includes(data.status);
  const isConflict = data.conflict_warning;

  return (
    <div className="scadaGrid">
      <div className="colSpan12">
        <h2 className="text-muted mb-4 font-mono text-sm">GATE RELEASE RECOMMENDATION & CONSTRAINT ANALYSIS</h2>
      </div>

      {!isActive ? (
        <div className="colSpan12 bg-panel p-6 text-center">
          <div className="font-mono text-xl text-muted">NO ACTIVE RELEASE RECOMMENDATION</div>
          <div className="font-mono text-sm text-muted mt-2">Current status ({data.status}) does not require gate operations. Dam officers should remain on standby.</div>
        </div>
      ) : (
        <>
          {/* RECOMMENDATION PANEL */}
          <div className="colSpan6 card" style={{ borderColor: isConflict ? 'var(--status-orange)' : 'var(--status-red)' }}>
            <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">ALGORITHMIC RECOMMENDATION</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <div className="text-muted font-mono text-xs">GATE OPENING</div>
                <div className="font-mono text-3xl text-red font-bold">{data.gate_opening_percent_rounded || 0}%</div>
                <div className="text-muted font-mono text-[10px] mt-1">Exact calculation: {Number(data.gate_opening_percent || 0).toFixed(1) || 0}%</div>
              </div>
              <div>
                <div className="text-muted font-mono text-xs">RELEASE RATE</div>
                <div className="font-mono text-3xl font-bold">{Number(data.release_rate || 0).toFixed(1) || 0} m³/s</div>
              </div>
              <div>
                <div className="text-muted font-mono text-xs">ESTIMATED DURATION</div>
                <div className="font-mono text-2xl">{Number(data.estimated_duration_minutes || 0).toFixed(1) || 0} MINS</div>
              </div>
              <div>
                <div className="text-muted font-mono text-xs">TARGET SAFE LEVEL</div>
                <div className="font-mono text-2xl">{(data.adaptive_threshold - 10).toFixed(2)}%</div>
              </div>
            </div>

            <div className="bg-panel p-4 mt-4 font-mono text-sm">
              <strong className="text-red">ACTION REQUIRED:</strong> Initiate release at recommended rate to prevent threshold breach.
            </div>
          </div>

          {/* DOWNSTREAM CONSTRAINT */}
          <div className="colSpan6 card">
            <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">DOWNSTREAM CONSTRAINT CHECK</h3>
            
            <div className="mb-4">
              <div className="text-muted font-mono text-xs">DOWNSTREAM LEVEL DL(t)</div>
              <div className="font-mono text-2xl text-downstream-amber">{Number(data.downstream_level || 0).toFixed(2)}%</div>
            </div>

            <div className="mb-4">
              <div className="text-muted font-mono text-xs">MAXIMUM SAFE RELEASE</div>
              <div className="font-mono text-2xl">{Number(data.max_safe_release || 0).toFixed(1) || "CALCULATING..."} m³/s</div>
              <div className="text-muted font-mono text-[10px] mt-1">Capacity remaining in downstream river channel</div>
            </div>

            {isConflict ? (
              <div className="bg-panel p-4 mt-4 border border-[var(--status-orange)]">
                <div className="font-mono text-orange font-bold text-sm mb-1">⚠️ CONFLICT WARNING</div>
                <div className="font-mono text-xs text-muted">Full required release exceeds downstream capacity. The algorithm has artificially capped the release rate to {Number(data.max_safe_release || 0).toFixed(1)} m³/s to prevent downstream flooding. Reservoir level may continue to rise.</div>
              </div>
            ) : (
              <div className="bg-panel p-4 mt-4 border border-[var(--status-green)]">
                <div className="font-mono text-green font-bold text-sm mb-1">✓ CONSTRAINT PASSED</div>
                <div className="font-mono text-xs text-muted">Recommended release rate is safely below the maximum downstream capacity.</div>
              </div>
            )}
          </div>

          {/* HUMAN AUTHORIZATION */}
          <div className="colSpan12 card mt-4 border border-[var(--border-color)]">
            <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">HUMAN AUTHORIZATION WORKFLOW</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div className="bg-panel p-4">
                <div className="text-status-green font-mono text-xl mb-2">✓</div>
                <div className="font-mono text-xs">ALGORITHM RECOMMENDED</div>
              </div>
              <div className="bg-panel p-4" style={{ opacity: 0.5 }}>
                <div className="text-muted font-mono text-xl mb-2">☐</div>
                <div className="font-mono text-xs">OFFICER REVIEWED</div>
              </div>
              <div className="bg-panel p-4" style={{ opacity: 0.5 }}>
                <div className="text-muted font-mono text-xl mb-2">☐</div>
                <div className="font-mono text-xs">SUPERVISOR APPROVED</div>
              </div>
              <div className="bg-panel p-4" style={{ opacity: 0.5 }}>
                <div className="text-muted font-mono text-xl mb-2">☐</div>
                <div className="font-mono text-xs">EMERGENCY CHECKLIST</div>
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-4">
              <button className="btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>ACKNOWLEDGE RECOMMENDATION</button>
              <button className="btn-emergency" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>OPEN EMERGENCY CHECKLIST</button>
            </div>
            
            <div className="text-center mt-6 font-mono text-xs text-muted">
              <strong>DISCLAIMER:</strong> Decision-support output. Final gate operation must follow approved dam operation protocols and authorized officer confirmation. The UI cannot automatically execute physical operations.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
