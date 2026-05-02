import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit')) || 60; // default 60 points

  try {
    const { rows } = await pool.query(`
      SELECT timestamp, water_level_pct, rainfall_mm_hr, inflow_m3s, downstream_lvl_pct 
      FROM sensor_readings 
      ORDER BY timestamp DESC 
      LIMIT $1
    `, [limit]);
    
    // Return in chronological order for graphs
    return NextResponse.json(rows.reverse());
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
