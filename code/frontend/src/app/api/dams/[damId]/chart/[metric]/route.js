import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const { damId, metric } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parse range params
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to') || new Date().toISOString();
    const resolution = searchParams.get('resolution') || 'raw';

    if (!fromParam) {
      return NextResponse.json({ error: 'Missing parameter "from"' }, { status: 400 });
    }

    // Determine query parameters based on metric type
    let table = '';
    let timeCol = '';
    let selectFields = '';
    
    if (metric === 'water-level') {
      table = 'water_level_readings';
      timeCol = 'reading_time';
      selectFields = 'water_level_pct AS value';
    } else if (metric === 'threshold') {
      table = 'threshold_calculations';
      timeCol = 'calc_time';
      selectFields = 'adaptive_threshold AS value';
    } else if (metric === 'inflow') {
      table = 'inflow_readings';
      timeCol = 'reading_time';
      selectFields = 'inflow_rate_m3s AS value';
    } else if (metric === 'release') {
      table = 'release_recommendations';
      timeCol = 'calc_time';
      selectFields = 'q_release AS value, gate_opening_applied_pct AS gate_pct';
    } else if (metric === 'rise-rate') {
      table = 'calculated_metrics';
      timeCol = 'calc_time';
      selectFields = 'rr_short, rr_long, acc';
    } else if (metric === 'net-rainfall') {
      // Handled via custom query below
      table = '';
    } else {
      return NextResponse.json({ error: `Unknown metric type: ${metric}` }, { status: 400 });
    }

    // Resolution / downsampling clause
    let query = '';
    let queryParams = [damId, fromParam, toParam];
    
    if (metric === 'net-rainfall') {
      if (resolution === '1h') {
        query = `
          SELECT date_trunc('hour', r.reading_time) AS time,
                 AVG(l.weight * r.rainfall_mm_hr) AS value
          FROM rainfall_readings r
          JOIN rainfall_locations l ON r.location_id = l.location_id
          WHERE l.nearest_dam_id = $1 AND r.reading_time BETWEEN $2 AND $3
          GROUP BY time
          ORDER BY time ASC
        `;
      } else if (resolution === '15m') {
        const secondsBin = 900;
        query = `
          SELECT to_timestamp(floor(extract(epoch from r.reading_time) / ${secondsBin}) * ${secondsBin}) AS time,
                 AVG(l.weight * r.rainfall_mm_hr) AS value
          FROM rainfall_readings r
          JOIN rainfall_locations l ON r.location_id = l.location_id
          WHERE l.nearest_dam_id = $1 AND r.reading_time BETWEEN $2 AND $3
          GROUP BY time
          ORDER BY time ASC
        `;
      } else {
        query = `
          SELECT r.reading_time AS time,
                 SUM(l.weight * r.rainfall_mm_hr) AS value
          FROM rainfall_readings r
          JOIN rainfall_locations l ON r.location_id = l.location_id
          WHERE l.nearest_dam_id = $1 AND r.reading_time BETWEEN $2 AND $3
          GROUP BY r.reading_time
          ORDER BY time ASC
        `;
      }
    } else if (resolution === '1h') {
      if (metric === 'rise-rate') {
        query = `
          SELECT date_trunc('hour', ${timeCol}) AS time,
                 AVG(rr_short) AS rr_short,
                 AVG(rr_long) AS rr_long,
                 AVG(acc) AS acc
          FROM ${table}
          WHERE dam_id = $1 AND ${timeCol} BETWEEN $2 AND $3
          GROUP BY time
          ORDER BY time ASC
        `;
      } else if (metric === 'release') {
        query = `
          SELECT date_trunc('hour', ${timeCol}) AS time,
                 AVG(q_release) AS value,
                 AVG(gate_opening_applied_pct) AS gate_pct
          FROM ${table}
          WHERE dam_id = $1 AND ${timeCol} BETWEEN $2 AND $3
          GROUP BY time
          ORDER BY time ASC
        `;
      } else {
        query = `
          SELECT date_trunc('hour', ${timeCol}) AS time,
                 AVG(${selectFields.split(' AS ')[0]}) AS value
          FROM ${table}
          WHERE dam_id = $1 AND ${timeCol} BETWEEN $2 AND $3
          GROUP BY time
          ORDER BY time ASC
        `;
      }
    } else if (resolution === '15m') {
      const secondsBin = 900;
      if (metric === 'rise-rate') {
        query = `
          SELECT to_timestamp(floor(extract(epoch from ${timeCol}) / ${secondsBin}) * ${secondsBin}) AS time,
                 AVG(rr_short) AS rr_short,
                 AVG(rr_long) AS rr_long,
                 AVG(acc) AS acc
          FROM ${table}
          WHERE dam_id = $1 AND ${timeCol} BETWEEN $2 AND $3
          GROUP BY time
          ORDER BY time ASC
        `;
      } else if (metric === 'release') {
        query = `
          SELECT to_timestamp(floor(extract(epoch from ${timeCol}) / ${secondsBin}) * ${secondsBin}) AS time,
                 AVG(q_release) AS value,
                 AVG(gate_opening_applied_pct) AS gate_pct
          FROM ${table}
          WHERE dam_id = $1 AND ${timeCol} BETWEEN $2 AND $3
          GROUP BY time
          ORDER BY time ASC
        `;
      } else {
        query = `
          SELECT to_timestamp(floor(extract(epoch from ${timeCol}) / ${secondsBin}) * ${secondsBin}) AS time,
                 AVG(${selectFields.split(' AS ')[0]}) AS value
          FROM ${table}
          WHERE dam_id = $1 AND ${timeCol} BETWEEN $2 AND $3
          GROUP BY time
          ORDER BY time ASC
        `;
      }
    } else {
      // Raw resolution
      query = `
        SELECT ${timeCol} AS time, ${selectFields}
        FROM ${table}
        WHERE dam_id = $1 AND ${timeCol} BETWEEN $2 AND $3
        ORDER BY time ASC
      `;
    }

    const liveRes = await pool.query(query, queryParams);
    const liveData = liveRes.rows;

    // Fetch predicted segment (if metric has one and query spans current time)
    const predictedData = [];
    
    if (metric !== 'release') {
      // Fetch latest successful prediction run details and predicted points
      const predRunQuery = `
        SELECT run_id, run_time
        FROM prediction_runs
        WHERE dam_id = $1 AND status = 'success'
        ORDER BY run_time DESC
        LIMIT 1
      `;
      const predRunRes = await pool.query(predRunQuery, [damId]);
      
      if (predRunRes.rows.length > 0) {
        const run = predRunRes.rows[0];
        
        // Fetch predicted values for this run
        const predValuesQuery = `
          SELECT horizon_minutes, predicted_water_level_pct, predicted_r_net, predicted_inflow,
                 predicted_downstream_level, predicted_rise_rate, predicted_acc, predicted_adaptive_threshold
          FROM predicted_values
          WHERE run_id = $1
          ORDER BY horizon_minutes ASC
        `;
        const predValuesRes = await pool.query(predValuesQuery, [run.run_id]);
        
        const runTime = new Date(run.run_time);
        
        for (const pv of predValuesRes.rows) {
          const predTime = new Date(runTime.getTime() + pv.horizon_minutes * 60 * 1000);
          
          let item = { time: predTime.toISOString() };
          
          if (metric === 'water-level') {
            item.value = pv.predicted_water_level_pct;
          } else if (metric === 'threshold') {
            item.value = pv.predicted_adaptive_threshold;
          } else if (metric === 'inflow') {
            item.value = pv.predicted_inflow;
          } else if (metric === 'net-rainfall') {
            item.value = pv.predicted_r_net;
          } else if (metric === 'rise-rate') {
            item.rr_short = pv.predicted_rise_rate; // predicted short-term rise rate
            item.rr_long = pv.predicted_rise_rate;  // predicted long-term is also the same
            item.acc = pv.predicted_acc;
          }
          
          predictedData.push(item);
        }
      }
    }

    return NextResponse.json({
      live: liveData,
      predicted: predictedData
    });

  } catch (error) {
    console.error(`Failed to load ${metric} chart data:`, error);
    return NextResponse.json({ error: 'database_unavailable' }, { status: 503 });
  }
}
