const { Pool } = require('pg');
const p = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_WNM7muvkX4Eb@ep-nameless-brook-ait2d4uq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  try {
    // Check for gift card tables
    const tables = await p.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%gift%'"
    );
    console.log('Gift card tables:', JSON.stringify(tables.rows));

    // If gift_cards exists, check its columns
    if (tables.rows.length > 0) {
      for (const t of tables.rows) {
        const cols = await p.query(
          "SELECT column_name, data_type FROM information_schema.columns WHERE table_name=$1 ORDER BY ordinal_position",
          [t.table_name]
        );
        console.log(`\nColumns of ${t.table_name}:`, JSON.stringify(cols.rows));
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.end();
  }
}
main();
