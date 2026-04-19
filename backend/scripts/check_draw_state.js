#!/usr/bin/env node
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || undefined,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  database: process.env.DB_NAME || undefined,
  user: process.env.DB_USER || undefined,
  password: process.env.DB_PASSWORD || undefined,
});

async function run() {
  try {
    console.log('Checking draw_state enum values...');
    const enumRes = await pool.query(
      "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'draw_state' ORDER BY e.enumsortorder"
    );
    if (enumRes.rows.length === 0) {
      console.log('No enum named draw_state found.');
    } else {
      console.log('draw_state enum values:', enumRes.rows.map(r => r.enumlabel).join(', '));
    }

    async function checkColumn(table) {
      const col = await pool.query(
        `SELECT data_type, udt_name FROM information_schema.columns WHERE table_name = $1 AND column_name = 'draw_state'`,
        [table]
      );
      if (col.rows.length === 0) {
        console.log(`${table}: column draw_state not found`);
      } else {
        console.log(`${table}: data_type=${col.rows[0].data_type}, udt_name=${col.rows[0].udt_name}`);
      }
    }

    await checkColumn('lottery_rounds');
    await checkColumn('lottery_tickets');

    console.log('If enum does not contain KY, run the startup migrations or run:');
    console.log("  psql $DATABASE_URL -c \"ALTER TYPE draw_state ADD VALUE IF NOT EXISTS 'KY'\"\n");
  } catch (err) {
    console.error('Error checking draw_state:', err.message || err);
    process.exitCode = 2;
  } finally {
    await pool.end();
  }
}

run();
