import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    if (limitParam) {
      const limit = parseInt(limitParam) || 60;
      const { rows } = await pool.query(`
        SELECT 
          c.calc_time as timestamp,
          c.rr_short,
          c.rr_long,
          c.acc,
          c.rolling_avg,
          c.deviation_score,
          r.status
        FROM calculated_metrics c
        LEFT JOIN risk_status r ON c.dam_id = r.dam_id AND c.calc_time = r.status_time
        ORDER BY c.calc_time DESC 
        LIMIT $1
      `, [limit]);
      return NextResponse.json(rows.reverse());
    } else {
      const { rows } = await pool.query(`
        SELECT 
          c.calc_time as timestamp,
          c.rr_short,
          c.rr_long,
          c.acc,
          c.rolling_avg,
          c.deviation_score,
          r.status
        FROM calculated_metrics c
        LEFT JOIN risk_status r ON c.dam_id = r.dam_id AND c.calc_time = r.status_time
        ORDER BY c.calc_time DESC 
        LIMIT 1
      `);
      
      if (rows.length === 0) {
        return NextResponse.json({ error: 'No data available' }, { status: 404 });
      }
      
      return NextResponse.json(rows[0]);
    }
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
