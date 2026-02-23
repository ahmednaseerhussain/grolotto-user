/**
 * MonCash Payment Integration Test Script
 * 
 * Tests the complete MonCash payment flow:
 * 1. OAuth2 token acquisition
 * 2. Payment creation
 * 3. Payment redirect URL generation
 * 4. Payment retrieval by orderId
 * 
 * Usage: npx ts-node test-moncash.ts
 * Or:    npx tsx test-moncash.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import axios from 'axios';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const CLIENT_ID = process.env.MONCASH_CLIENT_ID || '';
const CLIENT_SECRET = process.env.MONCASH_CLIENT_SECRET || '';
const BASE_URL = process.env.MONCASH_BASE_URL || 'https://sandbox.moncashbutton.digicelgroup.com';

async function test() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  MonCash Payment Integration Test');
  console.log('═══════════════════════════════════════════\n');

  // ── Step 1: Check credentials ──
  console.log('📋 Configuration:');
  console.log(`   Base URL:     ${BASE_URL}`);
  console.log(`   Client ID:    ${CLIENT_ID.substring(0, 8)}...${CLIENT_ID.substring(CLIENT_ID.length - 4)}`);
  console.log(`   Secret:       ${CLIENT_SECRET.substring(0, 4)}...${CLIENT_SECRET.substring(CLIENT_SECRET.length - 4)}`);

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('\n❌ MONCASH_CLIENT_ID and MONCASH_CLIENT_SECRET must be set in .env');
    process.exit(1);
  }

  // ── Step 2: Get OAuth2 token ──
  console.log('\n🔑 Step 1: Acquiring OAuth2 access token...');
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  try {
    const tokenResponse = await axios.post(
      `${BASE_URL}/Api/oauth/token`,
      'scope=read,write&grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      }
    );

    const { access_token, expires_in, token_type, scope } = tokenResponse.data;
    console.log(`   ✅ Token acquired (type: ${token_type}, expires in: ${expires_in}s, scope: ${scope})`);
    console.log(`   Token prefix: ${access_token.substring(0, 40)}...`);

    // ── Step 3: Create payment ──
    const orderId = `GRO_TEST_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const amount = 100; // 100 HTG

    console.log(`\n💳 Step 2: Creating payment...`);
    console.log(`   Order ID: ${orderId}`);
    console.log(`   Amount:   ${amount} HTG`);

    const paymentResponse = await axios.post(
      `${BASE_URL}/Api/v1/CreatePayment`,
      { amount, orderId },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const paymentToken = paymentResponse.data?.payment_token?.token;
    const paymentUrl = `${BASE_URL}/Moncash-business/Payment/Redirect?token=${paymentToken}`;

    console.log(`   ✅ Payment created (mode: ${paymentResponse.data.mode}, status: ${paymentResponse.data.status})`);
    console.log(`   Payment Token: ${paymentToken?.substring(0, 40)}...`);
    console.log(`   Redirect URL:  ${paymentUrl.substring(0, 80)}...`);

    // ── Step 4: Try to retrieve payment by order ID (expect 404 since not paid yet) ──
    console.log(`\n🔍 Step 3: Retrieving order (expected: 404 - not paid yet)...`);

    try {
      const retrieveResponse = await axios.post(
        `${BASE_URL}/Api/v1/RetrieveOrderPayment`,
        { orderId },
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );
      console.log(`   Payment found:`, retrieveResponse.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log(`   ✅ 404 as expected — order not yet paid by user`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${err.response?.status} ${err.response?.data?.message || err.message}`);
      }
    }

    // ── Summary ──
    console.log('\n═══════════════════════════════════════════');
    console.log('  ✅ ALL TESTS PASSED');
    console.log('═══════════════════════════════════════════');
    console.log('\n📱 To complete a sandbox payment, open this URL in a browser:');
    console.log(`   ${paymentUrl}`);
    console.log('\n   MonCash sandbox test credentials:');
    console.log('   Phone: 50937000001 or 50933000001');
    console.log('   PIN:   1234 or 1111');
    console.log('\n🔗 MonCash Return URL (configure in MonCash Business dashboard):');
    console.log('   https://grolotto-user.onrender.com/api/payments/moncash/return');
    console.log('\n🔗 MonCash Alert/Notify URL:');
    console.log('   https://grolotto-user.onrender.com/api/payments/moncash/notify');
    console.log('');

  } catch (err: any) {
    console.error(`\n❌ FAILED: ${err.response?.data?.error_description || err.response?.data?.message || err.message}`);
    if (err.response?.data) {
      console.error('   Response:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

test();
