import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { damId } = await params;

    const query = `
      SELECT r.result_id, r.run_id, r.crossing_time_minutes, r.minimum_gap, r.gap_trend, r.final_status, p.run_time
      FROM graph_crossing_results r
      JOIN prediction_runs p ON r.run_id = p.run_id
      WHERE p.dam_id = $1
      ORDER BY p.run_time DESC
      LIMIT 1
    `;
    const { rows } = await pool.query(query, [damId]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No crossing results available' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Failed to get crossing results:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
