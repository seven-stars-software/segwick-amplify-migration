#!/usr/bin/env node
/**
 * Update Special Authors - Fix cust_type and creation_method
 *
 * Updates the 11 previously created customers with:
 * - cust_type: 84
 * - creation_method: 'synced_via_wordpress'
 *
 * Usage:
 *   node --env-file=.env scripts/migration/update-special-authors.js
 */

const SegwikClient = require('../discovery/segwik-client');

// Customer IDs from previous migration
const CUSTOMERS = [
    { name: 'Sheldon Collins', customerId: 2968738 },
    { name: 'Dee Knight', customerId: 2968739 },
    { name: 'Jessica Beebe', customerId: 2968740 },
    { name: 'Jacqui Burnett', customerId: 2968741 },
    { name: 'Donna Griffit', customerId: 2968742 },
    { name: "Parkinson's Foundation", customerId: 2968743 },
    { name: 'Cheryl Melody Baskin', customerId: 2968744 },
    { name: 'Kelly Anne Manuel', customerId: 2968745 },
    { name: 'Joseph Durette', customerId: 2968746 },
    { name: 'Terrel Lefferts (Once Upon a Dance)', customerId: 2968747 },
    { name: 'Meghan Flanigan (Dan Flanigan)', customerId: 2968748 }
];

async function main() {
    console.log('Updating special authors with cust_type and creation_method...\n');

    const client = new SegwikClient(process.env.SEGWIK_API_TOKEN);

    let success = 0;
    let failed = 0;

    for (const customer of CUSTOMERS) {
        process.stdout.write(`  ${customer.name} (${customer.customerId})... `);

        try {
            const response = await client.updateCustomerById(customer.customerId, {
                cust_type: 84,
                creation_method: 'synced_via_wordpress',
                lead_from: 'segwik2 contact detail'
            });

            if (response.ok && response.data?.customer_id) {
                console.log('UPDATED');
                success++;
            } else {
                console.log(`FAILED: ${response.data?.message || 'Unknown error'}`);
                failed++;
            }
        } catch (error) {
            console.log(`ERROR: ${error.message}`);
            failed++;
        }
    }

    console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
