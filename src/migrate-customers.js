#!/usr/bin/env node
/**
 * Customer Migration Orchestrator
 *
 * End-to-end pipeline: WooCommerce → Transform → Segwik
 * Passes data in memory without intermediate files.
 *
 * Usage:
 *   node --env-file=.env scripts/migrate-customers.js                    # Migrate all
 *   node --env-file=.env scripts/migrate-customers.js --limit 5          # Limit records
 *   node --env-file=.env scripts/migrate-customers.js --dry-run          # Preview only
 */

const fs = require('fs');
const path = require('path');
const { exportCustomers } = require('./wp-wc-export/export-customers');
const { transformCustomer } = require('./wc-wp-to-segwik/wc-to-segwik');
const { importCustomers } = require('./segwik-import/import-customers');

// Parse arguments
const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;
const dryRun = args.includes('--dry-run');

const RESULTS_DIR = path.join(__dirname, '../data/migration-results');

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         CUSTOMER MIGRATION: WooCommerce → Segwik           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    if (limit) console.log(`Limit: ${limit} records`);
    console.log('');

    // Step 1: Export from WooCommerce
    console.log('='.repeat(60));
    console.log('STEP 1: Export from WooCommerce');
    console.log('='.repeat(60));
    const wcCustomers = await exportCustomers(limit);
    console.log(`\nExported ${wcCustomers.length} customers from WooCommerce\n`);

    // Step 2: Transform to Segwik format
    console.log('='.repeat(60));
    console.log('STEP 2: Transform to Segwik format');
    console.log('='.repeat(60));
    const transformed = [];
    const skipped = [];

    for (const wc of wcCustomers) {
        const result = transformCustomer(wc);
        if (result.error) {
            skipped.push({ wcId: wc.id, reason: result.error });
        } else {
            transformed.push({
                _wcId: result.wcId,
                _wcEmail: result.wcEmail,
                ...result.segwik
            });
        }
    }

    console.log(`Transformed: ${transformed.length}`);
    console.log(`Skipped: ${skipped.length}`);
    if (skipped.length > 0) {
        skipped.forEach(s => console.log(`  WC#${s.wcId}: ${s.reason}`));
    }
    console.log('');

    // Step 3: Import to Segwik
    console.log('='.repeat(60));
    console.log('STEP 3: Import to Segwik');
    console.log('='.repeat(60));
    const importResults = await importCustomers(transformed, { dryRun, verbose: true });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`WC Exported:      ${wcCustomers.length}`);
    console.log(`Transformed:      ${transformed.length}`);
    console.log(`Skipped:          ${skipped.length}`);
    if (!dryRun) {
        console.log(`Imported:         ${importResults.success.length}`);
        console.log(`  - Created:      ${importResults.success.filter(r => r.isNew).length}`);
        console.log(`  - Updated:      ${importResults.success.filter(r => !r.isNew).length}`);
        console.log(`Failed:           ${importResults.failed.length}`);
    }

    // Save results
    if (!dryRun && (importResults.success.length > 0 || importResults.failed.length > 0)) {
        if (!fs.existsSync(RESULTS_DIR)) {
            fs.mkdirSync(RESULTS_DIR, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultsFile = path.join(RESULTS_DIR, `migration-${timestamp}.json`);
        fs.writeFileSync(resultsFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            exported: wcCustomers.length,
            transformed: transformed.length,
            skipped,
            imported: importResults.success,
            failed: importResults.failed
        }, null, 2));
        console.log(`\nResults saved to: ${resultsFile}`);
    }

    return {
        exported: wcCustomers.length,
        transformed: transformed.length,
        skipped,
        imported: importResults.success,
        failed: importResults.failed
    };
}

main().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
