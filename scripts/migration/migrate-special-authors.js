#!/usr/bin/env node
/**
 * Special Author Migration
 *
 * Migrates the 11 specific authors from special-author-migration.md
 * Creates Segwik customers and pen names for each.
 *
 * Usage:
 *   node --env-file=.env scripts/migration/migrate-special-authors.js
 *   node --env-file=.env scripts/migration/migrate-special-authors.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const SegwikClient = require('../discovery/segwik-client');
const { PERSONA } = require('../discovery/segwik-client');

const dryRun = process.argv.includes('--dry-run');

const RESULTS_DIR = path.join(__dirname, '../../data/migration-results');

/**
 * The 11 special authors to migrate.
 * Data source: docs/special-author-migration.md
 *
 * For authors with WC vendor accounts, the customer email comes from WC.
 * For metadata-only authors, the email is from the resolved WP user.
 */
const AUTHORS = [
    // === Authors with WC Vendor Accounts (9) ===
    {
        name: 'Sheldon Collins',
        email: 'storybycollins@gmail.com',
        wcId: 3259,
        penName: { first: 'Sheldon', last: 'Collins' }
    },
    {
        name: 'Dee Knight',
        email: 'deeknight816@gmail.com',
        wcId: 3137,
        penName: { first: 'Dee', last: 'Knight' }
    },
    {
        name: 'Jessica Beebe',
        email: 'jess.beebe@yahoo.com',
        wcId: 3333,
        penName: { first: 'Jessica', last: 'Beebe' }
    },
    {
        name: 'Jacqui Burnett',
        email: 'jacqui@jacquiburnett.com',
        wcId: 1927,
        penName: { first: 'Jacqui', last: 'Burnett' }
    },
    {
        name: 'Donna Griffit',
        email: 'donna@donnagriffit.com',
        wcId: 1273,
        penName: { first: 'Donna', last: 'Griffit' }
    },
    {
        name: "Parkinson's Foundation",
        email: 'publications@parkinson.org',
        wcId: 1385,
        penName: { first: "Parkinson's", last: 'Foundation' }
    },
    {
        name: 'Cheryl Melody Baskin',
        email: 'chermelody@aol.com',
        wcId: 1971,
        penName: { first: 'Cheryl Melody', last: 'Baskin' }
    },
    {
        name: 'Kelly Anne Manuel',
        email: 'kellyannetheresa@icloud.com',
        wcId: 1373,
        penName: { first: 'Kelly Anne', last: 'Manuel' }
    },
    {
        name: 'Joseph Durette',
        email: 'wenjoe@cox.net',
        wcId: 1271,
        penName: { first: 'Joseph', last: 'Durette' }
    },

    // === Authors in Product Metadata Only (2) ===
    // These use resolved WP user emails
    {
        name: 'Once Upon a Dance',
        realPerson: 'Terrel Lefferts',
        email: 'terreld@msn.com',
        wpId: 1274,
        penName: { first: 'Once Upon', last: 'a Dance' }
    },
    {
        name: 'Dan Flanigan',
        realPerson: 'Meghan Flanigan',
        email: 'mgflanigan@icloud.com',
        wpId: 2928,
        penName: { first: 'Dan', last: 'Flanigan' }
    }
];

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         SPECIAL AUTHOR MIGRATION                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    console.log(`Authors to migrate: ${AUTHORS.length}`);
    console.log('');

    if (dryRun) {
        console.log('DRY RUN - would migrate:\n');
        for (const author of AUTHORS) {
            const penNameStr = `${author.penName.first} ${author.penName.last}`;
            console.log(`  ${author.name}`);
            console.log(`    Email: ${author.email}`);
            console.log(`    Pen Name: ${penNameStr}`);
            if (author.realPerson) {
                console.log(`    Real Person: ${author.realPerson}`);
            }
            console.log('');
        }
        console.log('No changes made. Remove --dry-run to migrate.');
        return;
    }

    // Initialize Segwik client with staff credentials for pen name creation
    const client = new SegwikClient(
        process.env.SEGWIK_API_TOKEN,
        {
            email: process.env.BECKY_USERNAME,
            password: process.env.BECKY_PASSWORD
        }
    );

    const results = {
        timestamp: new Date().toISOString(),
        success: [],
        failed: []
    };

    console.log('='.repeat(60));
    console.log('MIGRATING AUTHORS');
    console.log('='.repeat(60));

    for (const author of AUTHORS) {
        const penNameStr = `${author.penName.first} ${author.penName.last}`;
        console.log(`\n${author.name}`);
        console.log('-'.repeat(40));

        try {
            // Step 1: Create/update customer
            const customerName = author.realPerson || author.name;
            const nameParts = customerName.split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || nameParts[0];

            process.stdout.write(`  Creating customer (${author.email})... `);

            const customerPayload = {
                firstname: firstName,
                lastname: lastName,
                email: author.email,
                custbase_id: PERSONA.AUTHOR,
                cust_type: 84,
                creation_method: 'synced_via_wordpress',
                lead_from: 'segwik2 contact detail', // Workaround to allow cust_type edit
                source: 'WC Migration - Special Authors'
            };

            const customerResponse = await client.addCustomer(customerPayload);

            if (!customerResponse.ok || !customerResponse.data?.customer_id) {
                throw new Error(`Customer creation failed: ${customerResponse.data?.message || 'Unknown error'}`);
            }

            const customerId = customerResponse.data.customer_id;
            const isNewCustomer = !customerResponse.data.is_exist;
            console.log(`${isNewCustomer ? 'CREATED' : 'UPDATED'} → Segwik#${customerId}`);

            // Step 2: Create pen name
            process.stdout.write(`  Creating pen name (${penNameStr})... `);

            const penNameResponse = await client.createPenName({
                customerId: customerId,
                firstName: author.penName.first,
                lastName: author.penName.last
            });

            if (!penNameResponse.ok || !penNameResponse.data?.page_id) {
                throw new Error(`Pen name creation failed: ${penNameResponse.data?.message || JSON.stringify(penNameResponse.data)}`);
            }

            const penNameId = penNameResponse.data.page_id;
            console.log(`CREATED → page_id: ${penNameId}`);

            results.success.push({
                name: author.name,
                email: author.email,
                wcId: author.wcId || null,
                wpId: author.wpId || null,
                segwikCustomerId: customerId,
                isNewCustomer,
                penName: penNameStr,
                penNamePageId: penNameId
            });

        } catch (error) {
            console.log(`FAILED: ${error.message}`);
            results.failed.push({
                name: author.name,
                email: author.email,
                error: error.message
            });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total authors:    ${AUTHORS.length}`);
    console.log(`Succeeded:        ${results.success.length}`);
    console.log(`  - New customers:  ${results.success.filter(r => r.isNewCustomer).length}`);
    console.log(`  - Existing:       ${results.success.filter(r => !r.isNewCustomer).length}`);
    console.log(`Failed:           ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log('\nFailed:');
        results.failed.forEach(f => console.log(`  ${f.name}: ${f.error}`));
    }

    // Save results
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(RESULTS_DIR, `special-authors-${timestamp}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${resultsFile}`);

    // Print mapping table for updating docs
    if (results.success.length > 0) {
        console.log('\n' + '='.repeat(60));
        console.log('SEGWIK ID MAPPING (for docs update)');
        console.log('='.repeat(60));
        console.log('\n| Author | Segwik Customer ID | Pen Name Page ID |');
        console.log('|--------|-------------------|------------------|');
        for (const r of results.success) {
            console.log(`| ${r.name} | ${r.segwikCustomerId} | ${r.penNamePageId} |`);
        }
    }

    return results;
}

main().catch(err => {
    console.error('Migration failed:', err.message);
    process.exit(1);
});
