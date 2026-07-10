import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'floodguard_super_secret_key';

export async function POST(request, { params }) {
  try {
    const { alertId } = await params;

    // 1. Authenticate session
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: 'Unauthorized: login required' }, { status: 401 });
    }

    let engineerId = null;
    try {
      const decoded = jwt.verify(sessionCookie.value, JWT_SECRET);
      engineerId = decoded.engineer_id;
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: session expired or invalid' }, { status: 401 });
    }

    if (!engineerId) {
      return NextResponse.json({ error: 'Unauthorized: invalid engineer ID' }, { status: 401 });
    }

    // 2. Perform database write
    const query = `
      UPDATE alerts_log
      SET acknowledged_by = $1, acknowledged_at = now()
      WHERE alert_id = $2 AND acknowledged_at IS NULL
      RETURNING *
    `;
    const { rows } = await pool.query(query, [engineerId, alertId]);

    if (rows.length === 0) {
      // Check if it was already acknowledged or doesn't exist
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
