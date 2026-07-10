import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { damId } = await params;
    const { rows } = await pool.query(
      `SELECT dam_id, dam_name, location, latitude, longitude, elevation_m,
              reservoir_capacity, downstream_capacity, max_gate_capacity,
              if_baseline, base_threshold, threshold_floor
       FROM dams
       WHERE dam_id = $1`,
      [damId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Dam not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Failed to get dam details:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
