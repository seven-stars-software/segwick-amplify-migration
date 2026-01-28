#!/usr/bin/env node
/**
 * Export WooCommerce Customers
 *
 * Fetches customers from WooCommerce REST API and saves to JSON.
 * This gives us: id, email, first_name, last_name, billing info, etc.
 *
 * Usage:
 *   node --env-file=.env scripts/export/export-customers.js          # Export all
 *   node --env-file=.env scripts/export/export-customers.js --limit 5  # Export first 5
 */

const fs = require('fs');
const path = require('path');
const wc = require('./wc-client');

const OUTPUT_DIR = path.join(__dirname, '../../data/exports');

// Parse --limit argument
const limitArg = process.argv.find(arg => arg.startsWith('--limit'));
const LIMIT = limitArg ? parseInt(process.argv[process.argv.indexOf(limitArg) + 1]) : null;

async function exportCustomers(limit = LIMIT) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         WOOCOMMERCE CUSTOMER EXPORT                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`WP URL: ${process.env.WP_URL}`);
    if (limit) console.log(`Limit: ${limit} customers`);
    console.log('');

    try {
        console.log(limit ? `Fetching up to ${limit} customers...` : 'Fetching all customers...');
        let customers;
        if (limit) {
            // Use direct API call with per_page limit
            const response = await wc.api.get('customers', { per_page: limit, role: 'all' });
            customers = response.data;
        } else {
            customers = await wc.getAllCustomers();
        }
        console.log(`\nTotal customers fetched: ${customers.length}`);

        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Save full export
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = path.join(OUTPUT_DIR, `wc-customers-${timestamp}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(customers, null, 2));
        console.log(`\nFull export saved to: ${outputFile}`);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));

        // Count by role
        const withBillingPhone = customers.filter(c => c.billing?.phone).length;
        const withBillingEmail = customers.filter(c => c.billing?.email).length;
        const withOrders = customers.filter(c => c.orders_count > 0).length;

        console.log(`Total customers:     ${customers.length}`);
        console.log(`With billing phone:  ${withBillingPhone}`);
        console.log(`With billing email:  ${withBillingEmail}`);
        console.log(`With orders:         ${withOrders}`);

        // Sample output
        if (customers.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('SAMPLE CUSTOMER (first record)');
            console.log('='.repeat(60));
            const sample = customers[0];
            console.log(JSON.stringify({
                id: sample.id,
                email: sample.email,
                first_name: sample.first_name,
                last_name: sample.last_name,
                role: sample.role,
                billing: sample.billing,
                orders_count: sample.orders_count,
                total_spent: sample.total_spent
            }, null, 2));
        }

        return customers;
    } catch (error) {
        console.error('Export failed:', error.message);
        if (error.response) {
            console.error('API response:', error.response.data);
        }
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    exportCustomers();
}

module.exports = { exportCustomers };
