import bcrypt from 'bcrypt';
import { query, withTransaction } from './pool';
import pool from './pool';

/**
 * Seeds the database with initial data for development/staging.
 * NEVER run this in production with real data already present.
 */
async function seed() {
  console.log('🌱 Seeding database...');

  await withTransaction(async (client) => {
    // 1. Create admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 12);
    const adminResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role, is_verified, country)
       VALUES ($1, $2, $3, 'admin', TRUE, 'Haiti')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['admin@groloto.com', adminPasswordHash, 'System Admin']
    );
    const adminId = adminResult.rows[0]?.id;
    if (adminId) {
      await client.query(
        `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [adminId]
      );
    }

    // 2. Create demo player
    const playerPasswordHash = await bcrypt.hash('123456', 12);
    const playerResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role, phone, is_verified, country)
       VALUES ($1, $2, $3, 'player', '+509 3456-7890', TRUE, 'Haiti')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['themepam89@groloto.com', playerPasswordHash, 'themepam89']
    );
    const playerId = playerResult.rows[0]?.id;
    if (playerId) {
      await client.query(
        `INSERT INTO wallets (user_id, balance_usd) VALUES ($1, 100.00) ON CONFLICT (user_id) DO NOTHING`,
        [playerId]
      );
    }

    // 3. Create vendor user + vendor profile
    const vendorPasswordHash = await bcrypt.hash('123456', 12);
    const vendorUserResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role, phone, is_verified, country)
       VALUES ($1, $2, $3, 'vendor', '555-0123', TRUE, 'United States')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['lucky@groloto.com', vendorPasswordHash, 'Lucky Numbers GA']
    );
    const vendorUserId = vendorUserResult.rows[0]?.id;
    
    if (vendorUserId) {
      await client.query(
        `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [vendorUserId]
      );

      const vendorResult = await client.query(
        `INSERT INTO vendors (user_id, first_name, last_name, business_name, display_name, status, 
         application_date, approved_date, bio, location, business_hours, specialties,
         total_revenue, available_balance, total_players, rating, total_tickets_sold, is_active)
         VALUES ($1, 'Lucky', 'Numbers', 'Lucky Numbers GA', 'Lucky Numbers GA', 'approved',
         NOW() - interval '2 days', NOW() - interval '1 day',
         'Professional lottery vendor serving the Atlanta area since 2020.',
         'Atlanta, GA', 'Mon-Sat 8AM-8PM, Sun 10AM-6PM',
         ARRAY['Georgia Lottery', 'New York Lottery', 'Fast Payouts'],
         15000.00, 2500.00, 45, 4.8, 230, TRUE)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING id`,
        [vendorUserId]
      );
      const vendorId = vendorResult.rows[0]?.id;

      if (vendorId) {
        // Create draw configs for the vendor
        for (const state of ['NY', 'GA'] as const) {
          const drawResult = await client.query(
            `INSERT INTO vendor_draw_configs (vendor_id, draw_state, enabled)
             VALUES ($1, $2, TRUE)
             ON CONFLICT (vendor_id, draw_state) DO NOTHING
             RETURNING id`,
            [vendorId, state]
          );
          const drawConfigId = drawResult.rows[0]?.id;
          if (drawConfigId) {
            for (const gameType of ['senp', 'maryaj', 'loto3', 'loto4', 'loto5'] as const) {
              await client.query(
                `INSERT INTO vendor_game_configs (draw_config_id, game_type, enabled, min_amount, max_amount)
                 VALUES ($1, $2, TRUE, $3, $4)
                 ON CONFLICT (draw_config_id, game_type) DO NOTHING`,
                [drawConfigId, gameType, 1, gameType === 'senp' ? 75 : gameType === 'loto5' ? 800 : 150]
              );
            }
          }
        }
      }
    }

    // 4. Create second vendor
    const vendor2PasswordHash = await bcrypt.hash('123456', 12);
    const vendor2UserResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role, phone, is_verified, country)
       VALUES ($1, $2, $3, 'vendor', '555-0456', TRUE, 'United States')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      ['bigwin@groloto.com', vendor2PasswordHash, 'Big Win Florida']
    );
    const vendor2UserId = vendor2UserResult.rows[0]?.id;
    if (vendor2UserId) {
      await client.query(
        `INSERT INTO wallets (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [vendor2UserId]
      );
      const vendor2Result = await client.query(
        `INSERT INTO vendors (user_id, first_name, last_name, business_name, display_name, status, 
         application_date, approved_date, total_revenue, available_balance, total_players, rating, 
         total_tickets_sold, is_active)
         VALUES ($1, 'Big Win', 'Florida', 'Big Win Florida', 'Big Win Florida', 'approved',
         NOW() - interval '4 days', NOW() - interval '2 days',
         8500.00, 1200.00, 28, 4.2, 158, TRUE)
         ON CONFLICT (user_id) DO NOTHING
         RETURNING id`,
        [vendor2UserId]
      );
      const vendor2Id = vendor2Result.rows[0]?.id;
      if (vendor2Id) {
        const drawResult = await client.query(
          `INSERT INTO vendor_draw_configs (vendor_id, draw_state, enabled)
           VALUES ($1, 'FL', TRUE) ON CONFLICT (vendor_id, draw_state) DO NOTHING RETURNING id`,
          [vendor2Id]
        );
        const drawConfigId = drawResult.rows[0]?.id;
        if (drawConfigId) {
          for (const gt of ['senp', 'maryaj', 'loto3', 'loto4', 'loto5'] as const) {
            await client.query(
              `INSERT INTO vendor_game_configs (draw_config_id, game_type, enabled, min_amount, max_amount)
               VALUES ($1, $2, TRUE, 1, 150) ON CONFLICT (draw_config_id, game_type) DO NOTHING`,
              [drawConfigId, gt]
            );
          }
        }
      }
    }

    // 5. Seed advertisements
    const adData = [
      { title: '🎯 GROLOTO', subtitle: 'Win Big Today!', content: 'Play your lucky numbers and win up to 50x your bet!', bg: '#38bdf8', text: '#000000', order: 1 },
      { title: '📱 Live Results', subtitle: 'Never Miss a Win', content: 'Check winning numbers instantly. Results updated every hour!', bg: '#10b981', text: '#ffffff', order: 2 },
      { title: '🎁 New Player Bonus', subtitle: '20% Extra Credit', content: 'Welcome! Get 20% bonus on your first deposit today.', bg: '#f59e0b', text: '#000000', order: 3 },
      { title: '💰 Big Winners Club', subtitle: 'Hall of Fame', content: 'Last week: G50,000 jackpot winner from Port-au-Prince!', bg: '#8b5cf6', text: '#ffffff', order: 4 },
      { title: '🏆 Weekend Special', subtitle: 'Double Winnings', content: 'Double your winnings on weekends!', bg: '#ef4444', text: '#ffffff', order: 5 },
    ];
    for (const ad of adData) {
      await client.query(
        `INSERT INTO advertisements (title, subtitle, content, background_color, text_color,
         ad_type, status, start_date, end_date, target_audience, priority, display_order, created_by)
         VALUES ($1, $2, $3, $4, $5, 'slideshow', 'active', NOW() - interval '1 day',
         NOW() + interval '30 days', 'all', 'high', $6, $7)`,
        [ad.title, ad.subtitle, ad.content, ad.bg, ad.text, ad.order, adminId]
      );
    }

    // 6. Seed dream dictionary
    const dreams = [
      { keyword: 'wedding', numbers: [29, 47], desc: 'Marriage, union, celebration', lang: 'en' },
      { keyword: 'maryaj', numbers: [29, 47], desc: 'Marriage, union, celebration', lang: 'ht' },
      { keyword: 'death', numbers: [48, 17], desc: 'Ending, transformation', lang: 'en' },
      { keyword: 'lanmò', numbers: [48, 17], desc: 'Ending, transformation', lang: 'ht' },
      { keyword: 'water', numbers: [25, 63], desc: 'Life, cleansing, flow', lang: 'en' },
      { keyword: 'dlo', numbers: [25, 63], desc: 'Life, cleansing, flow', lang: 'ht' },
      { keyword: 'fire', numbers: [34, 81], desc: 'Passion, destruction, energy', lang: 'en' },
      { keyword: 'dife', numbers: [34, 81], desc: 'Passion, destruction, energy', lang: 'ht' },
      { keyword: 'money', numbers: [19, 77], desc: 'Wealth, prosperity', lang: 'en' },
      { keyword: 'lajan', numbers: [19, 77], desc: 'Wealth, prosperity', lang: 'ht' },
      { keyword: 'dog', numbers: [12, 44], desc: 'Loyalty, protection', lang: 'en' },
      { keyword: 'chen', numbers: [12, 44], desc: 'Loyalty, protection', lang: 'ht' },
      { keyword: 'cat', numbers: [3, 89], desc: 'Independence, mystery', lang: 'en' },
      { keyword: 'chat', numbers: [3, 89], desc: 'Independence, mystery', lang: 'ht' },
      { keyword: 'snake', numbers: [15, 92], desc: 'Wisdom, danger, transformation', lang: 'en' },
      { keyword: 'koulèv', numbers: [15, 92], desc: 'Wisdom, danger, transformation', lang: 'ht' },
      { keyword: 'fish', numbers: [28, 56], desc: 'Abundance, spirituality', lang: 'en' },
      { keyword: 'pwason', numbers: [28, 56], desc: 'Abundance, spirituality', lang: 'ht' },
      { keyword: 'bird', numbers: [7, 73], desc: 'Freedom, messages from above', lang: 'en' },
      { keyword: 'zwazo', numbers: [7, 73], desc: 'Freedom, messages from above', lang: 'ht' },
      { keyword: 'house', numbers: [22, 68], desc: 'Security, family, foundation', lang: 'en' },
      { keyword: 'kay', numbers: [22, 68], desc: 'Security, family, foundation', lang: 'ht' },
      { keyword: 'car', numbers: [41, 86], desc: 'Journey, progress, status', lang: 'en' },
      { keyword: 'machin', numbers: [41, 86], desc: 'Journey, progress, status', lang: 'ht' },
      { keyword: 'baby', numbers: [5, 52], desc: 'New beginnings, innocence', lang: 'en' },
      { keyword: 'tibebe', numbers: [5, 52], desc: 'New beginnings, innocence', lang: 'ht' },
      { keyword: 'mother', numbers: [14, 67], desc: 'Nurturing, protection, wisdom', lang: 'en' },
      { keyword: 'manman', numbers: [14, 67], desc: 'Nurturing, protection, wisdom', lang: 'ht' },
      { keyword: 'rain', numbers: [26, 94], desc: 'Cleansing, renewal, blessing', lang: 'en' },
      { keyword: 'lapli', numbers: [26, 94], desc: 'Cleansing, renewal, blessing', lang: 'ht' },
    ];
    for (const d of dreams) {
      await client.query(
        `INSERT INTO dream_dictionary (keyword, numbers, description, language)
         VALUES ($1, $2, $3, $4)`,
        [d.keyword, d.numbers, d.desc, d.lang]
      );
    }

    // 7. Create a sample open lottery round
    for (const state of ['NY', 'FL', 'GA', 'TX'] as const) {
      await client.query(
        `INSERT INTO lottery_rounds (draw_state, draw_date, draw_time, status)
         VALUES ($1, CURRENT_DATE, 'midday', 'open')
         ON CONFLICT (draw_state, draw_date, draw_time) DO NOTHING`,
        [state]
      );
      await client.query(
        `INSERT INTO lottery_rounds (draw_state, draw_date, draw_time, status)
         VALUES ($1, CURRENT_DATE, 'evening', 'open')
         ON CONFLICT (draw_state, draw_date, draw_time) DO NOTHING`,
        [state]
      );
    }
  });

  console.log('✅ Database seeded successfully!');
  await pool.end();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
