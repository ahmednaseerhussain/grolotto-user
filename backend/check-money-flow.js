const { Pool } = require('pg');
const p = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_WNM7muvkX4Eb@ep-nameless-brook-ait2d4uq-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  try {
    // Check lottery_tickets columns
    const ticketCols = await p.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='lottery_tickets' ORDER BY ordinal_position"
    );
    console.log('lottery_tickets columns:', ticketCols.rows.map(c => c.column_name).join(', '));

    // Check transaction_type enum values
    const enumVals = await p.query(
      "SELECT unnest(enum_range(NULL::transaction_type)) as val"
    );
    console.log('\ntransaction_type enum values:', enumVals.rows.map(r => r.val).join(', '));

    // Check lottery_rounds columns for admin_commission_total
    const roundCols = await p.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='lottery_rounds' ORDER BY ordinal_position"
    );
    console.log('\nlottery_rounds columns:', roundCols.rows.map(c => c.column_name).join(', '));

    // Check pending vendor payouts
    const payouts = await p.query(
      "SELECT vp.*, v.display_name, v.first_name, v.last_name FROM vendor_payouts vp JOIN vendors v ON v.id = vp.vendor_id ORDER BY vp.created_at DESC LIMIT 5"
    );
    console.log('\nRecent vendor payouts:', JSON.stringify(payouts.rows, null, 2));

    // Check vendors balances
    const vendors = await p.query(
      "SELECT v.id, v.display_name, v.first_name, v.last_name, v.available_balance, v.total_revenue, v.commission_rate, v.status FROM vendors v ORDER BY v.created_at DESC"
    );
    console.log('\nVendors:', JSON.stringify(vendors.rows, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.end();
  }
}
check();
