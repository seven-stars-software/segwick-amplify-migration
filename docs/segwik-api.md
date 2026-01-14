# Segwik API Documentation

Documentation of Segwik API endpoints discovered during migration project.

**Swagger JSON:** `docs/segwik-swagger.json`

---

## Contacts

| Role | Name | Notes |
|------|------|-------|
| Primary Contact | Pete Romano | |
| Developer | Shriniwas | Slow response times via WhatsApp |

---

## Base Configuration

```
Base URL: https://api.segwik.com/api/v2
Swagger: https://api.segwik.com/api/documentation
Auth: API key passed in request body as `token`
```

---

## Issues Reported to Segwik

**Email sent to Pete:** 2026-01-13 ~6:45 PM PST

| Issue | Description | Status |
|-------|-------------|--------|
| No customer fetch by ID | `GET /customer/{id}` doesn't exist | Reported |
| Phone lookup broken | `/customer/lookup/{token}/{phone}` returns `is_customer_exist: false` for valid customers | **RESOLVED** - use `phone_json` |
| `wordpress_user_id` not visible | Field not returned in any response, can't verify it's stored | Reported |
| Duplicate customers allowed | Same email/phone can create multiple customer records | **RESOLVED** - use `phone_json` for upsert |
| `is_exist` always false | Create response shows `is_exist: false` even when customer created | **RESOLVED** - works with `phone_json` |

**Test customers referenced in email:** 2965632, 2965633 (same email/phone, different IDs)

---

## Discovery Log

### 2026-01-14 ~2:45 PM PST

**Session:** JSON fields discovery (info from Shriniwas)

**Key insight from Shriniwas:** Must use `email_json` and `phone_json` array fields, not just top-level `email`/`phone`.

**Findings:**
1. **Phone lookup NOW WORKS** - Returns full customer data with `is_customer_exist: true`
2. **List endpoint NOW returns email/phone** - Both `email`, `phone`, `primary_email`, `primary_phone` populated
3. **UPSERT NOW WORKS** - Same phone returns existing customer! `is_exist: true`, same `customer_id`, message "Lead updated successfully"
4. **No email lookup endpoint** - `/customer/lookup-email/` doesn't exist (returns HTML)
5. **List email filter broken** - Filter by email returns all customers, doesn't actually filter

**Test customer:** 2965673 (jcksncllwy+json-test@gmail.com, 5559998888)

**Required payload structure:**
```json
{
    "email": "user@example.com",
    "email_json": [{ "email": "user@example.com", "is_primary": true, "type": "business" }],
    "phone_json": [{ "phone": "5559998888", "is_primary": true, "type": "Mobile" }],
    "firstname": "John",
    "lastname": "Doe",
    "custbase_id": 1122,
    "lead_from": "source"
}
```

**Status of previously reported issues:**
| Issue | New Status |
|-------|------------|
| Phone lookup broken | **RESOLVED** - works with `phone_json` |
| Duplicate customers | **RESOLVED** - upsert works with `phone_json` |
| `is_exist` always false | **RESOLVED** - returns `true` for existing |
| No customer fetch by ID | Still no endpoint |
| `wordpress_user_id` not visible | Untested with new format |

---

### 2026-01-13 ~8:00 PM PST

**Session:** Transaction API discovery

**Findings:**
1. **`customer_token` clarified** - Must use `encrypted_customer_id` from `/customer/add` response, NOT `customer_id` integer
2. **Transaction types** - `types=1` (Invoice), `types=2` (Project), `types=3` (Opportunity)
3. **Product validation** - `product_id` doesn't validate against actual products (fake IDs work)
4. **Multi-item support** - Works, returns array of `quote_detail_id` values
5. **Optional fields** - `company_id` and `transaction_fields` not required for basic transactions

**Test transactions created:** quote_id 302100-302103

---

### 2026-01-13 ~6:00-7:00 PM PST

**Session:** Initial API discovery

**Token verified:** `lvvO...f9Js` - working

