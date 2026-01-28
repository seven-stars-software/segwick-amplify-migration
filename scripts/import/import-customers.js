#!/usr/bin/env node
/**
 * Import Customers to Segwik
 *
 * Reads transformed customer JSON (from wc-to-segwik.js) and imports to Segwik.
 * Uses the /customer/add endpoint which performs upsert based on email_json.
 *
 * Usage:
 *   node --env-file=.env scripts/import/import-customers.js <input.json>
 *   node --env-file=.env scripts/import/import-customers.js <input.json> --limit 5
 *   node --env-file=.env scripts/import/import-customers.js <input.json> --dry-run
 */

const fs = require('fs');
const path = require('path');
const SegwikClient = require('../discovery/segwik-client');

// Parse arguments
const args = process.argv.slice(2);
const inputFile = args.find(a => !a.startsWith('-'));
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;
const dryRun = args.includes('--dry-run');

if (!inputFile) {
    console.error('Usage: node --env-file=.env scripts/import/import-customers.js <input.json> [--limit N] [--dry-run]');
    process.exit(1);
}

const RESULTS_DIR = path.join(__dirname, '../../data/import-results');

/**
 * Main execution
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         SEGWIK CUSTOMER IMPORT                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Input: ${inputFile}`);
    console.log(`Mode: ${dryRun ? 'DRY RUN (no import)' : 'LIVE IMPORT'}`);
    if (limit) console.log(`Limit: ${limit} records`);
    console.log('');

    // Read input file
    const inputPath = path.resolve(inputFile);
    if (!fs.existsSync(inputPath)) {
        console.error(`File not found: ${inputPath}`);
        process.exit(1);
    }

    const customers = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`Loaded ${customers.length} transformed customers`);

    // Apply limit
    const toImport = limit ? customers.slice(0, limit) : customers;
    console.log(`Importing ${toImport.length} customers\n`);

    if (dryRun) {
        console.log('DRY RUN - showing what would be imported:\n');
        for (const customer of toImport) {
            console.log(`  WC#${customer._wcId} (${customer._wcEmail})`);
            console.log(`    → ${customer.firstname} ${customer.lastname}`);
            console.log(`    → persona: ${customer.custbase_id}`);
        }
        console.log('\nNo changes made. Remove --dry-run to import.');
        return;
    }

    // Initialize Segwik client
    const client = new SegwikClient(process.env.SEGWIK_API_TOKEN);

    // Track results
    const results = {
        success: [],
        failed: []
    };

    // Import each customer
    console.log('='.repeat(60));
    console.log('IMPORTING');
    console.log('='.repeat(60));

    for (const customer of toImport) {
        const wcId = customer._wcId;
        const wcEmail = customer._wcEmail;

        // Remove internal tracking fields before sending to API
        const payload = { ...customer };
        delete payload._wcId;
        delete payload._wcEmail;

        try {
            process.stdout.write(`  WC#${wcId} (${wcEmail})... `);
            const response = await client.addCustomer(payload);

            if (response.ok && response.data?.customer_id) {
                const isNew = !response.data.is_exist;
                console.log(`${isNew ? 'CREATED' : 'UPDATED'} → Segwik#${response.data.customer_id}`);
                results.success.push({
                    wcId,
                    wcEmail,
                    segwikId: response.data.customer_id,
                    isNew
                });
            } else {
                console.log('FAILED:', response.data?.message || 'Unknown error');
                results.failed.push({
                    wcId,
                    wcEmail,
                    error: response.data?.message || 'Unknown error'
                });
            }
        } catch (error) {
            console.log('ERROR:', error.message);
            results.failed.push({
                wcId,
                wcEmail,
                error: error.message
            });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total attempted:  ${toImport.length}`);
    console.log(`Succeeded:        ${results.success.length}`);
    console.log(`  - Created:      ${results.success.filter(r => r.isNew).length}`);
    console.log(`  - Updated:      ${results.success.filter(r => !r.isNew).length}`);
    console.log(`Failed:           ${results.failed.length}`);

    // Show failed details
    if (results.failed.length > 0) {
        console.log('\nFailed records:');
        results.failed.forEach(f => console.log(`  WC#${f.wcId}: ${f.error}`));
    }

    // Save results
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(RESULTS_DIR, `import-results-${timestamp}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${resultsFile}`);

    return results;
}

/**
 * Import customers from in-memory array (for orchestrator use)
 * @param {Array} customers - Array of transformed Segwik customer objects
 * @param {Object} options - { limit, dryRun, verbose }
 * @returns {Object} - { success: [], failed: [] }
 */
async function importCustomers(customers, options = {}) {
    const { limit, dryRun = false, verbose = true } = options;
    const toImport = limit ? customers.slice(0, limit) : customers;

    if (dryRun) {
        if (verbose) {
            console.log('DRY RUN - would import:');
            for (const c of toImport) {
                console.log(`  ${c._wcEmail || c.email_json?.[0]?.email}`);
            }
        }
        return { success: [], failed: [], dryRun: true };
    }

    const client = new SegwikClient(process.env.SEGWIK_API_TOKEN);
    const results = { success: [], failed: [] };

    for (const customer of toImport) {
        const wcId = customer._wcId;
        const wcEmail = customer._wcEmail;

        const payload = { ...customer };
        delete payload._wcId;
        delete payload._wcEmail;

        try {
            if (verbose) process.stdout.write(`  WC#${wcId} (${wcEmail})... `);
            const response = await client.addCustomer(payload);

            if (response.ok && response.data?.customer_id) {
                const isNew = !response.data.is_exist;
                if (verbose) console.log(`${isNew ? 'CREATED' : 'UPDATED'} → Segwik#${response.data.customer_id}`);
                results.success.push({ wcId, wcEmail, segwikId: response.data.customer_id, isNew });
            } else {
                if (verbose) console.log('FAILED:', response.data?.message || 'Unknown error');
                results.failed.push({ wcId, wcEmail, error: response.data?.message || 'Unknown error' });
            }
        } catch (error) {
            if (verbose) console.log('ERROR:', error.message);
            results.failed.push({ wcId, wcEmail, error: error.message });
        }
    }

    return results;
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { importCustomers };
