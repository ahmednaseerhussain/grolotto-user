require('dotenv').config();
const { Pool } = require('pg');
const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  try {
    const r = await p.query(
      'SELECT vendor_id, draw_state, draw_time, open_time::text AS open_time, close_time::text AS close_time, is_active FROM vendor_draw_schedules WHERE vendor_id = $1',
      ['c73ebf86-c381-4713-8959-960c64be955d']
    );
    console.log('rows for this vendor:', r.rowCount);
    console.log(JSON.stringify(r.rows, null, 2));
    const total = await p.query('SELECT COUNT(*)::int AS c FROM vendor_draw_schedules');
    console.log('total rows in table:', total.rows[0].c);
  } catch (e) {
    console.error(e.message);
  } finally {
    await p.end();
  }
})();
