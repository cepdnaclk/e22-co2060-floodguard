import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { damId } = await params;

    // Fetch latest risk status
    const statusQuery = `
      SELECT status, trigger_reason, ttc_minutes, status_time, previous_status
      FROM risk_status
      WHERE dam_id = $1
      ORDER BY status_time DESC
      LIMIT 1
    `;
    
    // Fetch latest water level
    const waterLevelQuery = `
      SELECT water_level_pct, reading_time
      FROM water_level_readings
      WHERE dam_id = $1
      ORDER BY reading_time DESC
      LIMIT 1
    `;
    
    // Fetch latest inflow
    const inflowQuery = `
      SELECT inflow_rate_m3s, reading_time
      FROM inflow_readings
      WHERE dam_id = $1
      ORDER BY reading_time DESC
      LIMIT 1
    `;
    
    // Fetch latest downstream level
    const downstreamQuery = `
      SELECT downstream_level_pct, reading_time
      FROM downstream_level_readings
      WHERE dam_id = $1
      ORDER BY reading_time DESC
      LIMIT 1
    `;
    
    // Fetch latest threshold calculation
    const thresholdQuery = `
      SELECT adaptive_threshold, calc_time, rr_adj, rf_adj, if_adj, dl_adj, floor_triggered, ceiling_triggered
      FROM threshold_calculations
      WHERE dam_id = $1
      ORDER BY calc_time DESC
      LIMIT 1
    `;

    // Fetch latest release recommendation
    const releaseQuery = `
      SELECT q_release, gate_opening_applied_pct, conflict_warning, estimated_duration_minutes, strategy, rise_rate_used, calc_time
      FROM release_recommendations
      WHERE dam_id = $1
      ORDER BY calc_time DESC
      LIMIT 1
    `;

    // Execute queries in parallel
    const [
      statusRes,
      waterLevelRes,
      inflowRes,
      downstreamRes,
      thresholdRes,
      releaseRes
    ] = await Promise.all([
      pool.query(statusQuery, [damId]),
      pool.query(waterLevelQuery, [damId]),
      pool.query(inflowQuery, [damId]),
      pool.query(downstreamQuery, [damId]),
      pool.query(thresholdQuery, [damId]),
      pool.query(releaseQuery, [damId])
    ]);

    const statusRow = statusRes.rows[0] || null;
    const waterLevelRow = waterLevelRes.rows[0] || null;
    const inflowRow = inflowRes.rows[0] || null;
    const downstreamRow = downstreamRes.rows[0] || null;
    const thresholdRow = thresholdRes.rows[0] || null;
    const releaseRow = releaseRes.rows[0] || null;

    if (releaseRow) {
      const at = thresholdRow ? thresholdRow.adaptive_threshold : 75.0;
      releaseRow.target_safe_level = Math.max(at - 10.0, 30.0);
    }

    // Return whatever status records are found (null if empty)
    return NextResponse.json({
      risk_status: statusRow,
      water_level: waterLevelRow,
      inflow: inflowRow,
      downstream_level: downstreamRow,
      threshold: thresholdRow,
      release: releaseRow
    });

  } catch (error) {
    console.error('Failed to get dam status:', error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
