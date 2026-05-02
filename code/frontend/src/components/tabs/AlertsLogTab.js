'use client';

import React, { useMemo } from 'react';

export default function AlertsLogTab({ history }) {
  if (!history) return null;

  // Derive status changes from history
  const events = useMemo(() => {
    const changes = [];
    let prevStatus = 'GREEN';
    
    // Sort chronological
    const sorted = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sorted.forEach((row) => {
      if (row.status !== prevStatus) {
        changes.push({
          timestamp: row.timestamp,
          prevStatus: prevStatus,
          newStatus: row.status,
          reason: row.reason,
          level: row.water_level,
          rf: row.rainfall,
          if: row.inflow
        });
        prevStatus = row.status;
      }
    });
    
    // Return reverse chronological
    return changes.reverse();
  }, [history]);

  return (
    <div className="scadaGrid">
      <div className="colSpan12" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="text-muted font-mono text-sm">CHRONOLOGICAL EVENT LOG & STATUS ESCALATIONS</h2>
        <button className="btn-primary" style={{ fontSize: '0.75rem' }}>EXPORT CSV</button>
      </div>

      <div className="colSpan12 card p-0">
        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }} className="font-mono text-sm">
            <thead style={{ position: 'sticky', top: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem' }}>TIMESTAMP</th>
                <th style={{ padding: '1rem' }}>EVENT TYPE</th>
                <th style={{ padding: '1rem' }}>TRIGGERING REASON</th>
                <th style={{ padding: '1rem' }}>SNAPSHOT L(t)</th>
                <th style={{ padding: '1rem' }}>SNAPSHOT RF(t)</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    NO STATUS CHANGES DETECTED IN LOG HISTORY
                  </td>
                </tr>
              ) : events.map((ev, idx) => {
                const isEscalation = 
                  (ev.prevStatus === 'GREEN' && ev.newStatus !== 'GREEN') ||
                  (ev.prevStatus === 'YELLOW' && ['ORANGE', 'RED'].includes(ev.newStatus)) ||
                  (ev.prevStatus === 'ORANGE' && ev.newStatus === 'RED');
                  
                const colorVar = `var(--status-${ev.newStatus.toLowerCase()})`;

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour12: false })}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        display: 'inline-block', 
                        padding: '0.2rem 0.5rem', 
                        backgroundColor: `rgba(var(--status-${ev.newStatus.toLowerCase()}-rgb), 0.1)`,
                        border: `1px solid ${colorVar}`,
                        color: colorVar,
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        borderRadius: '4px'
                      }}>
                        {isEscalation ? 'ESCALATION' : 'DE-ESCALATION'}
                        {' '}: {ev.prevStatus} → {ev.newStatus}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{ev.reason || 'Status change detected'}</td>
                    <td style={{ padding: '1rem', color: 'var(--water-blue)' }}>{ev.level?.toFixed(2)}%</td>
                    <td style={{ padding: '1rem', color: 'var(--rain-indigo)' }}>{ev.rf?.toFixed(2)}mm</td>
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
