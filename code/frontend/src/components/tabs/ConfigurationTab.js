'use client';

import React from 'react';

export default function ConfigurationTab() {
  return (
    <div className="scadaGrid">
      <div className="colSpan12">
        <h2 className="text-muted mb-4 font-mono text-sm">SYSTEM CALIBRATION & THRESHOLD CONSTANTS</h2>
      </div>

      <div className="colSpan12 bg-panel p-4 mb-4">
        <div className="font-mono text-xs text-orange">READ-ONLY MODE: CONFIGURATION LOCKED</div>
        <div className="font-mono text-xs text-muted mt-1">These values represent the current backend algorithm constants. To modify these thresholds, update the Python backend configuration and restart the orchestrator.</div>
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">ADAPTIVE THRESHOLD LIMITS</h3>
        <ConfigRow label="BASE_THRESHOLD" value="75.00%" />
        <ConfigRow label="MINIMUM_FLOOR" value="30.00%" />
        <ConfigRow label="MARGIN_1 (RED)" value="AT(t) + 20%" />
        <ConfigRow label="MARGIN_2 (YELLOW)" value="AT(t) + 10%" />
        <ConfigRow label="MARGIN_3 (ORANGE)" value="AT(t) + 3%" />
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">RISE RATE BANDS (%/hr)</h3>
        <ConfigRow label="NORMAL (Short/Long/Acc)" value="<2.0 / <1.0 / <0.5" />
        <ConfigRow label="ELEVATED (Short/Long/Acc)" value="2.0-4.0 / 1.0-2.5 / 0.5-1.5" />
        <ConfigRow label="HIGH (Short/Long/Acc)" value="4.0-7.0 / 2.5-4.0 / 1.5-3.0" />
        <ConfigRow label="CRITICAL (Short/Long/Acc)" value=">7.0 / >4.0 / >3.0" />
        <ConfigRow label="CRITICAL DEVIATION" value="> 5.0" />
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">ADJUSTMENT PENALTIES</h3>
        <ConfigRow label="RR_BAND: CRITICAL" value="- 30%" />
        <ConfigRow label="RR_BAND: HIGH" value="- 18%" />
        <ConfigRow label="RR_BAND: ELEVATED" value="- 8%" />
        <ConfigRow label="RAINFALL > 50mm/h" value="- 12%" />
        <ConfigRow label="DOWNSTREAM > 85%" value="- 15%" />
      </div>

      <div className="colSpan4 card">
        <h3 className="text-cyan font-mono text-xs mb-4 border-b border-[var(--border-color)] pb-2">PHYSICAL CAPACITIES</h3>
        <ConfigRow label="RESERVOIR_CAPACITY" value="50,000,000 m³" />
        <ConfigRow label="MAX_GATE_CAPACITY" value="250 m³/s" />
        <ConfigRow label="DOWNSTREAM_CHANNEL_CAPACITY" value="400 m³/s" />
        <ConfigRow label="INFLOW_BASELINE" value="50 m³/s" />
      </div>
    </div>
  );
}

function ConfigRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.85rem' }} className="font-mono">
      <span className="text-muted">{label}</span>
      <span style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}
