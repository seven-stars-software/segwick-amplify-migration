# Migration Status

**Project:** Pro Audio Voices → Segwik CRM Migration

This document tracks migration progress by data entity, not by phase. The actual work happens iteratively as we discover API capabilities and coordinate with Segwik devs and PAV staff.

---

## Entity Status Overview

| Entity | WP/WC Source | Segwik Target | API Discovery | Data Migrated |
|--------|--------------|---------------|---------------|---------------|
| **Customers (Listeners)** | WP Users (role: subscriber/customer) | Customer (persona 1122) | ✅ Complete | 🔄 Pipeline ready |
| **Customers (Authors)** | WP Users (role: wc_product_vendors_admin_vendor) | Customer (persona 1120) | ✅ Complete | ✅ 11 migrated |
| **Pen Names** | Product ACF metadata | CMS Page (type: pen) | ✅ Complete | ✅ 11 created |
| **Products (Audiobooks)** | WC Products + ACF | Product | 🔄 Partial | ❌ Not started |
| **Orders/Ownership** | WC Orders | Transaction? | ❌ Not started | ❌ Not started |
| **Vendors/Publishers** | WC Product Vendors | Customer (persona 1121) | 🔄 Partial | ❌ Not started |

**Legend:** ✅ Complete | 🔄 In Progress | ❌ Not Started

---

## Customers

### Listeners (Persona 1122)
Regular app users who purchase and listen to audiobooks.

| Field | WP/WC Source | Segwik Field | Notes |
|-------|--------------|--------------|-------|
| Email | `user.email` or `billing.email` | `email`, `email_json[]` | Primary identifier |
| Name | `first_name`, `last_name` | `firstname`, `lastname` | Prefer billing if available |
| Phone | `billing.phone` | `phone_json[]` | Optional |
| Address | `billing.*` | `address_json[]` | Optional |
| Role | WP role | `custbase_id: 1122` | Listener persona |

**Status:** Pipeline complete (`npm run migrate:customers`). Ready for bulk migration.

**Required fields for all customers:**
- `cust_type: 84`
- `creation_method: 'synced_via_wordpress'`
- `lead_from: 'segwik2 contact detail'` (workaround to allow field editing)

### Authors (Persona 1120)
Content creators with products in the catalog.

| Field | WP/WC Source | Segwik Field | Notes |
|-------|--------------|--------------|-------|
| Email | WC vendor email or resolved WP user | `email` | May need PAV help to resolve |
| Name | Real person name | `firstname`, `lastname` | Not pen name |
| Role | `wc_product_vendors_admin_vendor` | `custbase_id: 1120` | Author persona |

**Status:** 11 special authors migrated. 79 "orphan authors" identified (exist in product ACF but no WP user account).

**Open:** Need email addresses from PAV for orphan authors.

---

## Pen Names

Authors can publish under aliases. Products link to pen names, not directly to customers.

| Field | WP/WC Source | Segwik Field | Notes |
|-------|--------------|--------------|-------|
| First Name | `acf.author_first_name` | `json_content.custom_fields.pen_name_first_name` | |
| Last Name | `acf.author_last_name` | `json_content.custom_fields.pen_name_last_name` | |
| Full Name | `acf.author_full_name` | `page_title` | Display name |
| Bio | `acf.author_bio` | TBD | Not yet mapped |
| Owner | Resolved customer | `customer_id` | Links pen name to real person |

**API:** `POST /content/save` with `page_type: 'pen'`, `template_id: 1216979`

**Status:** 11 pen names created for special authors batch.

---

## Products (Audiobooks)

| Field | WP/WC Source | Segwik Field | Notes |
|-------|--------------|--------------|-------|
| Title | `product.name` | TBD | |
| ISBN | `acf.asin_isbn` | TBD | |
| Duration | `acf.length_duration` | TBD | |
| Author | `acf.author_full_name` | Link to Pen Name | |
| Cover Image | `product.images[0]` | TBD | |
| Price | `product.price` | TBD | |
| Categories | `product.categories` | TBD | |

**Status:** Export script exists. Segwik product API not yet explored.

---

## Orders / Ownership

How users own audiobooks.

| Field | WP/WC Source | Segwik Field | Notes |
|-------|--------------|--------------|-------|
| Customer | `order.customer_id` | TBD | |
| Product | `order.line_items[].product_id` | TBD | |
| Date | `order.date_created` | TBD | |
| Status | `order.status` | TBD | Only completed orders? |

**Status:** Export script exists. Segwik ownership model not yet explored. May use Transactions API.

---

## Design Principles

### Idempotent Scripts
All migration scripts must be **idempotent** - safe to run repeatedly without creating duplicates. This enables:
- Running scripts on-demand to refresh Segwik data
- Recovering from partial failures without manual cleanup
- Re-running if API changes require script updates

**Patterns:**
| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| Lookup-before-insert | Users, products | Check by email/ISBN before creating |
| Upsert by unique key | If Segwik supports | Use API's native upsert if available |
| Local ID mapping | All entities | Track WP_ID → Segwik_ID if needed |

---

## Key Decisions

### Data Source: ACF over WC Vendor Data
**Decision:** Favor product ACF metadata over WooCommerce vendor account data for author information.

**Rationale:** ACF data is human-entered, intentionally structured, and represents what PAV staff intends. WC vendor accounts are often incomplete or inconsistent.

### Customer Required Fields
**Decision:** All migrated customers must have:
```javascript
{
  cust_type: 84,
  creation_method: 'synced_via_wordpress',
  lead_from: 'segwik2 contact detail'
}
```

**Rationale:** `lead_from` workaround allows `cust_type` and `creation_method` to be set properly.

---

## Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `npm run migrate:customers` | Full pipeline: export → transform → import | ✅ Working |
| `npm run export:customers` | Export WC customers to JSON | ✅ Working |
| `npm run export:products` | Export WC products to JSON | ✅ Working |
| `npm run export:orders` | Export WC orders to JSON | ✅ Working |
| `src/discovery-and-testing/orphan-authors-check.js` | Find authors without WP accounts | ✅ Working |
| `src/discovery-and-testing/migrate-special-authors.js` | Migrate specific author batch | ✅ Complete |

---

## Contacts

| Person | Role | Topics |
|--------|------|--------|
| Pete Romano | Segwik Dev | API questions, feature requests |
| Emily Busbee | PAV PM | Author info, business rules |
| Becky Geist | PAV Owner | Approvals, account access |
| Elias | PAV Staff | Author lists, data verification |

---

## Open Questions

1. **Products API:** What's the Segwik product creation/update API?
2. **Ownership:** How are purchases recorded in Segwik? Transactions?
3. **Author Bio:** Where does `acf.author_bio` map in Segwik?
4. **Orphan Authors:** Need email addresses for 79 authors who exist only in product metadata
5. **Passwords:** Will users need to reset passwords or can hashes be migrated?

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Password migration | Users can't log in | May require password reset flow |
| Data loss during sync | Users lose purchases | Keep WP running during transition |
| Segwik rate limits | Import fails | Implement backoff/batching |
| API changes mid-migration | Scripts break | Idempotent design; re-run after fixes |
| Sparse documentation | Slow development | Document as we discover; stay close to Pete |
