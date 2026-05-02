'use client';

import React from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

export default function TrendsGraphsTab({ history }) {
  if (!history || history.length === 0) return null;

  return (
    <div className="scadaGrid">
      <div className="colSpan12">
        <h2 className="text-muted mb-4 font-mono text-sm">ANALYTICAL TRENDS & GRAPHS</h2>
      </div>

      {/* RISE RATE GRAPH */}
      <div className="colSpan6 card">
        <h3 className="text-cyan font-mono text-xs mb-4">RISE RATE (RR_SHORT vs RR_LONG)</h3>
        <div style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
              
              <ReferenceArea y1={4.0} y2={10} fill="var(--status-red)" fillOpacity={0.05} />
              <ReferenceArea y1={2.5} y2={4.0} fill="var(--status-orange)" fillOpacity={0.05} />
              <ReferenceArea y1={1.0} y2={2.5} fill="var(--status-yellow)" fillOpacity={0.05} />
              
              <Line type="monotone" dataKey="rr_short" stroke="var(--status-orange)" strokeWidth={1} dot={false} name="RR_Short" />
              <Line type="monotone" dataKey="rr_long" stroke="var(--status-red)" strokeWidth={2} dot={false} name="RR_Long" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ACCELERATION GRAPH */}
      <div className="colSpan6 card">
        <h3 className="text-cyan font-mono text-xs mb-4">ACCELERATION</h3>
        <div style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
              
              <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" />
              
              <Area type="monotone" dataKey="acceleration" stroke="var(--data-cyan)" fill="var(--data-cyan)" fillOpacity={0.1} dot={false} name="ACC" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RAINFALL & INFLOW */}
      <div className="colSpan6 card">
        <h3 className="text-cyan font-mono text-xs mb-4">UPSTREAM RAINFALL & INFLOW CORRELATION</h3>
        <div style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <YAxis yAxisId="left" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
              
              <Line yAxisId="left" type="monotone" dataKey="inflow" stroke="var(--inflow-teal)" strokeWidth={2} dot={false} name="Inflow (m³/s)" />
              <Line yAxisId="right" type="monotone" dataKey="rainfall" stroke="var(--rain-indigo)" strokeWidth={1} strokeDasharray="3 3" dot={false} name="Rainfall (mm/h)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* DEVIATION GRAPH */}
      <div className="colSpan6 card">
        <h3 className="text-cyan font-mono text-xs mb-4">DEVIATION FROM ROLLING AVERAGE</h3>
        <div style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="timestamp" tickFormatter={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }} labelFormatter={(l) => new Date(l).toLocaleTimeString()} />
              
              <ReferenceArea y1={5.0} y2={10} fill="var(--status-red)" fillOpacity={0.05} />
              <ReferenceLine y={5.0} stroke="var(--status-red)" strokeDasharray="3 3" />
              
              <Line type="monotone" dataKey="deviation" stroke="var(--text-primary)" strokeWidth={1.5} dot={false} name="Deviation" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
