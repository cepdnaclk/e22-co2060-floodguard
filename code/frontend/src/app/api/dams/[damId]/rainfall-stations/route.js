import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { damId } = await params;

    const { rows } = await pool.query(
      `SELECT l.location_id, l.location_name, l.latitude, l.longitude, l.elevation_m,
              l.district, l.province, l.country, l.weight, l.delay_minutes, l.station_code, l.is_active,
              COALESCE(r.rainfall_mm_hr, 0.0) AS rainfall_mm_hr,
              r.reading_time AS latest_reading_time
       FROM rainfall_locations l
       LEFT JOIN LATERAL (
         SELECT rainfall_mm_hr, reading_time
         FROM rainfall_readings
         WHERE location_id = l.location_id
         ORDER BY reading_time DESC
         LIMIT 1
       ) r ON true
       WHERE l.nearest_dam_id = $1 AND l.is_active = TRUE
       ORDER BY l.weight DESC, l.location_name ASC`,
      [damId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to list rainfall stations:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
