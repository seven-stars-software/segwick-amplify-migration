/**
 * WooCommerce API Client for data export
 *
 * Uses the same WooCommerce REST API as amplify-backend.
 * Requires: WP_URL, WOO_CONSUMER_KEY, WOO_CONSUMER_SECRET in .env
 */

const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;

const WP_URL = process.env.WP_URL;
const WOO_CONSUMER_KEY = process.env.WOO_CONSUMER_KEY;
const WOO_CONSUMER_SECRET = process.env.WOO_CONSUMER_SECRET;

if (!WP_URL || !WOO_CONSUMER_KEY || !WOO_CONSUMER_SECRET) {
    console.error('Missing required environment variables:');
    if (!WP_URL) console.error('  - WP_URL');
    if (!WOO_CONSUMER_KEY) console.error('  - WOO_CONSUMER_KEY');
    if (!WOO_CONSUMER_SECRET) console.error('  - WOO_CONSUMER_SECRET');
    process.exit(1);
}

const api = new WooCommerceRestApi({
    url: WP_URL,
    consumerKey: WOO_CONSUMER_KEY,
    consumerSecret: WOO_CONSUMER_SECRET,
    version: "wc/v3"
});

/**
 * Fetch all pages of a paginated endpoint
 * WooCommerce returns max 100 items per page
 */
async function fetchAllPages(endpoint, params = {}) {
    const allItems = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        console.log(`  Fetching ${endpoint} page ${page}...`);
        const response = await api.get(endpoint, {
            ...params,
            per_page: perPage,
            page: page
        });

        const items = response.data;
        allItems.push(...items);

        // Check if we've reached the last page
        const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1');
        console.log(`    Got ${items.length} items (page ${page}/${totalPages})`);

        if (page >= totalPages || items.length === 0) {
            break;
        }
        page++;
    }

    return allItems;
}

/**
 * Get all WooCommerce customers
 * Returns: id, email, first_name, last_name, billing, shipping, etc.
 */
async function getAllCustomers() {
    return fetchAllPages('customers', { role: 'all' });
}

/**
 * Get a single customer by ID
 */
async function getCustomer(id) {
    const response = await api.get(`customers/${id}`);
    return response.data;
}

/**
 * Get all WooCommerce orders
 * Returns: id, customer_id, status, line_items, billing, etc.
 */
async function getAllOrders(status = 'any') {
    return fetchAllPages('orders', { status });
}

/**
 * Get orders for a specific customer
 */
async function getCustomerOrders(customerId) {
    return fetchAllPages('orders', { customer: customerId });
}

/**
 * Get all WooCommerce products
 * Returns: id, name, price, meta_data (author, isbn, etc.)
 */
async function getAllProducts(status = 'any') {
    return fetchAllPages('products', { status });
}

/**
 * Get a single product by ID
 */
async function getProduct(id) {
    const response = await api.get(`products/${id}`);
    return response.data;
}

/**
 * Get all authors (WC Product Vendors)
 * Authors have role: wc_product_vendors_admin_vendor
 */
async function getAllAuthors() {
    return fetchAllPages('customers', { role: 'wc_product_vendors_admin_vendor' });
}

/**
 * Get customers by a list of IDs (single request using include parameter)
 * @param {number[]} ids - Array of WC customer IDs
 */
async function getCustomersByIds(ids) {
    if (ids.length === 0) return [];

    // WC API accepts include as comma-separated IDs
    const response = await api.get('customers', {
        include: ids,
        per_page: Math.max(ids.length, 100)
    });
    return response.data;
}

/**
 * Get customers by a list of emails
 * Note: WC API only supports single email filter, so we batch these
 * @param {string[]} emails - Array of email addresses
 */
async function getCustomersByEmails(emails) {
    const customers = [];
    for (const email of emails) {
        try {
            const response = await api.get('customers', { email });
            if (response.data.length > 0) {
                customers.push(response.data[0]);
            } else {
                console.warn(`  No customer found for email: ${email}`);
            }
        } catch (err) {
            console.warn(`  Failed to fetch customer ${email}: ${err.message}`);
        }
    }
    return customers;
}

module.exports = {
    api,
    fetchAllPages,
    getAllCustomers,
    getCustomer,
    getCustomersByIds,
    getCustomersByEmails,
    getAllAuthors,
    getAllOrders,
    getCustomerOrders,
    getAllProducts,
    getProduct
};
