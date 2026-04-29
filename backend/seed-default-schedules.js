// Seed default draw schedules for all approved vendors that have NONE.
// Default windows: Morning 06:00-11:00, Midday 12:00-14:30, Evening 17:00-21:00.
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const DEFAULTS = [
  { drawTime: 'morning', open: '06:00', close: '11:00' },
  { drawTime: 'midday', open: '12:00', close: '14:30' },
  { drawTime: 'evening', open: '17:00', close: '21:00' },
];

(async () => {
  const client = await pool.connect();
  try {
    // Approved + active vendors
    const vendorsRes = await client.query(
      `SELECT id, business_name FROM vendors WHERE status IN ('approved','active') AND is_active = TRUE`
    );

    let totalInserted = 0;
    for (const v of vendorsRes.rows) {
      // Skip if vendor already has any schedule
      const existing = await client.query(
        'SELECT 1 FROM vendor_draw_schedules WHERE vendor_id = $1 LIMIT 1',
        [v.id]
      );
      if (existing.rowCount > 0) {
        console.log(`SKIP ${v.business_name || v.id} (already has schedules)`);
        continue;
      }

      // Get the vendor's enabled draw states
      const states = await client.query(
        'SELECT draw_state FROM vendor_draw_configs WHERE vendor_id = $1 AND enabled = TRUE',
        [v.id]
      );

      let inserted = 0;
      for (const s of states.rows) {
        for (const d of DEFAULTS) {
          await client.query(
            `INSERT INTO vendor_draw_schedules (vendor_id, draw_state, draw_time, open_time, close_time, is_active)
             VALUES ($1, $2, $3, $4::time, $5::time, TRUE)
             ON CONFLICT (vendor_id, draw_state, draw_time) DO NOTHING`,
            [v.id, s.draw_state, d.drawTime, d.open, d.close]
          );
          inserted++;
        }
      }
      console.log(`✓ ${v.business_name || v.id}: inserted ${inserted} rows for ${states.rowCount} states`);
      totalInserted += inserted;
    }
    console.log(`\nDone. Inserted ${totalInserted} schedule rows total.`);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
})();
