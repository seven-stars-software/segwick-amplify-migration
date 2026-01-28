#!/usr/bin/env node
/**
 * Export WooCommerce Products (Audiobooks)
 *
 * Fetches all products from WooCommerce REST API and saves to JSON.
 * This gives us: id, name, price, meta_data (author, isbn, duration, etc.)
 *
 * Usage: node --env-file=.env scripts/export/export-products.js
 */

const fs = require('fs');
const path = require('path');
const wc = require('./wc-client');

const OUTPUT_DIR = path.join(__dirname, '../../data/exports');
const AUDIOBOOK_CATEGORY_ID = 473; // From amplify-backend

async function exportProducts() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         WOOCOMMERCE PRODUCT EXPORT                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`WP URL: ${process.env.WP_URL}`);
    console.log('');

    try {
        console.log('Fetching all products...');
        const products = await wc.getAllProducts('any');
        console.log(`\nTotal products fetched: ${products.length}`);

        // Create output directory if it doesn't exist
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Save full export
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputFile = path.join(OUTPUT_DIR, `wc-products-${timestamp}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(products, null, 2));
        console.log(`\nFull export saved to: ${outputFile}`);

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));

        const published = products.filter(p => p.status === 'publish').length;
        const drafts = products.filter(p => p.status === 'draft').length;
        const audiobooks = products.filter(p =>
            p.categories?.some(c => c.id === AUDIOBOOK_CATEGORY_ID)
        ).length;
        const withISBN = products.filter(p =>
            p.meta_data?.find(m => m.key === 'asin_isbn')?.value
        ).length;

        console.log(`Total products:      ${products.length}`);
        console.log(`Published:           ${published}`);
        console.log(`Drafts:              ${drafts}`);
        console.log(`Audiobooks:          ${audiobooks}`);
        console.log(`With ISBN:           ${withISBN}`);

        // Sample output
        if (products.length > 0) {
            console.log('\n' + '='.repeat(60));
            console.log('SAMPLE PRODUCT (first record)');
            console.log('='.repeat(60));
            const sample = products[0];

            // Extract relevant meta
            const getMeta = (key) => sample.meta_data?.find(m => m.key === key)?.value || null;

            console.log(JSON.stringify({
                id: sample.id,
                name: sample.name,
                status: sample.status,
                price: sample.price,
                regular_price: sample.regular_price,
                sale_price: sample.sale_price,
                on_sale: sample.on_sale,
                featured: sample.featured,
                categories: sample.categories?.map(c => c.name),
                images: sample.images?.length || 0,
                meta: {
                    author_first_name: getMeta('author_first_name'),
                    author_last_name: getMeta('author_last_name'),
                    asin_isbn: getMeta('asin_isbn'),
                    length_duration: getMeta('length_duration'),
                    release_date: getMeta('release_date')
                }
            }, null, 2));
        }

        return products;
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
    exportProducts();
}

module.exports = { exportProducts };
