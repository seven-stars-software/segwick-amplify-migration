#!/usr/bin/env node
/**
 * Segwik API Explorer
 * Interactive script for testing Segwik API endpoints
 *
 * Usage: node api-explorer.js [command]
 * Commands:
 *   verify       - Verify API token works
 *   create       - Create a test customer
 *   lookup       - Test customer lookup by phone
 *   upsert       - Test upsert behavior (should update, not duplicate)
 *   transaction  - Test transaction endpoints
 *   all          - Run all tests
 *
 * IMPORTANT: Uses email_json and phone_json fields per Shriniwas's guidance (2026-01-14)
 */

const fs = require('fs');
const path = require('path');
const SegwikClient = require('./segwik-client');
const { PERSONA } = require('./segwik-client');

// Load token from environment
const API_TOKEN = process.env.SEGWIK_API_TOKEN;
if (!API_TOKEN) {
    console.error('Error: SEGWIK_API_TOKEN environment variable is required');
    console.error('Run with: node --env-file=.env scripts/discovery/api-explorer.js [command]');
    process.exit(1);
}

const client = new SegwikClient(API_TOKEN);

// Test data - client.createCustomer() will auto-add email_json and phone_json
const TEST_CUSTOMER = {
    firstname: 'Discovery',
    lastname: 'Test',
    email: 'jcksncllwy+segwik-discovery@gmail.com',
    phone: '5551234567',
    lead_from: 'migration-discovery',
    custbase_id: PERSONA.LISTENER  // Audiobook consumer
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
            ? response.data.substring(0, 500)
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
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }
    const filepath = path.join(resultsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${filepath}`);
}

// ============================================================
// Discovery Tests
// ============================================================

/**
 * Verify token works
 */
async function verifyToken() {
    console.log('\n' + '='.repeat(60));
    console.log('TOKEN VERIFICATION');
    console.log('='.repeat(60));

    // Use phone lookup with dummy number - should get 200 even if not found
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
 * Create test customer (with email_json and phone_json)
 */
async function createTestCustomer() {
    console.log('\n' + '='.repeat(60));
    console.log('CREATE TEST CUSTOMER');
    console.log('='.repeat(60));

    console.log('  Using email_json and phone_json fields (per Shriniwas)');

    const response = await client.createCustomer(TEST_CUSTOMER);
    logResult('POST /customer/add', response);

    if (response.ok && response.data?.customer_id) {
        const customerId = response.data.customer_id;
        const encryptedId = response.data.encrypted_customer_id;
        const isExist = response.data.is_exist;

        console.log(`\n  >>> customer_id: ${customerId}`);
        console.log(`  >>> encrypted_customer_id: ${encryptedId}`);
        console.log(`  >>> is_exist: ${isExist} (${isExist ? 'updated existing' : 'created new'})`);

        return { customerId, encryptedId };
    }

    return null;
}

/**
 * Test phone lookup
 */
async function testPhoneLookup() {
    console.log('\n' + '='.repeat(60));
    console.log('PHONE LOOKUP TEST');
    console.log('='.repeat(60));

    const response = await client.lookupCustomerByPhone(TEST_CUSTOMER.phone);
    logResult('GET /customer/lookup/{token}/{phone}', response);

    if (response.data?.is_customer_exist) {
        console.log(`\n  >>> Found customer_id: ${response.data.customer_id}`);
        console.log(`  >>> Email: ${response.data.email}`);
        console.log(`  >>> Phone: ${response.data.phone}`);
        return response.data.customer_id;
    } else {
        console.log('\n  >>> Customer not found (create one first with phone_json)');
        return null;
    }
}

/**
 * Test list endpoint
 */
async function testListCustomer(customerId) {
    console.log('\n' + '='.repeat(60));
    console.log('LIST CUSTOMER TEST');
    console.log('='.repeat(60));

    if (!customerId) {
        console.log('  Skipping - no customer_id provided');
        return;
    }

    const response = await client.listCustomers({ customer_id: customerId });
    logResult('POST /customer/list', response);

    if (response.data?.data?.[0]) {
        const customer = response.data.data[0];
        console.log(`\n  >>> email: ${customer.email}`);
        console.log(`  >>> phone: ${customer.phone}`);
        console.log(`  >>> primary_email: ${customer.primary_email}`);
        console.log(`  >>> primary_phone: ${customer.primary_phone}`);
    }
}

/**
 * Test upsert behavior - should update existing customer, not create duplicate
 */
async function testUpsertBehavior() {
    console.log('\n' + '='.repeat(60));
    console.log('UPSERT BEHAVIOR TEST');
    console.log('='.repeat(60));

    console.log('  Creating customer with phone_json...');
    const firstResponse = await client.createCustomer(TEST_CUSTOMER);
    logResult('POST /customer/add (first)', firstResponse,
        `customer_id: ${firstResponse.data?.customer_id}, is_exist: ${firstResponse.data?.is_exist}`);

    const firstId = firstResponse.data?.customer_id;

    // Create again with same phone but different name
    console.log('\n  Creating again with same phone, different firstname...');
    const modifiedCustomer = {
        ...TEST_CUSTOMER,
        firstname: 'DiscoveryUpdated'
    };

    const secondResponse = await client.createCustomer(modifiedCustomer);
    logResult('POST /customer/add (second, same phone)', secondResponse,
        `customer_id: ${secondResponse.data?.customer_id}, is_exist: ${secondResponse.data?.is_exist}`);

    const secondId = secondResponse.data?.customer_id;

    // Check results
    console.log('\n  >>> Results:');
    console.log(`      First customer_id:  ${firstId}`);
    console.log(`      Second customer_id: ${secondId}`);

    if (firstId === secondId) {
        console.log('      ✓ UPSERT WORKS - Same customer_id returned');
        console.log(`      ✓ is_exist: ${secondResponse.data?.is_exist}`);
        console.log(`      ✓ message: ${secondResponse.data?.message}`);
    } else {
        console.log('      ✗ DUPLICATE CREATED - Different customer_ids');
    }

    return { firstId, secondId, encryptedId: secondResponse.data?.encrypted_customer_id };
}

/**
 * Test transaction create
 */
async function testTransactionCreate(encryptedCustomerId) {
    console.log('\n' + '='.repeat(60));
    console.log('TRANSACTION CREATE TEST');
    console.log('='.repeat(60));

    if (!encryptedCustomerId) {
        console.log('  Skipping - no encrypted_customer_id provided');
        console.log('  Usage: npm run discover:transaction <encrypted_customer_id>');
        return;
    }

    console.log(`  Using customer_token (encrypted_customer_id): ${encryptedCustomerId.substring(0, 20)}...`);

    const transaction = {
        items: [
            { qty: 1, price: '9.99', product_id: 1 }
        ],
        types: 1,  // Invoice
        customer_token: encryptedCustomerId,
        quote_subject: 'Test transaction from discovery script'
    };

    const response = await client.createTransaction(transaction);
    logResult('POST /customer/transaction/create', response);

    if (response.data?.success) {
        console.log(`\n  >>> quote_id: ${response.data.quote_id}`);
        console.log(`  >>> quote_detail_id: ${response.data.quote_detail_id}`);
    }
}

/**
 * Main execution
 */
async function main() {
    const command = process.argv[2] || 'all';
    const arg = process.argv[3];

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           SEGWIK API DISCOVERY                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Token: ${API_TOKEN.substring(0, 4)}...${API_TOKEN.substring(API_TOKEN.length - 4)}`);
    console.log(`Command: ${command}`);
    console.log(`Test Email: ${TEST_CUSTOMER.email}`);
    console.log(`Test Phone: ${TEST_CUSTOMER.phone}`);
    console.log('');
    console.log('Note: Using email_json/phone_json fields (per Shriniwas 2026-01-14)');

    let customerInfo = null;

    switch (command) {
        case 'verify':
            await verifyToken();
            break;

        case 'create':
            if (await verifyToken()) {
                customerInfo = await createTestCustomer();
            }
            break;

        case 'lookup':
            if (await verifyToken()) {
                const customerId = await testPhoneLookup();
                if (customerId) {
                    await testListCustomer(customerId);
                }
            }
            break;

        case 'upsert':
            if (await verifyToken()) {
                customerInfo = await testUpsertBehavior();
            }
            break;

        case 'transaction':
            if (await verifyToken()) {
                if (!arg) {
                    // Create a customer first to get encrypted_customer_id
                    customerInfo = await createTestCustomer();
                    if (customerInfo?.encryptedId) {
                        await testTransactionCreate(customerInfo.encryptedId);
                    }
                } else {
                    await testTransactionCreate(arg);
                }
            }
            break;

        case 'all':
            if (await verifyToken()) {
                customerInfo = await createTestCustomer();
                await testPhoneLookup();
                if (customerInfo?.customerId) {
                    await testListCustomer(customerInfo.customerId);
                }
                await testUpsertBehavior();
                if (customerInfo?.encryptedId) {
                    await testTransactionCreate(customerInfo.encryptedId);
                }
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
