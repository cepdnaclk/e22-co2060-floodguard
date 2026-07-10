import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { damId } = await params;

    const { rows } = await pool.query(
      `SELECT location_id, location_name, latitude, longitude, elevation_m,
              district, province, country, weight, delay_minutes, station_code, is_active
       FROM rainfall_locations
       WHERE nearest_dam_id = $1 AND is_active = TRUE
       ORDER BY weight DESC, location_name ASC`,
      [damId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to list rainfall stations:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
