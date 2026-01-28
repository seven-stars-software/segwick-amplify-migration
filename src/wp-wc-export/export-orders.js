#!/usr/bin/env node
/**
 * Export WooCommerce Orders
 *
 * Fetches all orders from WooCommerce REST API and saves to JSON.
 * This gives us: id, customer_id, status, line_items (product purchases), etc.
 *
 * Orders represent audiobook ownership - completed orders = listener owns those books.
 *
 * Usage: node --env-file=.env scripts/export/export-orders.js
 */

const fs = require('fs');
const path = require('path');
const wc = require('./wc-client');

const OUTPUT_DIR = path.join(__dirname, '../../data/exports');

async function exportOrders() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         WOOCOMMERCE ORDER EXPORT                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`WP URL: ${process.env.WP_URL}`);
    console.log('');

    try {
        console.log('Fetching all orders...');
        const orders = await wc.getAllOrders('any');
        console.log(`\nTotal orders fetched: ${orders.length}`);

        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Save full export
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = path.join(OUTPUT_DIR, `wc-orders-${timestamp}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(orders, null, 2));
        console.log(`\nFull export saved to: ${outputFile}`);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));

        // Count by status
        const statusCounts = {};
        orders.forEach(o => {
            statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        });

        const completed = orders.filter(o => o.status === 'completed').length;
        const uniqueCustomers = new Set(orders.map(o => o.customer_id)).size;
        const totalLineItems = orders.reduce((sum, o) => sum + (o.line_items?.length || 0), 0);

        console.log(`Total orders:        ${orders.length}`);
        console.log(`Completed orders:    ${completed}`);
        console.log(`Unique customers:    ${uniqueCustomers}`);
        console.log(`Total line items:    ${totalLineItems}`);
        console.log('\nOrders by status:');
        Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });

        // Sample output
        if (orders.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('SAMPLE ORDER (first completed order)');
            console.log('='.repeat(60));
            const sample = orders.find(o => o.status === 'completed') || orders[0];
            console.log(JSON.stringify({
                id: sample.id,
                status: sample.status,
                customer_id: sample.customer_id,
                date_created: sample.date_created,
                total: sample.total,
                billing: {
                    email: sample.billing?.email,
                    first_name: sample.billing?.first_name,
                    last_name: sample.billing?.last_name
                },
                line_items: sample.line_items?.map(li => ({
                    product_id: li.product_id,
                    name: li.name,
                    quantity: li.quantity,
                    total: li.total
                }))
            }, null, 2));
        }

        return orders;
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
    exportOrders();
}

module.exports = { exportOrders };
