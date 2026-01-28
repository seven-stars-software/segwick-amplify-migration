#!/usr/bin/env node
/**
 * Transform WooCommerce Customers to Segwik Format
 *
 * Converts WC customer data to Segwik customer format and outputs a JSON file
 * that can be imported using scripts/import/import-customers.js
 *
 * Usage:
 *   node scripts/transform/wc-to-segwik.js <input.json>                    # Transform all
 *   node scripts/transform/wc-to-segwik.js <input.json> --limit 5          # Limit records
 *   node scripts/transform/wc-to-segwik.js <input.json> -o output.json     # Specify output file
 */

const fs = require('fs');
const path = require('path');
const { PERSONA } = require('../discovery/segwik-client');

// Parse arguments
const args = process.argv.slice(2);
const inputFile = args.find(a => !a.startsWith('-'));
const limitIdx = args.indexOf('--limit');
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : null;
const outputIdx = args.indexOf('-o');
const outputArg = outputIdx !== -1 ? args[outputIdx + 1] : null;

if (!inputFile) {
    console.error('Usage: node wc-to-segwik.js <input.json> [--limit N] [-o output.json]');
    process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, '../../data/transformed');

/**
 * Map WP/WC role to Segwik persona (custbase_id)
 * See docs/data-mapping.md for details on how roles were discovered.
 */
function getPersonaFromRole(role) {
    switch (role) {
        case 'wc_product_vendors_admin_vendor':
            return PERSONA.AUTHOR;        // 1120
        case 'wc_product_vendors_manager_vendor':
            return PERSONA.PUBLISHER;     // 1121
        case 'subscriber':
        case 'customer':
        default:
            return PERSONA.LISTENER;      // 1122
    }
}

/**
 * Transform a WooCommerce customer to Segwik format
 */
function transformCustomer(wcCustomer) {
    // Determine email - prefer billing email, fall back to account email
    const email = wcCustomer.billing?.email || wcCustomer.email;
    if (!email) {
        return { error: 'No email found', wcCustomer };
    }

    // Determine phone - from billing
    const phone = wcCustomer.billing?.phone || null;

    // Determine name - prefer billing, fall back to account
    const firstName = wcCustomer.billing?.first_name || wcCustomer.first_name || '';
    const lastName = wcCustomer.billing?.last_name || wcCustomer.last_name || '';

    // Determine persona from WP role
    const persona = getPersonaFromRole(wcCustomer.role);

    // Build Segwik customer object
    const segwikCustomer = {
        // Required fields
        email: email,
        email_json: [{
            email: email,
            is_primary: true,
            type: 'business'
        }],

        // Name
        firstname: firstName,
        lastname: lastName,

        // Persona based on WP role
        custbase_id: persona,

        // Required by Segwik (per Pete)
        cust_type: 84,
        creation_method: 'synced_via_wordpress',

        // Source tracking
        lead_from: 'zapier',

        // Store WP user ID for reference
        wordpress_user_id: wcCustomer.id
    };

    // Add phone if available
    if (phone) {
        segwikCustomer.phone_json = [{
            phone: phone,
            is_primary: true,
            type: 'Mobile'
        }];
    }

    // Add address if available
    if (wcCustomer.billing?.address_1) {
        segwikCustomer.address_json = [{
            address1: wcCustomer.billing.address_1,
            address2: wcCustomer.billing.address_2 || '',
            city: wcCustomer.billing.city || '',
            state: wcCustomer.billing.state || '',
            zip: wcCustomer.billing.postcode || '',
            country: wcCustomer.billing.country || '',
            is_primary: true,
            type: 'business'
        }];
    }

    return {
        wcId: wcCustomer.id,
        wcEmail: wcCustomer.email,
        segwik: segwikCustomer
    };
}

/**
 * Main execution
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         WC → SEGWIK TRANSFORM                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Input: ${inputFile}`);
    if (limit) console.log(`Limit: ${limit} records`);
    console.log('');

    // Read input file
    const inputPath = path.resolve(inputFile);
    if (!fs.existsSync(inputPath)) {
        console.error(`File not found: ${inputPath}`);
        process.exit(1);
    }

    const wcCustomers = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`Loaded ${wcCustomers.length} WC customers`);

    // Apply limit
    const toProcess = limit ? wcCustomers.slice(0, limit) : wcCustomers;
    console.log(`Processing ${toProcess.length} customers\n`);

    // Transform all customers
    const results = {
        success: [],
        skipped: [],
        failed: []
    };

    const transformed = [];
    for (const wc of toProcess) {
        const result = transformCustomer(wc);
        if (result.error) {
            results.skipped.push({ wcId: wc.id, reason: result.error });
        } else {
            transformed.push(result);
        }
    }

    console.log(`Transformed: ${transformed.length}`);
    console.log(`Skipped: ${results.skipped.length}`);

    // Show sample transformation
    if (transformed.length > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('SAMPLE TRANSFORMATION');
        console.log('='.repeat(60));
        console.log('WC ID:', transformed[0].wcId);
        console.log('WC Email:', transformed[0].wcEmail);
        console.log('Segwik payload:');
        console.log(JSON.stringify(transformed[0].segwik, null, 2));
    }

    // Create output directory if needed
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Determine output filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultOutput = path.join(OUTPUT_DIR, `segwik-customers-${timestamp}.json`);
    const outputPath = outputArg ? path.resolve(outputArg) : defaultOutput;

    // Build output data - array of Segwik customer objects with WC reference
    const outputData = transformed.map(t => ({
        _wcId: t.wcId,
        _wcEmail: t.wcEmail,
        ...t.segwik
    }));

    // Write output file
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\nOutput written to: ${outputPath}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total processed:  ${toProcess.length}`);
    console.log(`Transformed:      ${transformed.length}`);
    console.log(`Skipped:          ${results.skipped.length}`);

    // Show skipped details
    if (results.skipped.length > 0) {
        console.log('\nSkipped records:');
        results.skipped.forEach(s => console.log(`  WC#${s.wcId}: ${s.reason}`));
    }

    console.log('\nNext step: Import to Segwik with:');
    console.log(`  node --env-file=.env scripts/import/import-customers.js ${outputPath}`);

    return { transformed: outputData, skipped: results.skipped, outputPath };
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { transformCustomer };
