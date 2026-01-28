/**
 * Orphan Authors Report
 *
 * Finds author names in product ACF metadata that don't have
 * matching WordPress user accounts.
 *
 * These authors will need Segwik customers created with resolved
 * email addresses (like we did for Dan Flanigan -> Meghan Flanigan).
 *
 * Features:
 * - Caches WP users and products for 24 hours to avoid expensive queries
 * - Cross-references against AMPlify client list CSV for email addresses
 * - Outputs a markdown report file to data/reports/
 *
 * Usage: node --env-file=.env src/discovery-and-testing/orphan-authors/orphan-authors-check.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const { api, fetchAllPages } = require('../../wp-wc-export/wc-client');

// CSV file path (AMPlify client list exported from Google Sheets)
const CSV_FILE = path.join(__dirname, 'AMPlify Client List & Progress Tracking - AMPlify RH List.csv');

const WP_URL = process.env.WP_URL;
const WP_ADMIN_USERNAME = process.env.WP_ADMIN_USERNAME;
const WP_ADMIN_PASSWORD = process.env.WP_ADMIN_PASSWORD;

// Cache settings - go up 3 levels from src/discovery-and-testing/orphan-authors/
const CACHE_DIR = path.join(__dirname, '../../../data/cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Ensure a directory exists
 */
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Check if cache file is valid (exists and not expired)
 */
function isCacheValid(cachePath) {
    if (!fs.existsSync(cachePath)) return false;

    const stats = fs.statSync(cachePath);
    const age = Date.now() - stats.mtimeMs;
    return age < CACHE_TTL_MS;
}

/**
 * Load data from cache
 */
function loadCache(cachePath) {
    const data = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(data);
}

/**
 * Save data to cache
 */
function saveCache(cachePath, data) {
    ensureDir(CACHE_DIR);
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
}

/**
 * Fetch all WordPress users (with caching)
 */
async function getAllWPUsers() {
    const cachePath = path.join(CACHE_DIR, 'wp-users.json');

    if (isCacheValid(cachePath)) {
        console.log('  Using cached WP users (< 24h old)');
        return loadCache(cachePath);
    }

    console.log('  Fetching WP users from API...');
    const users = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        console.log(`    Page ${page}...`);
        const res = await axios.get(`${WP_URL}/wp-json/wp/v2/users`, {
            params: { per_page: perPage, page, context: 'edit' },
            auth: { username: WP_ADMIN_USERNAME, password: WP_ADMIN_PASSWORD }
        });

        users.push(...res.data);

        const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1');
        if (page >= totalPages) break;
        page++;
    }

    saveCache(cachePath, users);
    console.log(`  Cached ${users.length} users`);
    return users;
}

/**
 * Fetch all products (with caching)
 */
async function getAllProducts() {
    const cachePath = path.join(CACHE_DIR, 'wc-products.json');

    if (isCacheValid(cachePath)) {
        console.log('  Using cached products (< 24h old)');
        return loadCache(cachePath);
    }

    console.log('  Fetching products from API...');
    const products = await fetchAllPages('products', { status: 'any' });

    saveCache(cachePath, products);
    console.log(`  Cached ${products.length} products`);
    return products;
}

/**
 * Parse the AMPlify client list CSV
 * Returns array of { clientName, email, vendorName, bookTitle }
 */
