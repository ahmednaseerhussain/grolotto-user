const { Pool } = require('pg');
const p = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_WNM7muvkX4Eb@ep-nameless-brook-ait2d4uq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
  try {
    // Add missing columns to gift_cards table for admin batch generation
    console.log('Adding missing columns to gift_cards...');
    
    await p.query(`
      ALTER TABLE gift_cards
        ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES gift_card_batches(id),
        ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20),
        ADD COLUMN IF NOT EXISTS is_redeemed BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
    `);
    console.log('Columns added successfully');

    // Verify columns
    const cols = await p.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='gift_cards' ORDER BY ordinal_position"
    );
    console.log('\nUpdated gift_cards columns:', cols.rows.map(c => c.column_name).join(', '));

  } catch (e) {
    console.error('Migration error:', e.message);
  } finally {
    await p.end();
  }
}
migrate();
