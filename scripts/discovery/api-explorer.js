#!/usr/bin/env node
/**
 * Segwik API Explorer
 * Interactive script for discovering and testing Segwik API endpoints
 *
 * Usage: node api-explorer.js [command]
 * Commands:
 *   verify       - Verify API token works
 *   create       - Create a test customer
 *   lookup       - Test customer lookup endpoints
 *   upsert       - Test upsert behavior (creates duplicate!)
 *   transaction  - Test transaction endpoints
 *   all          - Run all discovery tests
 */

const fs = require('fs');
const path = require('path');
const SegwikClient = require('./segwik-client');

// Load token from environment or use default for testing
const API_TOKEN = process.env.SEGWIK_API_TOKEN || 'lvvO4bCMosEckiChf9Js';
const client = new SegwikClient(API_TOKEN);

// Test data
const TEST_CUSTOMER = {
    firstname: 'Discovery',
    lastname: 'Test',
    email: 'jcksncllwy+segwik-discovery@gmail.com',
    phone: '5551234567',
    lead_from: 'migration-discovery'
};

// Results storage
const results = {
    timestamp: new Date().toISOString(),
    token: API_TOKEN.substring(0, 4) + '...',
    tests: []
};

/**
 * Log a test result
 */
function logResult(name, response, notes = '') {
    const status = response.ok ? '✓' : '✗';
    const statusColor = response.ok ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`\n${statusColor}${status}${reset} ${name}`);
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Duration: ${response.duration}ms`);

    if (response.data) {
        const dataStr = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data, null, 2);
        console.log(`  Response: ${dataStr}`);
    }

    if (notes) {
        console.log(`  Notes: ${notes}`);
    }

    results.tests.push({
        name,
        ...response,
        notes
    });
}

/**
 * Save results to file
 */
function saveResults(filename) {
    const resultsDir = path.join(__dirname, 'results');
    const filepath = path.join(resultsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${filepath}`);
}

// ============================================================
// Discovery Tests
// ============================================================

/**
 * Step 1: Verify token works
 */
async function verifyToken() {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 1: TOKEN VERIFICATION');
    console.log('='.repeat(60));

    // Try a simple endpoint to verify token
    // Using customer lookup with a dummy phone to see if we get auth error vs not found
    const response = await client.lookupCustomerByPhone('0000000000');

    if (response.status === 401 || response.status === 403) {
        logResult('Token Verification', response, 'TOKEN INVALID - got auth error');
        return false;
    } else {
        logResult('Token Verification', response,
            response.ok ? 'Token valid, endpoint responded' : 'Token likely valid (no auth error)');
        return true;
    }
}

/**
 * Step 2: Create test customer
 */
async function createTestCustomer() {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: CREATE TEST CUSTOMER');
    console.log('='.repeat(60));

    // Try /customer/add endpoint
    const response = await client.createCustomer(TEST_CUSTOMER);
    logResult('POST /customer/add', response);

    if (response.ok && response.data?.data?.customer_id) {
        console.log(`\n  >>> Customer ID: ${response.data.data.customer_id}`);
        return response.data.data.customer_id;
    }

    return null;
}

/**
 * Step 3: Find email-based lookup
 */
async function findEmailLookup(customerId) {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: FIND EMAIL-BASED LOOKUP');
    console.log('='.repeat(60));

    // Test 1: Try phone lookup (should work)
    console.log('\n--- Testing documented phone lookup ---');
    const phoneResponse = await client.lookupCustomerByPhone(TEST_CUSTOMER.phone);
    logResult('GET /customer/lookup/{token}/{phone}', phoneResponse, 'Documented endpoint');

    /* Test 2: Try email in phone field (probably won't work)
    Confirmed, doesn't work
    console.log('\n--- Testing email in phone field ---');
    const emailInPhoneResponse = await client.lookupCustomerByPhone(TEST_CUSTOMER.email);
    logResult('GET /customer/lookup/{token}/{email}', emailInPhoneResponse, 'Trying email instead of phone');
    */

    /* Test 3: Try /customer/search endpoint (undocumented)
    Confirmed that this endpoint doesn't exist.
    console.log('\n--- Probing /customer/search ---');
    const searchResponse = await client.post('/customer/search', { email: TEST_CUSTOMER.email });
    logResult('POST /customer/search', searchResponse, 'Undocumented - probing');
    */

    /* Test 4: Try /customer/list with POST (discovered it's POST not GET)
    console.log('\n--- Probing /customer/list (POST) ---');
    const listResponse = await client.post('/customer/list', { email: TEST_CUSTOMER.email });
    logResult('POST /customer/list {email}', listResponse, 'Discovered: endpoint is POST not GET');
    */

    /* Test 4b: Try /customer/list with phone
    const listByPhoneResponse = await client.post('/customer/list', { phone: TEST_CUSTOMER.phone });
    logResult('POST /customer/list {phone}', listByPhoneResponse, 'Try listing by phone');
    */

    /* Test 5: Try getting customer by ID (if we have one)
    if (customerId) {
        console.log('\n--- Testing customer by ID ---');
        const byIdResponse = await client.get(`/customer/${customerId}`);
        logResult(`GET /customer/${customerId}`, byIdResponse, 'Get by ID');
    }
        doesn't seem to work - no such endpoint
    */

    /* Test 6: Try /customer/profile endpoint (undocumented from Pete)
    console.log('\n--- Testing /customer/profile ---');
    const profileResponse = await client.customerProfile({ email: TEST_CUSTOMER.email });
    logResult('POST /customer/profile', profileResponse, 'Undocumented from Pete');

        nope - this endpoint doesn't exist either
    */
}

