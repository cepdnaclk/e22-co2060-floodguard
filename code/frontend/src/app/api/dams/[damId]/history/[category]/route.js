import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { damId, category } = await params;
    const { searchParams } = new URL(request.url);
    
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to') || new Date().toISOString();

    if (!fromParam) {
      return NextResponse.json({ error: 'Missing parameter "from"' }, { status: 400 });
    }

    let query = '';
    let queryParams = [damId, fromParam, toParam];

    if (category === 'water-level') {
      query = `
        SELECT reading_time AS time, water_level_pct AS value
        FROM water_level_readings
        WHERE dam_id = $1 AND reading_time BETWEEN $2 AND $3
        ORDER BY reading_time DESC
      `;
    } else if (category === 'rainfall') {
      query = `
        SELECT r.reading_time AS time, r.rainfall_mm_hr AS value, l.location_name AS station
        FROM rainfall_readings r
        JOIN rainfall_locations l ON r.location_id = l.location_id
        WHERE l.nearest_dam_id = $1 AND r.reading_time BETWEEN $2 AND $3
        ORDER BY r.reading_time DESC
      `;
    } else if (category === 'inflow') {
      query = `
        SELECT reading_time AS time, inflow_rate_m3s AS value
        FROM inflow_readings
        WHERE dam_id = $1 AND reading_time BETWEEN $2 AND $3
        ORDER BY reading_time DESC
      `;
    } else if (category === 'downstream-level') {
      query = `
        SELECT reading_time AS time, downstream_level_pct AS value
        FROM downstream_level_readings
        WHERE dam_id = $1 AND reading_time BETWEEN $2 AND $3
        ORDER BY reading_time DESC
      `;
    } else if (category === 'risk-status') {
      query = `
        SELECT status_time AS time, status, ttc_minutes, trigger_reason, previous_status
        FROM risk_status
        WHERE dam_id = $1 AND status_time BETWEEN $2 AND $3
        ORDER BY status_time DESC
      `;
    } else if (category === 'alerts') {
      query = `
        SELECT a.alert_id, a.alert_time AS time, a.previous_status, a.new_status, a.message,
               e.name AS acknowledged_by, a.acknowledged_at
        FROM alerts_log a
        LEFT JOIN engineers e ON a.acknowledged_by = e.engineer_id
        WHERE a.dam_id = $1 AND a.alert_time BETWEEN $2 AND $3
        ORDER BY a.alert_time DESC
      `;
    } else {
      return NextResponse.json({ error: `Unknown history category: ${category}` }, { status: 400 });
    }

    const { rows } = await pool.query(query, queryParams);
    return NextResponse.json(rows);

  } catch (error) {
    console.error(`Failed to get history for ${category}:`, error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
