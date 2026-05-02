import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const totalRes = await pool.query(`SELECT COUNT(*) as count FROM processed_results`);
        const emergencyRes = await pool.query(`SELECT COUNT(*) as count FROM processed_results WHERE status = 'EMERGENCY' OR status = 'RED'`);
        const maxLevelRes = await pool.query(`SELECT MAX(l_t) as max_level FROM processed_results`);
        const recentEventsRes = await pool.query(`
        SELECT id, timestamp, l_t, status 
        FROM processed_results 
        ORDER BY timestamp DESC 
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
