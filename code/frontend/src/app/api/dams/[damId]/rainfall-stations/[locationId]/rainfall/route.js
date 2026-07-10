import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { locationId } = await params;
    const { searchParams } = new URL(request.url);
    
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to') || new Date().toISOString();
    const resolution = searchParams.get('resolution') || 'raw';

    if (!fromParam) {
      return NextResponse.json({ error: 'Missing parameter "from"' }, { status: 400 });
    }

    let query = '';
    const queryParams = [locationId, fromParam, toParam];

    if (resolution === '1h') {
      query = `
        SELECT date_trunc('hour', reading_time) AS time,
               AVG(rainfall_mm_hr) AS value
        FROM rainfall_readings
        WHERE location_id = $1 AND reading_time BETWEEN $2 AND $3
        GROUP BY time
        ORDER BY time ASC
      `;
    } else if (resolution === '15m') {
      const secondsBin = 900;
      query = `
        SELECT to_timestamp(floor(extract(epoch from reading_time) / ${secondsBin}) * ${secondsBin}) AS time,
               AVG(rainfall_mm_hr) AS value
        FROM rainfall_readings
        WHERE location_id = $1 AND reading_time BETWEEN $2 AND $3
        GROUP BY time
        ORDER BY time ASC
      `;
    } else {
      query = `
        SELECT reading_time AS time, rainfall_mm_hr AS value
        FROM rainfall_readings
        WHERE location_id = $1 AND reading_time BETWEEN $2 AND $3
        ORDER BY time ASC
      `;
    }

    const { rows } = await pool.query(query, queryParams);

    return NextResponse.json({
      live: rows,
      predicted: [] // Per-station rainfall predictions are intermediate calculations and not stored in the schema
    });

  } catch (error) {
    console.error('Failed to get station rainfall:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