function parseClientListCSV() {
    if (!fs.existsSync(CSV_FILE)) {
        console.log('  CSV file not found, skipping CSV cross-reference');
        return [];
    }

    console.log('  Loading AMPlify client list CSV...');
    const content = fs.readFileSync(CSV_FILE, 'utf8');

    // Parse CSV with relaxed options to handle the complex multi-line headers
    const records = parse(content, {
        columns: false,  // Don't use first row as headers (it's complex multi-line)
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
    });

    const clients = [];

    for (const row of records) {
        // Data rows: field[0] is "Last, First", field[1] is email
        const clientNameRaw = row[0]?.trim().replace(/^"|"$/g, '').trim();
        const email = row[1]?.trim();

        // Skip header rows and invalid rows
        if (!email || !email.includes('@')) continue;
        if (clientNameRaw.toLowerCase().includes('client name')) continue;

        const vendorName = row[7]?.trim().replace(/^"|"$/g, '').trim() || '';
        const bookTitle = row[8]?.trim().replace(/^"|"$/g, '').trim() || '';

        // Convert "Last, First" to "First Last"
        let clientName = clientNameRaw;
        if (clientNameRaw.includes(',')) {
            const [last, first] = clientNameRaw.split(',').map(s => s.trim());
            clientName = `${first} ${last}`.trim();
        }

        clients.push({
            clientName,
            clientNameRaw,
            email,
            vendorName,
            bookTitle
        });
    }

    console.log(`  Found ${clients.length} clients in CSV`);
    return clients;
}

/**
 * Find matching client in CSV for an author name
 */
function findMatchingClient(authorName, clients) {
    const normalizedAuthor = normalizeName(authorName);
    if (!normalizedAuthor) return null;

    for (const client of clients) {
        const normalizedClientName = normalizeName(client.clientName);
        const normalizedVendorName = normalizeName(client.vendorName);

        // Exact matches
        if (normalizedAuthor === normalizedClientName) return client;
        if (normalizedAuthor === normalizedVendorName) return client;

        // Partial matches (for cases like "Dr. Christina Rahm" matching "Christina Rahm")
        if (normalizedAuthor.length > 5 && normalizedClientName.length > 5) {
            if (normalizedAuthor.includes(normalizedClientName)) return client;
            if (normalizedClientName.includes(normalizedAuthor)) return client;
        }
        if (normalizedAuthor.length > 5 && normalizedVendorName.length > 5) {
            if (normalizedAuthor.includes(normalizedVendorName)) return client;
            if (normalizedVendorName.includes(normalizedAuthor)) return client;
        }
    }

    return null;
}

/**
 * Normalize a name for comparison
 */
function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')  // Remove punctuation
        .replace(/\s+/g, ' ')          // Normalize whitespace
        .trim();
}

/**
 * Check if an author name matches any WP user
 */
function findMatchingUser(authorName, wpUsers) {
    const normalizedAuthor = normalizeName(authorName);
    if (!normalizedAuthor) return null;

    for (const user of wpUsers) {
        const normalizedUserName = normalizeName(user.name);
        const normalizedFirstLast = normalizeName(`${user.first_name} ${user.last_name}`);
        const normalizedSlug = normalizeName(user.slug);

        // Check various matching strategies
        if (normalizedAuthor === normalizedUserName) return user;
        if (normalizedAuthor === normalizedFirstLast) return user;
        if (normalizedAuthor === normalizedSlug) return user;

        // Check if author name contains user name or vice versa (for partial matches)
        if (normalizedAuthor.includes(normalizedUserName) && normalizedUserName.length > 5) return user;
        if (normalizedUserName.includes(normalizedAuthor) && normalizedAuthor.length > 5) return user;
    }

    return null;
}

/**
 * Parse multi-author field (comma-separated)
 */
