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
    constructor(token, staffCredentials = null) {
        if (!token) {
            throw new Error('API token is required');
        }
        this.token = token;
        this.baseUrl = BASE_URL;

        // Staff credentials for endpoints requiring Bearer auth (e.g., /content/save)
        this.staffCredentials = staffCredentials; // { email, password }
        this.staffJwt = null;
        this.staffJwtExp = null;
    }

    /**
     * Login as staff to get a JWT for Bearer auth.
     * Required for some endpoints like /content/save.
     */
    async staffLogin() {
        if (!this.staffCredentials) {
            throw new Error('Staff credentials not configured. Pass { email, password } to constructor.');
        }

        const response = await fetch(`${this.baseUrl}/staffLogin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: this.staffCredentials.email,
                password: this.staffCredentials.password
            })
        });

        const data = await response.json();

        if (!response.ok || !data.data?.token) {
            throw new Error(`Staff login failed: ${data.message || response.statusText}`);
        }

        this.staffJwt = data.data.token;

        // Decode JWT to get expiry (payload is second part, base64 encoded)
        const payload = JSON.parse(Buffer.from(this.staffJwt.split('.')[1], 'base64').toString());
        this.staffJwtExp = payload.exp * 1000; // Convert to milliseconds

        console.log(`Staff login successful. JWT expires: ${new Date(this.staffJwtExp).toISOString()}`);
        return data;
    }

    /**
     * Get a valid staff JWT, refreshing if needed.
     */
    async getStaffJwt() {
        // Refresh if no token or expiring within 5 minutes
        const bufferMs = 5 * 60 * 1000;
        if (!this.staffJwt || !this.staffJwtExp || Date.now() > this.staffJwtExp - bufferMs) {
            await this.staffLogin();
        }
        return this.staffJwt;
    }

    /**
     * Make a request with Bearer token auth (for endpoints like /content/save).
     */
    async bearerRequest(method, endpoint, body = null) {
        const jwt = await this.getStaffJwt();
        const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
            }
        };

        if (body) {
            fetchOptions.body = JSON.stringify(body);
        }

        const startTime = Date.now();
        const response = await fetch(url, fetchOptions);
        const duration = Date.now() - startTime;

        // Try to parse as JSON regardless of content-type (Segwik sometimes returns wrong header)
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
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
    async addCustomer(customerData) {
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
     * Update a customer by their Segwik customer_id.
     *
     * This is the preferred method for upserts - more reliable than email/phone matching.
     * Pass customer_id to update an existing customer.
     *
     * @param {number} customerId - Segwik customer_id
     * @param {object} customerData - Fields to update
     * @returns {object} - Updated customer object
     */
    async updateCustomerById(customerId, customerData) {
        return this.post('/customer/add', {
            customer_id: customerId,
            ...customerData
        });
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
    // Content/CMS endpoints
    // ============================================================

    /**
     * Create or update a CMS page (including Pen Names).
     * Requires Bearer auth (staff JWT).
     *
     * @param {object} contentData - Full page payload
     */
    async saveContent(contentData) {
        return this.bearerRequest('POST', '/content/save', contentData);
    }

    /**
     * Create a Pen Name for an author.
     *
     * Pen Names allow authors to publish under aliases. Products link to
     * pen names rather than directly to customers.
     *
     * @param {object} options
     * @param {number} options.customerId - Segwik customer_id who owns this pen name
     * @param {string} options.firstName - Pen name first name
     * @param {string} options.lastName - Pen name last name
     * @param {string} [options.middleName] - Pen name middle name (optional)
     * @param {string} [options.pageId] - Include for updates, omit for creates
     */
    async createPenName({ customerId, firstName, lastName, middleName = null, pageId = null }) {
        const fullName = middleName
            ? `${firstName} ${middleName} ${lastName}`
            : `${firstName} ${lastName}`;

        const slug = fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const payload = {
            page_title: fullName,
            page_type: 'pen',
            page_slug: slug,
            customer_id: customerId,
            template_id: 1216979,
            publish: 0,
            publish_on: 2147483640,
            is_featured: 0,
            is_freemium: 1,
            s3type: 'public',
            featured_video_s3type: 'private',
            featured_video: null,
            tagging: null,
            custom_flags: '',
            short_desc: '',
            content: '',
            style_css: null,
            custom_js: null,
            alt_tag: null,
            product_id: [],
            user_id: null,
            custpersonas: '',
            cmscat_id: null,
            cmssubcat_id: null,
            call_to_action: null,
            pg_bgimg2: null,
            star_rating: null,
            gallery_prod_type: null,
            website_id: null,
            meta_title: null,
            meta_keywords: null,
            meta_desc: null,
            og_image: null,
            og_title: null,
            og_type: null,
            og_url: null,
            image_alt_text: null,
            og_desc: null,
            json_content: {
                custom_fields: {
                    pen_name_first_name: firstName,
                    pen_name_last_name: lastName,
                    pen_name_middle_name: middleName,
                    creation_method: 'synced_via_wordpress',
                    public_page_type: 'author'
                }
            }
        };

        if (pageId) {
            payload.page_id = pageId;
        }

        return this.saveContent(payload);
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
