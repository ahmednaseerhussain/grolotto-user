const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_WNM7muvkX4Eb@ep-nameless-brook-ait2d4uq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function verify() {
  try {
    // Check brute force columns
    const cols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('failed_login_attempts','last_failed_login')"
    );
    console.log('Users brute-force columns:', cols.rows.map(x => x.column_name));

    // Check transactions column
    const txCols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name LIKE '%transaction_id'"
    );
    console.log('Transaction ID columns:', txCols.rows.map(x => x.column_name));

    // Check email_verifications table
    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE tablename = 'email_verifications'"
    );
    console.log('email_verifications table:', tables.rows.length > 0 ? 'EXISTS' : 'MISSING');

    // Quick test: can we login query without error?
    const testQuery = await pool.query(
      "SELECT u.id, u.email, u.failed_login_attempts, u.last_failed_login FROM users u LIMIT 1"
    );
    console.log('Login query test:', testQuery.rows.length >= 0 ? 'OK' : 'FAIL');
    if (testQuery.rows.length > 0) {
      console.log('Sample user:', { email: testQuery.rows[0].email, failed_attempts: testQuery.rows[0].failed_login_attempts });
    }

    // Check all tables
    const allTables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('All tables:', allTables.rows.map(x => x.tablename));

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await pool.end();
  }
}

verify();
