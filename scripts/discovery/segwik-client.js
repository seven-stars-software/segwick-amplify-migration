/**
 * Segwik API Client
 * Base client for making authenticated requests to the Segwik API
 */

const BASE_URL = 'https://api.segwik.com/api/v2';

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
        // For GET requests with token in path, construct URL
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, body = {}, options = {}) {
        return this.request('POST', endpoint, body, options);
    }

    // Customer endpoints
    async createCustomer(customerData) {
        return this.post('/customer/add', customerData);
    }

    async lookupCustomerByPhone(customer_token, phone) {
        return this.get(`/customer/lookup/${customer_token}/${phone}`);
    }

    async customerSignup(signupData) {
        return this.post('/customer/signup', signupData);
    }

    // Undocumented endpoint from Pete
    async customerProfile(profileData) {
        return this.post('/customer/profile', profileData);
    }

    // Transaction endpoint
    async createTransaction(transactionData) {
        return this.post('/customer/transaction/create', transactionData);
    }

    // Product endpoints (note: different base path)
    async createOrUpdateProduct(productData) {
        // This endpoint uses /api/product not /api/v2
        return this.request('POST', 'https://api.segwik.com/api/product/createUpdate', productData);
    }
}

module.exports = SegwikClient;
