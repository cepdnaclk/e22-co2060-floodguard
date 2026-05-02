import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM processed_results 
      ORDER BY timestamp DESC 
      LIMIT 1
    `);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data available' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