function parseAuthors(authorFullName) {
    if (!authorFullName) return [];

    // Split by comma, but be careful of "Breakfield & Burkey" style names
    return authorFullName
        .split(/,\s*/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
}

async function main() {
    console.log('=== Orphan Authors Report ===\n');

    // 1. Fetch all WP users (cached)
    console.log('1. Loading WordPress users...');
    const wpUsers = await getAllWPUsers();
    console.log(`   Found ${wpUsers.length} WP users\n`);

    // 2. Fetch all products with ACF author data (cached)
    console.log('2. Loading products...');
    const products = await getAllProducts();
    console.log(`   Found ${products.length} products\n`);

    // 3. Load AMPlify client list CSV
    console.log('3. Loading AMPlify client list...');
    const csvClients = parseClientListCSV();
    console.log('');

    // 4. Extract unique author names from products
    console.log('4. Extracting author names from product ACF...');
    const authorProducts = new Map(); // author name -> [product ids]

    for (const product of products) {
        const authorFullName = product.acf?.author_full_name;
        if (!authorFullName) continue;

        const authors = parseAuthors(authorFullName);
        for (const author of authors) {
            if (!authorProducts.has(author)) {
                authorProducts.set(author, []);
            }
            authorProducts.get(author).push({
                id: product.id,
                name: product.name
            });
        }
    }

    console.log(`   Found ${authorProducts.size} unique author names\n`);

    // 5. Check each author against WP users and CSV
    console.log('5. Checking for matching WP users and CSV clients...\n');

    const orphans = [];
    const orphansWithCSVMatch = [];
    const matched = [];

    for (const [authorName, prods] of authorProducts) {
        const matchingUser = findMatchingUser(authorName, wpUsers);

        if (matchingUser) {
            matched.push({
                author: authorName,
                wpUser: {
                    id: matchingUser.id,
                    name: matchingUser.name,
                    email: matchingUser.email
                },
                productCount: prods.length
            });
        } else {
            // No WP user - check CSV for email
            const csvMatch = findMatchingClient(authorName, csvClients);

            if (csvMatch) {
                orphansWithCSVMatch.push({
                    author: authorName,
                    products: prods,
                    productCount: prods.length,
                    csvMatch
                });
            } else {
                orphans.push({
                    author: authorName,
                    products: prods,
                    productCount: prods.length
                });
            }
        }
    }

    // 6. Generate console report
    console.log('='.repeat(60));
    console.log('ORPHANS WITH CSV MATCH (found email in client list!)');
    console.log('='.repeat(60));
    console.log(`\nFound ${orphansWithCSVMatch.length} orphan authors with email in CSV:\n`);

    orphansWithCSVMatch.sort((a, b) => b.productCount - a.productCount);

    for (const orphan of orphansWithCSVMatch) {
        console.log(`\n${orphan.author}`);
        console.log(`  -> CSV: ${orphan.csvMatch.clientName} (${orphan.csvMatch.email})`);
        if (orphan.csvMatch.vendorName) {
            console.log(`  -> Vendor: ${orphan.csvMatch.vendorName}`);
        }
        console.log(`  -> Products (${orphan.productCount})`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TRUE ORPHANS (no WP user, no CSV match)');
    console.log('='.repeat(60));
    console.log(`\nFound ${orphans.length} authors with no match anywhere:\n`);

    // Sort by product count descending
    orphans.sort((a, b) => b.productCount - a.productCount);

    for (const orphan of orphans) {
        console.log(`\n${orphan.author}`);
        console.log(`  Products (${orphan.productCount}):`);
        orphan.products.slice(0, 3).forEach(p => {
            console.log(`    - #${p.id}: ${p.name}`);
        });
        if (orphan.products.length > 3) {
            console.log(`    ... and ${orphan.products.length - 3} more`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('MATCHED AUTHORS (have WP user account)');
    console.log('='.repeat(60));
    console.log(`\nFound ${matched.length} authors with WP accounts:\n`);

    matched.sort((a, b) => b.productCount - a.productCount);

    for (const m of matched.slice(0, 20)) {
        console.log(`${m.author}`);
        console.log(`  -> WP#${m.wpUser.id}: ${m.wpUser.name} (${m.wpUser.email})`);
        console.log(`  -> ${m.productCount} product(s)`);
    }
    if (matched.length > 20) {
        console.log(`\n... and ${matched.length - 20} more matched authors`);
    }

    // 7. Generate markdown report
    console.log('\n7. Generating report...');

    const reportDate = new Date().toISOString().split('T')[0];
    const reportLines = [
        `# Orphan Authors Report`,
        ``,
        `**Generated:** ${new Date().toISOString()}`,
        ``,
        `## Summary`,
        ``,
        `| Metric | Count |`,
        `|--------|-------|`,
        `| Total unique authors in products | ${authorProducts.size} |`,
        `| Authors with WP accounts | ${matched.length} |`,
        `| Orphans with CSV email match | ${orphansWithCSVMatch.length} |`,
        `| True orphans (no match anywhere) | ${orphans.length} |`,
        ``,
        `---`,
        ``,
        `## True Orphan Authors`,
        ``,
        `These authors appear in product ACF metadata but have no matching WordPress user account`,
        `AND no match in the AMPlify client list CSV. **We need help identifying these authors.**`,
        ``,
        `| Author Name | Product Count | Sample Product |`,
        `|-------------|---------------|----------------|`,
    ];

    for (const orphan of orphans) {
        const sampleProduct = orphan.products[0];
        const authorEscaped = orphan.author.replace(/\|/g, '\\|');
        const productEscaped = sampleProduct.name.replace(/\|/g, '\\|');
        reportLines.push(`| ${authorEscaped} | ${orphan.productCount} | #${sampleProduct.id}: ${productEscaped} |`);
    }

    reportLines.push(``);
    reportLines.push(`---`);
    reportLines.push(``);
    reportLines.push(`## True Orphan Authors - Detailed List`);
    reportLines.push(``);

    for (const orphan of orphans) {
        reportLines.push(`### ${orphan.author}`);
        reportLines.push(``);
        reportLines.push(`**Products (${orphan.productCount}):**`);
        for (const p of orphan.products) {
            reportLines.push(`- #${p.id}: ${p.name}`);
        }
        reportLines.push(``);
    }

    reportLines.push(`---`);
    reportLines.push(``);
    reportLines.push(`## Orphans with CSV Match (Ready to Migrate)`);
    reportLines.push(``);
    reportLines.push(`These authors have no WP account but were found in the AMPlify client list CSV.`);
    reportLines.push(`We can migrate these using the email from CSV.`);
    reportLines.push(``);
    reportLines.push(`| Author Name | CSV Client | Email | Products |`);
    reportLines.push(`|-------------|------------|-------|----------|`);

    for (const orphan of orphansWithCSVMatch) {
        const authorEscaped = orphan.author.replace(/\|/g, '\\|');
        const clientEscaped = (orphan.csvMatch.clientName || '').replace(/\|/g, '\\|');
        reportLines.push(`| ${authorEscaped} | ${clientEscaped} | ${orphan.csvMatch.email} | ${orphan.productCount} |`);
    }

    reportLines.push(`---`);
    reportLines.push(``);
    reportLines.push(`## Matched Authors (WP accounts)`);
    reportLines.push(``);
    reportLines.push(`These authors have matching WordPress user accounts.`);
    reportLines.push(``);
    reportLines.push(`| Author Name | WP User ID | WP Email | Product Count |`);
    reportLines.push(`|-------------|------------|----------|---------------|`);

    for (const m of matched) {
        const authorEscaped = m.author.replace(/\|/g, '\\|');
        reportLines.push(`| ${authorEscaped} | ${m.wpUser.id} | ${m.wpUser.email} | ${m.productCount} |`);
    }

    // Write report file - output to same directory as the script
    const reportPath = path.join(__dirname, `orphan-authors-report-${reportDate}.md`);
    fs.writeFileSync(reportPath, reportLines.join('\n'));

    console.log(`   Report saved to: ${reportPath}`);

    // Console summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total unique authors in products: ${authorProducts.size}`);
    console.log(`  - With WP accounts: ${matched.length}`);
    console.log(`  - Orphans with CSV match: ${orphansWithCSVMatch.length}`);
    console.log(`  - True orphans (no match): ${orphans.length}`);
    console.log(`\nReport saved to: ${reportPath}`);

    // Return data for programmatic use
    return { orphans, orphansWithCSVMatch, matched, reportPath };
}

main().catch(console.error);
