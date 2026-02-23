const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_WNM7muvkX4Eb@ep-nameless-brook-ait2d4uq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function verify() {
  const cols = await pool.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_name = 'lottery_rounds'
     AND column_name IN ('vendor_id','prize_pool','vendor_commission_total','vendor_profit','winner_count')
     ORDER BY column_name`
  );
  console.log('New columns:');
  console.table(cols.rows);

  const constr = await pool.query(
    `SELECT conname FROM pg_constraint WHERE conrelid = 'lottery_rounds'::regclass AND contype = 'u'`
  );
  console.log('Unique constraints:', constr.rows);

  await pool.end();
}
verify();