/**
 * Step 4: Test upsert behavior
 * This test fails. Upserting just adds a whole new customer with the same email.
 */
async function testUpsertBehavior() {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 4: TEST UPSERT BEHAVIOR');
    console.log('='.repeat(60));

    const firstCreateResponse = await client.createCustomer(TEST_CUSTOMER);
    logResult('POST /customer/add', firstCreateResponse,
        'Create first customer');

    // Check if we got a new customer_id or the same one
    if (firstCreateResponse.ok && firstCreateResponse.data?.data?.customer_id) {
        console.log(`\n  >>> First Customer ID: ${firstCreateResponse.data.data.customer_id}`);
    }

    // Try creating the same customer again with modified data
    const modifiedCustomer = {
        ...TEST_CUSTOMER,
        firstname: 'DiscoveryUpdated',
        general_info: 'Testing upsert - this is an update'
    };

    const secondCreateResponse = await client.createCustomer(modifiedCustomer);
    logResult('POST /customer/add (same email, different data)', secondCreateResponse,
        'Does it update existing or create duplicate?');

    // Check if we got a new customer_id or the same one
    if (secondCreateResponse.ok && secondCreateResponse.data?.data?.customer_id) {
        console.log(`\n  >>> Customer ID from upsert: ${secondCreateResponse.data.data.customer_id}`);
    }
}

/**
 * Step 5: Test transaction create
 */
async function testTransactionCreate(customerId) {
    console.log('\n' + '='.repeat(60));
    console.log('STEP 5: TEST TRANSACTION CREATE');
    console.log('='.repeat(60));

    if (!customerId) {
        console.log('  Skipping - no customer_id available');
        return;
    }

    // Try minimal transaction
    const minimalTransaction = {
        items: [
            { qty: 1, price: '9.99', product_id: 1 } // product_id 1 probably doesn't exist
        ],
        types: 1, // order type
        customer_token: customerId // guessing this is the customer_id
    };

    const response = await client.createTransaction(minimalTransaction);
    logResult('POST /customer/transaction/create (minimal)', response);

    // Try with more fields from Pete's example
    const fullTransaction = {
        items: [
            { qty: 1, price: '9.99', product_id: 1 }
        ],
        types: 1,
        customer_token: String(customerId),
        quote_subject: 'Test transaction from migration discovery'
    };

    const fullResponse = await client.createTransaction(fullTransaction);
    logResult('POST /customer/transaction/create (with quote_subject)', fullResponse);
}

/**
 * Main execution
 */
async function main() {
    const command = process.argv[2] || 'all';

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           SEGWIK API DISCOVERY                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Token: ${API_TOKEN.substring(0, 4)}...${API_TOKEN.substring(API_TOKEN.length - 4)}`);
    console.log(`Command: ${command}`);
    console.log(`Test Email: ${TEST_CUSTOMER.email}`);
    console.log(`Test Phone: ${TEST_CUSTOMER.phone}`);

    let customerId = null;

    switch (command) {
        case 'verify':
            await verifyToken();
            break;

        case 'create':
            if (await verifyToken()) {
                customerId = await createTestCustomer();
            }
            break;

        case 'lookup':
            if (await verifyToken()) {
                // Use a known customer_id from previous runs, or create one
                const knownCustomerId = process.argv[3] || null;
                await findEmailLookup(knownCustomerId ? parseInt(knownCustomerId) : null);
            }
            break;

        case 'upsert':
            console.log('\n⚠️  WARNING: This will create duplicate customers!');
            if (await verifyToken()) {
                await testUpsertBehavior();
            }
            break;

        case 'transaction':
            if (await verifyToken()) {
                const txCustomerId = process.argv[3];
                if (!txCustomerId) {
                    console.log('Usage: node api-explorer.js transaction <customer_id>');
                    console.log('Run "create" command first to get a customer_id');
                } else {
                    await testTransactionCreate(parseInt(txCustomerId));
                }
            }
            break;

        case 'all':
            if (await verifyToken()) {
                customerId = await createTestCustomer();
                await findEmailLookup(customerId);
                await testUpsertBehavior();
                await testTransactionCreate(customerId);
            }
            break;

        default:
            console.log('Unknown command:', command);
            console.log('Available commands: verify, create, lookup, upsert, transaction, all');
            break;
    }

    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    saveResults(`discovery-${command}-${timestamp}.json`);

    console.log('\n' + '='.repeat(60));
    console.log('DISCOVERY COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total tests: ${results.tests.length}`);
    console.log(`Passed: ${results.tests.filter(t => t.ok).length}`);
    console.log(`Failed: ${results.tests.filter(t => !t.ok).length}`);
}

main().catch(console.error);
