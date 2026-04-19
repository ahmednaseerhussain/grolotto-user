#!/usr/bin/env node
/**
 * Diagnostic script to check gift card redemption status
 * Run: node scripts/check-gift-cards.js
 */
const { query } = require('../src/database/pool');

async function checkGiftCards() {
  try {
    console.log('=== Gift Card Diagnostic Report ===\n');

    // Check for mismatched records
    console.log('1. Cards with status=redeemed but is_redeemed=FALSE:');
    const mismatched = await query(`
      SELECT id, pin_code, code, status, is_redeemed, redeemed_at, redeemed_by
      FROM gift_cards
      WHERE status = 'redeemed' AND is_redeemed IS DISTINCT FROM TRUE
      LIMIT 10
    `);
    console.log(`   Found: ${mismatched.rows.length} cards`);
    mismatched.rows.forEach(c => {
      console.log(`   - ID: ${c.id}, PIN: ${c.pin_code}, status: ${c.status}, is_redeemed: ${c.is_redeemed}`);
    });

    // Check for cards with redeemed_at but no is_redeemed
    console.log('\n2. Cards with redeemed_at set but is_redeemed=FALSE:');
    const withRedeemedAt = await query(`
      SELECT id, pin_code, code, status, is_redeemed, redeemed_at, redeemed_by
      FROM gift_cards
      WHERE redeemed_at IS NOT NULL AND is_redeemed IS DISTINCT FROM TRUE
      LIMIT 10
    `);
    console.log(`   Found: ${withRedeemedAt.rows.length} cards`);
    withRedeemedAt.rows.forEach(c => {
      console.log(`   - ID: ${c.id}, PIN: ${c.pin_code}, redeemed_at: ${c.redeemed_at}`);
    });

    // Check batch summary
    console.log('\n3. Batch redemption summary:');
    const batches = await query(`
      SELECT 
        gb.id,
        gb.quantity,
        COUNT(gc.id) as total_cards,
        COUNT(gc.id) FILTER (WHERE gc.is_redeemed = TRUE) as redeemed_count,
        COUNT(gc.id) FILTER (WHERE gc.status = 'redeemed') as status_redeemed_count
      FROM gift_card_batches gb
      LEFT JOIN gift_cards gc ON gc.batch_id = gb.id
      GROUP BY gb.id
      ORDER BY gb.created_at DESC
      LIMIT 5
    `);
    batches.rows.forEach(b => {
      console.log(`   Batch ${b.id.substring(0,8)}: ${b.redeemed_count}/${b.total_cards} (is_redeemed), ${b.status_redeemed_count} (status=redeemed)`);
    });

    // Fix mismatched records
    console.log('\n4. Fixing mismatched records...');
    const fixResult = await query(`
      UPDATE gift_cards
      SET is_redeemed = TRUE
      WHERE (status = 'redeemed' OR redeemed_at IS NOT NULL) 
        AND is_redeemed IS DISTINCT FROM TRUE
    `);
    console.log(`   Fixed ${fixResult.rowCount} cards`);

    // Verify fix
    console.log('\n5. Verification after fix:');
    const verify = await query(`
      SELECT COUNT(*) as remaining
      FROM gift_cards
      WHERE status = 'redeemed' AND is_redeemed IS DISTINCT FROM TRUE
    `);
    console.log(`   Remaining mismatched: ${verify.rows[0].remaining}`);

    console.log('\n=== Done ===');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkGiftCards();
