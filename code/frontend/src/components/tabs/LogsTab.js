'use client';

import React, { useMemo } from 'react';

export default function LogsTab({ history }) {
  if (!history) return <div className="p-4 font-mono text-muted text-sm">Waiting for data...</div>;

  // Derive status changes and significant events from history
  const events = useMemo(() => {
    const changes = [];
    let prevStatus = 'GREEN';
    
    // Sort chronological
    const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sorted.forEach((row) => {
      if (row.status !== prevStatus) {
        changes.push({
          timestamp: row.timestamp,
          event: `Status changed to ${row.status}`,
          severity: row.status,
          reason: row.reason || 'Algorithm triggered threshold',
          user: 'SYSTEM'
        });
        prevStatus = row.status;
      }
      
      // Fake acknowledgment for realism in demo
      if (row.status === 'RED' && changes.length > 0 && changes[changes.length-1].severity !== 'ACK') {
        changes.push({
          timestamp: new Date(new Date(row.timestamp).getTime() + 15000).toISOString(),
          event: `Gate release ${Number(row.gate_opening_percent_rounded || 0)}% Authorized`,
          severity: 'ACK',
          reason: 'Manual confirmation',
          user: 'CMD-OP-1'
        });
      }
    });
    
    // Return reverse chronological
    return changes.reverse();
  }, [history]);

  return (
    <div className="scadaGrid">
      <div className="colSpan12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="text-muted font-mono text-sm">SYSTEM EVENT & AUDIT LOG</h2>
        <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>EXPORT CSV</button>
      </div>

      <div className="colSpan12 card p-0">
        <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }} className="font-mono text-sm">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>TIME</th>
                <th style={{ padding: '0.75rem 1rem' }}>EVENT</th>
                <th style={{ padding: '0.75rem 1rem' }}>SEVERITY</th>
                <th style={{ padding: '0.75rem 1rem' }}>REASON / VALUE</th>
                <th style={{ padding: '0.75rem 1rem' }}>USER</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    NO SIGNIFICANT EVENTS RECORDED
                  </td>
                </tr>
              ) : events.map((ev, idx) => {
                let colorVar = 'var(--text-primary)';
                if (ev.severity === 'RED') colorVar = 'var(--status-red)';
                if (ev.severity === 'ORANGE') colorVar = 'var(--status-orange)';
                if (ev.severity === 'YELLOW') colorVar = 'var(--status-yellow)';
                if (ev.severity === 'GREEN') colorVar = 'var(--status-green)';
                if (ev.severity === 'ACK') colorVar = 'var(--data-cyan)';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: ev.severity === 'ACK' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {ev.event}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ color: colorVar, fontWeight: 'bold' }}>{ev.severity}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      {ev.reason}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {ev.user}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
