import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit')) || 60; // default 60 points

  try {
    const { rows } = await pool.query(`
      SELECT 
        w.reading_time as timestamp, 
        w.water_level_pct, 
        (SELECT AVG(rainfall_mm_hr) FROM rainfall_readings r WHERE r.reading_time = w.reading_time) as rainfall_mm_hr, 
        i.inflow_rate_m3s as inflow_m3s, 
        d.downstream_level_pct as downstream_lvl_pct
      FROM water_level_readings w
      LEFT JOIN inflow_readings i ON w.dam_id = i.dam_id AND w.reading_time = i.reading_time
      LEFT JOIN downstream_level_readings d ON w.dam_id = d.dam_id AND w.reading_time = d.reading_time
      ORDER BY w.reading_time DESC 
      LIMIT $1
    `, [limit]);
    
    // Return in chronological order for graphs
    return NextResponse.json(rows.reverse());
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
