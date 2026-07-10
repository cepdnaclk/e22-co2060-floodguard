import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { damId } = await params;
    const { searchParams } = new URL(request.url);
    const acknowledged = searchParams.get('acknowledged');

    let query = '';
    const queryParams = [damId];

    if (acknowledged === 'false') {
      query = `
        SELECT alert_id, alert_time, previous_status, new_status, message, acknowledged_by, acknowledged_at
        FROM alerts_log
        WHERE dam_id = $1 AND acknowledged_at IS NULL
        ORDER BY alert_time DESC
      `;
    } else if (acknowledged === 'true') {
      query = `
        SELECT alert_id, alert_time, previous_status, new_status, message, acknowledged_by, acknowledged_at
        FROM alerts_log
        WHERE dam_id = $1 AND acknowledged_at IS NOT NULL
        ORDER BY alert_time DESC
      `;
    } else {
      query = `
        SELECT alert_id, alert_time, previous_status, new_status, message, acknowledged_by, acknowledged_at
        FROM alerts_log
        WHERE dam_id = $1
        ORDER BY alert_time DESC
      `;
    }

    const { rows } = await pool.query(query, queryParams);
    return NextResponse.json(rows);

  } catch (error) {
    console.error('Failed to get alerts:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
