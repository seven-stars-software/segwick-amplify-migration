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
 * - Outputs a markdown report file to data/reports/
 *
 * Usage: node --env-file=.env scripts/reports/orphan-authors-report.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { api, fetchAllPages } = require('../wp-wc-export/wc-client');

const WP_URL = process.env.WP_URL;
const WP_ADMIN_USERNAME = process.env.WP_ADMIN_USERNAME;
const WP_ADMIN_PASSWORD = process.env.WP_ADMIN_PASSWORD;

// Cache settings
const CACHE_DIR = path.join(__dirname, '../../data/cache');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Report output directory
const REPORTS_DIR = path.join(__dirname, '../../data/reports');

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

    // 3. Extract unique author names from products
    console.log('3. Extracting author names from product ACF...');
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

    // 4. Check each author against WP users
    console.log('4. Checking for matching WP users...\n');

    const orphans = [];
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
            orphans.push({
                author: authorName,
                products: prods,
                productCount: prods.length
            });
        }
    }

    // 5. Generate report
    console.log('='.repeat(60));
    console.log('ORPHAN AUTHORS (no matching WP user)');
    console.log('='.repeat(60));
    console.log(`\nFound ${orphans.length} authors without WP accounts:\n`);

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

    // 6. Generate markdown report
    console.log('\n6. Generating report...');

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
        `| Authors without WP accounts (orphans) | ${orphans.length} |`,
        ``,
        `---`,
        ``,
        `## Orphan Authors`,
        ``,
        `These authors appear in product ACF metadata but have no matching WordPress user account.`,
        `They will need:`,
        `1. Email address resolved (ask PAV team)`,
        `2. Segwik customer created`,
        `3. Pen name created linking to that customer`,
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
    reportLines.push(`## Orphan Authors - Detailed List`);
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
    reportLines.push(`## Matched Authors`);
    reportLines.push(``);
    reportLines.push(`These authors have matching WordPress user accounts.`);
    reportLines.push(``);
    reportLines.push(`| Author Name | WP User ID | WP Email | Product Count |`);
    reportLines.push(`|-------------|------------|----------|---------------|`);

    for (const m of matched) {
        const authorEscaped = m.author.replace(/\|/g, '\\|');
        reportLines.push(`| ${authorEscaped} | ${m.wpUser.id} | ${m.wpUser.email} | ${m.productCount} |`);
    }

    // Write report file
    ensureDir(REPORTS_DIR);
    const reportPath = path.join(REPORTS_DIR, `orphan-authors-${reportDate}.md`);
    fs.writeFileSync(reportPath, reportLines.join('\n'));

    console.log(`   Report saved to: ${reportPath}`);

    // Console summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total unique authors in products: ${authorProducts.size}`);
    console.log(`  - With WP accounts: ${matched.length}`);
    console.log(`  - Without WP accounts (orphans): ${orphans.length}`);
    console.log(`\nReport saved to: ${reportPath}`);

    // Return data for programmatic use
    return { orphans, matched, reportPath };
}

main().catch(console.error);
