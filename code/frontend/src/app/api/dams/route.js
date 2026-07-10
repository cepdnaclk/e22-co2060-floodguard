import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT dam_id, dam_name, location, latitude, longitude, elevation_m,
             reservoir_capacity, downstream_capacity, max_gate_capacity,
             if_baseline, base_threshold, threshold_floor
      FROM dams
      ORDER BY dam_name ASC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to list dams:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
