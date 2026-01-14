/**
 * Segwik API Client
 * Base client for making authenticated requests to the Segwik API
 *
 * IMPORTANT: Customer creation requires email_json and phone_json arrays,
 * not just top-level email/phone fields. See formatCustomerData().
 */

const BASE_URL = 'https://api.segwik.com/api/v2';

/**
 * Segwik Persona IDs (custbase_id)
 * These control which UI/dashboard the user sees in Segwik frontend.
 * Customers can have multiple personas via the `personas` array field.
 */
const PERSONA = {
    AUTHOR: 1120,
    PUBLISHER: 1121,
    LISTENER: 1122,      // Default for app users (audiobook consumers)
    NARRATOR: 1154,
    SUBPUB_AUTHOR: 1158  // Sub-publisher author
};

class SegwikClient {
    constructor(token) {
        if (!token) {
            throw new Error('API token is required');
        }
        this.token = token;
        this.baseUrl = BASE_URL;
    }

    /**
     * Make an authenticated request to the Segwik API
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint (without base URL)
     * @param {object} body - Request body (for POST/PUT)
     * @param {object} options - Additional fetch options
     */
    async request(method, endpoint, body = null, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // For POST requests, include token in body
        if (body || method === 'POST') {
            fetchOptions.body = JSON.stringify({
                token: this.token,
                ...body
            });
        }

        const startTime = Date.now();

        try {
            const response = await fetch(url, fetchOptions);
            const duration = Date.now() - startTime;

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                duration,
                data,
                url,
                method
            };
        } catch (error) {
            return {
                ok: false,
                status: 0,
                statusText: 'Network Error',
                duration: Date.now() - startTime,
                error: error.message,
                url,
                method
            };
        }
    }

    // Convenience methods
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, body = {}, options = {}) {
        return this.request('POST', endpoint, body, options);
    }

    // ============================================================
    // Customer endpoints
    // ============================================================

    /**
     * Format customer data with required email_json and phone_json arrays.
     * This is REQUIRED for phone lookup and upsert to work correctly.
     *
     * @param {object} data - Customer data with email, phone, firstname, lastname, etc.
     * @returns {object} - Formatted data with email_json and phone_json arrays
     */
    formatCustomerData(data) {
        const formatted = { ...data };

        // Add email_json if email is provided
        if (data.email && !data.email_json) {
            formatted.email_json = [{
                email: data.email,
                is_primary: true,
                type: 'business'
            }];
        }

        // Add phone_json if phone is provided
        if (data.phone && !data.phone_json) {
            formatted.phone_json = [{
                phone: data.phone,
                is_primary: true,
                type: 'Mobile'
            }];
        }

        return formatted;
    }

    /**
     * Create or update a customer/lead.
     * Uses phone_json for upsert - if phone exists, updates instead of creating duplicate.
     *
     * @param {object} customerData - Customer data (email, phone, firstname, lastname, etc.)
     * @returns {object} - Response with customer_id, encrypted_customer_id, is_exist, etc.
     */
    async createCustomer(customerData) {
        const formatted = this.formatCustomerData(customerData);
        return this.post('/customer/add', formatted);
    }

    /**
     * Lookup customer by phone number.
     * REQUIRES the customer was created with phone_json array.
     *
     * @param {string} phone - Phone number to lookup
     * @returns {object} - Customer data if found, or { is_customer_exist: false }
     */
    async lookupCustomerByPhone(phone) {
        return this.get(`/customer/lookup/${this.token}/${phone}`);
    }

    /**
     * List customers with optional filtering.
     * Note: email filter doesn't work (returns all customers).
     * Use customer_id filter to get specific customer.
     *
     * @param {object} filters - Optional filters (customer_id works, email doesn't)
     * @returns {object} - { success, data: [...customers], meta_data: { count } }
     */
    async listCustomers(filters = {}) {
        return this.post('/customer/list', filters);
    }

    /**
     * Signup/login endpoint for end users.
     * @param {object} signupData - { type, firstname, lastname, email, password, cellphone }
     */
    async customerSignup(signupData) {
        return this.post('/customer/signup', signupData);
    }

    // ============================================================
    // Transaction endpoints
    // ============================================================

    /**
     * Create a transaction (invoice/project/opportunity).
     *
     * @param {object} transactionData - Transaction data
     * @param {string} transactionData.customer_token - MUST be encrypted_customer_id (not customer_id!)
     * @param {array} transactionData.items - Array of { qty, price, product_id }
     * @param {number} transactionData.types - 1=Invoice, 2=Project, 3=Opportunity
     * @param {string} transactionData.quote_subject - Description (optional)
     */
    async createTransaction(transactionData) {
        return this.post('/customer/transaction/create', transactionData);
    }

    // ============================================================
    // Product endpoints (note: different base path)
    // ============================================================

    /**
     * Create or update a product.
     * Note: Uses /api/product not /api/v2
     */
    async createOrUpdateProduct(productData) {
        return this.request('POST', 'https://api.segwik.com/api/product/createUpdate', productData);
    }
}

module.exports = SegwikClient;
module.exports.PERSONA = PERSONA;
