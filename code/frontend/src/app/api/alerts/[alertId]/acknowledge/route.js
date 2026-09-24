import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    const { alertId } = await params;

    // Authenticate session
    const session = verifySession(request);
    if (!session.authenticated) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }

    const engineerId = session.user.engineer_id;

    // Update alert record
    const query = `
      UPDATE alerts_log
      SET acknowledged_by = $1, acknowledged_at = now()
      WHERE alert_id = $2 AND acknowledged_at IS NULL
      RETURNING *
    `;
    const { rows } = await pool.query(query, [engineerId, alertId]);

    if (rows.length === 0) {
      const checkRes = await pool.query('SELECT * FROM alerts_log WHERE alert_id = $1', [alertId]);
      if (checkRes.rows.length === 0) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Alert already acknowledged' }, { status: 400 });
    }

    return NextResponse.json({ success: true, alert: rows[0] });
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