**Test customers created:**
| customer_id | email | phone | notes |
|-------------|-------|-------|-------|
| 2965625 | jcksncllwy+segwik-discovery@gmail.com | 5551234567 | First test |
| 2965626 | jcksncllwy+segwik-discovery@gmail.com | 5551234567 | Duplicate (upsert test) |
| 2965627 | jcksncllwy+segwik-discovery@gmail.com | 5551234567 | Duplicate |
| 2965628 | jcksncllwy+segwik-discovery@gmail.com | 5551234567 | Duplicate |
| 2965629 | jcksncllwy+wptest@gmail.com | 5559876543 | wordpress_user_id test |
| 2965632 | (same as above) | (same) | Referenced in email to Pete |
| 2965633 | (same as above) | (same) | Referenced in email to Pete |

**Findings:**

1. **Customer creation works** - `POST /customer/add` returns customer_id
2. **No upsert** - Same email creates new customer each time
3. **Phone lookup broken** - Returns `is_customer_exist: false` for known customers
4. **No email lookup** - Only phone lookup endpoint exists (and it's broken)
5. **List endpoint incomplete** - `POST /customer/list` doesn't return email or phone fields
6. **No customer detail endpoint** - Can't fetch full customer record by ID
7. **`wordpress_user_id` unknown** - Sent in request, not returned in response

---

## Verified Endpoints

### POST /api/v2/customer/add

Create a new customer/lead.

**Tested:** 2026-01-13 ~6:20 PM PST

**Request:**
```json
{
    "token": "API_KEY",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "phone": "5551234567",
    "lead_from": "migration-discovery",
    "wordpress_user_id": 12345
}
```

**Response (200 OK):**
```json
{
    "customer_id": 2965625,
    "encrypted_customer_id": "YUdpRzhXZzR3TU4yRnl6aVcrV3B3UT09",
    "firstname": "John",
    "lastname": "Doe",
    "phone": "5551234567",
    "email": "john@example.com",
    "contact_type_name": "Lead",
    "cust_type_id": 1,
    "user_id": 6352,
    "account_id": 6351,
    "is_exist": false,
    "success": true,
    "message": "Lead created successfully."
}
```

**Issues:**
- `is_exist` always returns `false` even when customer is created
- `wordpress_user_id` not returned (unknown if stored)
- Creates duplicates if called twice with same email/phone

---

### GET /api/v2/customer/lookup/{token}/{phone}

Lookup customer by phone number.

**Tested:** 2026-01-13 ~6:25 PM PST

**Response (always):**
```json
{
    "is_customer_exist": false
}
```

**Issue:** Always returns false, even for customers we just created with that phone number.

---

### POST /api/v2/customer/list

List customers with optional filtering.

**Tested:** 2026-01-13 ~6:30 PM PST

**Request:**
```json
{
    "token": "API_KEY",
    "customer_id": 2965625
}
```

**Response:**
```json
{
    "success": true,
    "meta_data": { "count": 1 },
    "iTotalRecords": 1,
    "data": [{
        "_id": { "$oid": "..." },
        "customer_id": 2965625,
        "firstname": "John",
        "lastname": "Doe",
        "phone": null,
        "primary_phone": null,
        "cust_type": "Lead",
        "created_on": "01/13/2026 6:21 PM",
        "overall_status": "Active"
    }]
}
```

**Issues:**
- `phone` returned as `null` (was sent during creation)
- `email` not included in response at all
- `wordpress_user_id` not included
- Email filter parameter is ignored (returns all customers)

---

### POST /api/v2/customer/signup

Signup/login endpoint for end users.

**Documented in Swagger:** Yes
**Tested:** Not yet

**Request (from Swagger):**
```json
{
    "type": "manual",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "password": "secretpassword",
    "cellphone": "5551234567"
}
```

---

### POST /api/v2/customer/transaction/create

Create a transaction (equivalent to WooCommerce order).

**Documented in Swagger:** No (from Pete via WhatsApp)
**Tested:** 2026-01-13 ~8:00 PM PST

**Request:**
```json
{
    "token": "API_KEY",
    "items": [
        { "qty": 1, "price": "9.99", "product_id": 4009 }
    ],
    "types": 1,
    "customer_token": "YUdpRzhXZzR3TU4yRnl6aVcrV3B3UT09",
    "quote_subject": "Order description"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "quote_id": 302100,
    "message": "Invoice saved successfully.",
    "quote_detail_id": [900996]
}
```

**Key Findings:**

| Field | Value | Notes |
|-------|-------|-------|
| `customer_token` | `encrypted_customer_id` | NOT `customer_id`! Use the base64 string from `/customer/add` response |
| `types=1` | Invoice | Returns "Invoice saved successfully" |
| `types=2` | Project | Returns "Project saved successfully" |
| `types=3` | Opportunity | Returns "Opportunity saved successfully" |
| `product_id` | Any integer | Doesn't validate if product exists (product_id=1 worked) |

**Multi-item support:**
```json
{
    "items": [
        { "qty": 1, "price": "9.99", "product_id": 1 },
        { "qty": 2, "price": "14.99", "product_id": 2 }
    ]
}
// Returns: quote_detail_id: [900999, 901000] (one per line item)
```

**Test transactions created:**
| quote_id | types | description |
|----------|-------|-------------|
| 302100 | 1 (Invoice) | First successful test |
| 302101 | 2 (Project) | types=2 test |
| 302102 | 3 (Opportunity) | types=3 test |
| 302103 | 1 (Invoice) | Multi-item test |

**Untested fields (from Pete's original example):**
- `company_id` / `blg_company_id` - Not required for basic transactions
- `transaction_fields.blm_invoice_id` - Custom field mapping, untested

---

### POST /api/product/createUpdate

Create or update a product.

**Documented in Swagger:** Yes
**Tested:** Not yet

**Request (from Swagger):**
```json
{
    "token": "API_KEY",
    "title": "Product Name",
    "cat_id": 1,
    "scat_id": 1,
    "sku": "978-1-234567-89-0",
    "price": "19.99",
    "description": "Product description",
    "featured": "1",
    "status": "active"
}
```

**Note:** `sku` field could be used for ISBN.

---

## Endpoints That Don't Exist

**Tested:** 2026-01-13 ~6:35 PM PST

These return HTML (Angular app) instead of JSON API response:

| Endpoint | Expected | Actual |
|----------|----------|--------|
| `GET /customer/{id}` | Customer detail | HTML |
| `POST /customer/detail` | Customer detail | HTML |
| `POST /customer/search` | Search customers | HTML |
| `POST /customer/get` | Get customer | HTML |
| `POST /customer/profile` | Customer profile | 401 Unauthenticated |

---

## Persona IDs (custbase_id)

Personas control which UI/dashboard the user sees in Segwik. Set via `custbase_id` field.

| ID | Persona | PAV Equivalent | Description |
|----|---------|----------------|-------------|
| 1120 | Author | Author | Creates audiobook content; has bio/pen name page |
| 1121 | Publisher | Publisher/Vendor | Business entity that publishes audiobooks |
| 1122 | Listener | Customer | End user who purchases/listens to audiobooks (default for app) |
| 1154 | Narrator | Voice Actor | Performs audiobook narration |
| 1158 | Subpub-author | Sub-publisher Author | Author under a sub-publisher |

**Multiple personas:** A single customer can have multiple personas via the `personas` array field.
Example: An author who also listens to audiobooks would have `personas: [1120, 1122]`.

**Code constant:** Use `PERSONA.LISTENER`, `PERSONA.AUTHOR`, etc. from `segwik-client.js`.

---

## Discovery Scripts

```bash
npm run discover             # Run ALL tests (creates duplicates!)
npm run discover:verify      # Just verify token works
npm run discover:create      # Create a single test customer
npm run discover:lookup      # Test lookup endpoints (no creation)
npm run discover:upsert      # Test upsert behavior (creates duplicate!)
npm run discover:transaction # Test transaction create (needs customer_id arg)
```

Results saved to `scripts/discovery/results/`.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-13 | Initial discovery session. Documented customer API issues. Email sent to Pete. |
| 2026-01-13 | Transaction API tested. `customer_token` = `encrypted_customer_id`. Types: 1=Invoice, 2=Project, 3=Opportunity. |
| 2026-01-14 | Shriniwas provided `email_json`/`phone_json` fields. Phone lookup, upsert, and list now work correctly. |
