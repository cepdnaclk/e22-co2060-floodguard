import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const totalRes = await pool.query(`SELECT COUNT(*) as count FROM risk_status`);
        const emergencyRes = await pool.query(`SELECT COUNT(*) as count FROM risk_status WHERE status = 'RED'`);
        const maxLevelRes = await pool.query(`SELECT MAX(water_level_pct) as max_level FROM water_level_readings`);
        
        const recentEventsRes = await pool.query(`
        SELECT 
            r.status_id as id, 
            r.status_time as timestamp, 
            w.water_level_pct as l_t, 
            r.status 
        FROM risk_status r
        LEFT JOIN water_level_readings w ON r.dam_id = w.dam_id AND r.status_time = w.reading_time
        ORDER BY r.status_time DESC 
        LIMIT 5
    `);

        return NextResponse.json({
            total_incidents: parseInt(totalRes.rows[0].count || '0'),
            emergency_scenarios: parseInt(emergencyRes.rows[0].count || '0'),
            highest_level: maxLevelRes.rows[0].max_level ? parseFloat(maxLevelRes.rows[0].max_level) : 0,
            recent_incidents: recentEventsRes.rows
        });
    } catch (error) {
        console.error('Database history API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
    }
}
