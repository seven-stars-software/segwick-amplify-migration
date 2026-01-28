# Data Mapping: WP/WooCommerce → Segwik

Field-level mapping between source and target systems.

---

## Users / Customers

### WordPress User → Segwik Customer

| WP Field | Segwik Field | Transform | Notes |
|----------|--------------|-----------|-------|
| `user_id` | - | Generate new | Store mapping in id-mappings/ |
| `user_email` | `email` | Direct | |
| `user_login` | - | Not migrated? | Segwik may use email as login |
| `display_name` | - | Split to first/last? | |

### WordPress Usermeta → Segwik Customer Profile

| WP Meta Key | Segwik Field | Transform | Notes |
|-------------|--------------|-----------|-------|
| `first_name` | `firstname` | Direct | |
| `last_name` | `lastname` | Direct | |
| `nickname` | - | TBD | |
| `description` | CMS Page content | For authors | |
| `billing_first_name` | ? | TBD | |
| `billing_last_name` | ? | TBD | |
| `billing_address_1` | ? | TBD | |
| `billing_address_2` | ? | TBD | |
| `billing_city` | ? | TBD | |
| `billing_state` | ? | TBD | |
| `billing_postcode` | ? | TBD | |
| `billing_country` | ? | TBD | |
| `billing_phone` | ? | TBD | |
| `billing_email` | ? | TBD | |
| `twitter` | ? | TBD | |
| `facebook` | ? | TBD | |

### User Role → Segwik Persona

The WordPress site uses the **WooCommerce Product Vendors** plugin to manage authors and publishers. Role names were discovered by querying the WC REST API with an invalid role, which returned the full list of valid roles in the error response.

#### Role Counts (as of 2026-01-16)

| WP Role | Count | Segwik Persona | custbase_id |
|---------|-------|----------------|-------------|
| `subscriber` | 1,718 | Listener | 1122 |
| `customer` | 919 | Listener | 1122 |
| `wc_product_vendors_admin_vendor` | 130 | Author | 1120 |
| `wc_product_vendors_manager_vendor` | 5 | Publisher | 1121 |
| `administrator` | 12 | Skip (internal) | - |

#### Role Mapping Logic

```javascript
function getPersonaFromRole(role) {
    switch (role) {
        case 'wc_product_vendors_admin_vendor':
            return PERSONA.AUTHOR;        // 1120
        case 'wc_product_vendors_manager_vendor':
            return PERSONA.PUBLISHER;     // 1121
        case 'subscriber':
        case 'customer':
        default:
            return PERSONA.LISTENER;      // 1122
    }
}
```

#### Notes

- **Total users**: ~2,784 (excluding administrators)
- **Listeners** (subscriber + customer): ~2,637 users
- **Authors** (wc_product_vendors_admin_vendor): 130 users
- **Publishers** (wc_product_vendors_manager_vendor): 5 users
- Users may have multiple personas in Segwik, but `custbase_id` cannot be changed after creation
- Other vendor roles exist (`wc_product_vendors_pending_vendor`, `wc_product_vendors_vendor_author`) but have 0 users

---

## Products / Audiobooks

### WooCommerce Product → Segwik ?

| WC Field | Segwik Field | Transform | Notes |
|----------|--------------|-----------|-------|
| `id` | - | Generate new | Store mapping |
| `name` | ? | TBD | |
| `slug` | ? | TBD | |
| `permalink` | ? | TBD | |
| `images[].src` | ? | TBD | May need to re-upload |
| `date_created` | ? | TBD | |
| `featured` | ? | TBD | |
| `on_sale` | ? | TBD | |
| `categories` | ? | TBD | |
| `tags` | ? | TBD | |

### WooCommerce Product Meta → Segwik ?

| WC Meta Key | Segwik Field | Transform | Notes |
|-------------|--------------|-----------|-------|
| `author_first_name` | ? | TBD | |
| `author_last_name` | ? | TBD | |
| `length_duration` | ? | TBD | |
| `release_date` | ? | TBD | |
| `asin_isbn` | ? | TBD | Critical: links to S3 audio |

---

## Orders / Ownership

### WooCommerce Order → Segwik ?

| WC Field | Segwik Field | Transform | Notes |
|----------|--------------|-----------|-------|
| `id` | - | ? | |
| `customer` | ? | Map via user ID | |
| `status` | ? | Only completed? | |
| `date_created` | ? | TBD | |
| `line_items[].product_id` | ? | Map via product ID | |

**Question:** Does Segwik have an "order" concept or just flags for ownership?

---

## Vendors / Publishers

### WC Product Vendor → Segwik ?

| WC Field | Segwik Field | Transform | Notes |
|----------|--------------|-----------|-------|
| Vendor name | ? | TBD | |
| Vendor admins | Customer with Publisher persona | | |
| Assigned products | ? | TBD | |

---

## Data Not Migrated

These WP/WC fields will **not** be migrated:

| Field | Reason |
|-------|--------|
| `m65h6_capabilities` | WP-specific |
| `m65h6_user_level` | WP-specific |
| `dismissed_wp_pointers` | WP UI state |
| `wpseo_*` | SEO plugin data |
| `_woocommerce_persistent_cart` | Session data |
| Various `closedpostboxes_*` | WP admin UI state |

---

## Questions for Segwik

1. What is the customer profile schema? Full field list?
2. How are products/catalog items represented?
3. Is there an order/transaction history, or just ownership records?
4. How do we associate products with publishers?
5. What's the CMS Page schema for author bios?
6. Can we import password hashes, or must users reset?
