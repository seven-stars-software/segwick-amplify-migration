# Segwik Migration Roadmap

Migration of Pro Audio Voices from WordPress/WooCommerce to Segwik CRM.

**Strategy:** Gradual cutover with parallel systems during transition

**Scope:** Full backend replacement (amplify-backend → Segwik)

## Key Design Principle: Idempotent Scripts

All migration and sync scripts must be **idempotent** - safe to run repeatedly without creating duplicates. This enables:

- Running scripts on-demand to refresh Segwik data
- Recovering from partial failures without manual cleanup
- Keeping systems in sync during the parallel running period
- Confidence to re-run if API changes require script updates

### Idempotency Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **Lookup-before-insert** | Users, products | Check by email/ISBN before creating |
| **Upsert by unique key** | If Segwik supports | Use API's native upsert if available |
| **Local ID mapping** | All entities | Track WP_ID → Segwik_ID in JSON files |
| **Hash-based change detection** | Incremental sync | Only update if source data changed |

### ID Mapping Files

```
data/id-mappings/
├── users.json        # { "wp_123": "segwik_456", ... }
├── products.json     # { "wp_789": "segwik_012", ... }
└── vendors.json      # { "wp_345": "segwik_678", ... }
```

Before inserting, scripts check the mapping file. If a mapping exists, update instead of insert.

---

## Phase 1: Discovery & API Mapping

### 1.1 Segwik API Documentation
- [ ] Catalog all available Segwik API endpoints
- [ ] Document authentication mechanism (API key, OAuth, etc.)
- [ ] Identify rate limits and bulk operation capabilities
- [ ] Document error handling patterns

### 1.2 Data Model Mapping
Map WordPress/WooCommerce entities to Segwik equivalents:

| WP/WC Entity | Segwik Equivalent | Notes |
|--------------|-------------------|-------|
| WP User (listener) | Customer (persona 1122) | Basic user account |
| WP User (author) | Customer (persona 1120) | + CMS Page for bio |
| WP User (publisher) | Customer (persona 1121) | |
| WP User (narrator) | Customer (persona 1154) | |
| WC Product | ? | Audiobook catalog |
| WC Order | ? | Purchase/ownership records |
| WC Product Vendor | ? | Publisher storefronts |
| User addresses | Customer profile fields | Billing/shipping |

### 1.3 Gap Analysis
- [ ] Identify WP/WC data with no Segwik equivalent
- [ ] Identify Segwik fields with no WP/WC source
- [ ] Document transformation rules needed
- [ ] Plan for data that cannot be migrated

**Deliverable:** `docs/data-mapping.md` with complete field-level mapping

---

## Phase 2: Export Scripts (WP/WC → JSON)

### 2.1 User Export
```
scripts/export/
├── export-users.js        # All WP users with roles
├── export-usermeta.js     # Extended profile data
└── export-vendors.js      # WC Product Vendor data
```

**Data to extract:**
- User ID, email, username, display name
- first_name, last_name, nickname
- billing_* fields (address, phone, email)
- shipping_* fields
- Social links (twitter, facebook, etc.)
- User role/capabilities
- Vendor associations

### 2.2 Product Export
```
scripts/export/
├── export-products.js     # All audiobook products
└── export-product-meta.js # ACF/custom fields
```

**Data to extract:**
- Product ID, name, slug, permalink
- Images (URLs)
- Custom meta: author_first_name, author_last_name, length_duration, release_date, asin_isbn
- Categories, tags
- Featured/on_sale status
- Vendor (publisher) association

### 2.3 Order Export
```
scripts/export/
└── export-orders.js       # Purchase history
```

**Data to extract:**
- Order ID, customer_id, status, date
- Line items (product_id, quantity)
- This establishes user → audiobook ownership

**Deliverable:** JSON exports in `data/exports/` directory

---

## Phase 3: Transform Scripts (JSON → Segwik Format)

### 3.1 User Transformation
```
scripts/transform/
├── transform-users.js     # Map users to Segwik customers
├── assign-personas.js     # Determine persona(s) per user
└── generate-cms-pages.js  # Author bio pages
```

**Transformation rules:**
- Map WP role → Segwik persona ID
- Combine first_name + last_name
- Format addresses to Segwik structure
- Generate CMS page payloads for authors/publishers

### 3.2 Product Transformation
```
scripts/transform/
└── transform-products.js  # Map to Segwik product format
```

### 3.3 Ownership Transformation
```
scripts/transform/
└── transform-ownership.js # Orders → Segwik ownership records
```

**Deliverable:** Segwik-formatted JSON in `data/transformed/`

---

## Phase 4: Import Scripts (→ Segwik)

### 4.1 Import Infrastructure
```
scripts/import/
├── segwik-client.js       # API wrapper with retry logic
├── import-runner.js       # Orchestrates imports with logging
├── id-mapper.js           # Read/write ID mapping files
└── hash-tracker.js        # Track source data hashes for change detection
```

### 4.2 Import Scripts
```
scripts/import/
├── import-customers.js    # Users with personas
├── import-cms-pages.js    # Author/publisher pages
├── import-products.js     # Audiobook catalog
└── import-ownership.js    # Purchase records
```

### 4.3 Idempotency Implementation

Each import script follows this pattern:

```javascript
async function importCustomer(wpUser) {
    const existingSegwikId = idMapper.get('users', wpUser.id);

    if (existingSegwikId) {
        // Check if data changed using hash
        if (!hashTracker.hasChanged('users', wpUser.id, wpUser)) {
            log.skip(wpUser.id, 'No changes detected');
            return existingSegwikId;
        }
        // Update existing record
        await segwik.updateCustomer(existingSegwikId, transformedData);
        log.updated(wpUser.id, existingSegwikId);
    } else {
        // Lookup by email in case mapping was lost
        const found = await segwik.findCustomerByEmail(wpUser.email);
        if (found) {
            idMapper.set('users', wpUser.id, found.id);
            log.recovered(wpUser.id, found.id);
            return found.id;
        }
        // Create new record
        const newId = await segwik.createCustomer(transformedData);
        idMapper.set('users', wpUser.id, newId);
        hashTracker.set('users', wpUser.id, wpUser);
        log.created(wpUser.id, newId);
        return newId;
    }
}
```

**Requirements:**
- Idempotent (safe to re-run any number of times)
- Progress logging with skip/create/update/error counts
- Error collection (don't fail on single record)
- ID mapping persistence (survives script restarts)
- Hash tracking for incremental updates

**Deliverable:**
- `data/id-mappings/` directory with mapping files
- `logs/` directory with import logs

---

## Phase 5: Backend API Replacement

### 5.1 Create Segwik Controller
```
amplify-backend/src/controllers/
└── Segwik.ts              # New controller for Segwik API
```

**Methods needed (parallel to existing):**
- `attemptLogin(email, password)` - User authentication
- `getUser(userId)` - Fetch user profile
- `createUser(email, password)` - Registration
- `getUserLibrary(userId)` - Owned audiobooks
- `getProducts(params)` - Catalog queries
- `getUserHomeBooks(userId)` - Home screen data

### 5.2 Update Auth Flow
```
amplify-backend/src/
├── controllers/Segwik.ts  # Auth against Segwik
├── middleware/Auth.ts     # Update token handling if needed
└── routers/Auth.ts        # May need endpoint changes
```

### 5.3 Update Library Endpoints
```
amplify-backend/src/routers/Library.ts
```
- Switch from WooCommerce.getUserLibrary → Segwik.getUserLibrary
- Maintain S3 integration for audio tracks (unchanged)

### 5.4 Feature Flags
Implement toggles to switch between WP/WC and Segwik:
```typescript
const USE_SEGWIK = process.env.USE_SEGWIK === 'true'

// In each endpoint:
if (USE_SEGWIK) {
    return Segwik.getUserLibrary(userId)
} else {
    return WooCommerce.getUserLibrary(userId)
}
```

**Deliverable:** amplify-backend PR with Segwik integration (feature-flagged)

---

## Phase 6: Validation & Testing

### 6.1 Data Validation Scripts
```
scripts/validate/
├── validate-users.js      # Compare WP users vs Segwik customers
├── validate-products.js   # Compare catalogs
├── validate-ownership.js  # Compare libraries
└── compare-api-responses.js # Side-by-side API comparison
```

### 6.2 Test Scenarios
- [ ] User login with migrated credentials
- [ ] New user registration
- [ ] Library shows correct owned books
- [ ] Home screen shows featured/new releases
- [ ] Audio playback (S3 presigned URLs still work)

### 6.3 Parallel Running Validation
During gradual cutover, compare responses:
```
WP/WC Response  vs  Segwik Response
─────────────────────────────────────
{ library: [...] }    { library: [...] }
```

---

## Phase 7: Gradual Cutover

### 7.1 Cutover Stages

| Stage | Description | Rollback Plan |
|-------|-------------|---------------|
| **Stage 1** | Read-only queries from Segwik (catalog, featured) | Instant: flip env var |
| **Stage 2** | Auth against Segwik (existing users) | Flip env var; passwords in both |
| **Stage 3** | New registrations go to Segwik | Manual sync to WP if rollback |
| **Stage 4** | Purchases recorded in Segwik | Sync orders both directions |
| **Stage 5** | Full cutover, WP/WC read-only | Keep WP running 30 days |

### 7.2 Sync During Transition
During parallel period, keep data synchronized:
```
scripts/sync/
├── sync-new-users.js      # WP → Segwik (until Stage 3)
├── sync-new-orders.js     # WP → Segwik (until Stage 4)
└── sync-segwik-to-wp.js   # Reverse sync for rollback safety
```

### 7.3 Monitoring
- [ ] Set up alerts for API errors
- [ ] Dashboard comparing request success rates
- [ ] Log all discrepancies between systems

---

## Phase 8: Cleanup & Decommission

### 8.1 Post-Cutover Tasks
- [ ] Remove feature flags from amplify-backend
- [ ] Delete WP/WC controller code
- [ ] Update environment variables
- [ ] Archive WP database backup
- [ ] Document final state

### 8.2 WordPress Decommission
- [ ] Take final backup
- [ ] Put in read-only mode
- [ ] Keep running for 30-60 days (emergency reference)
- [ ] Decommission hosting

---

## Directory Structure

```
segwik-amplify-migration/
├── MIGRATION_ROADMAP.md      # This file
├── docs/
│   ├── data-mapping.md       # Field-level mapping
│   ├── segwik-api.md         # API documentation
│   └── decisions.md          # ADRs for key decisions
├── scripts/
│   ├── export/               # WP/WC → JSON
│   ├── transform/            # JSON → Segwik format
│   ├── import/               # → Segwik
│   ├── validate/             # Comparison scripts
│   └── sync/                 # Parallel running sync
├── data/
│   ├── exports/              # Raw WP/WC exports
│   ├── transformed/          # Segwik-formatted data
│   └── id-mappings/          # WP ID → Segwik ID
└── logs/                     # Import/sync logs
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Password migration | Users can't log in | May require password reset flow |
| Missing Segwik features | Can't replicate functionality | Early gap analysis in Phase 1 |
| Data loss during sync | Users lose purchases | Bi-directional sync during transition |
| S3 integration breaks | No audio playback | S3 unchanged; test early |
| Segwik rate limits | Import fails | Implement backoff/batching |
| API changes mid-migration | Scripts break | Idempotent design; re-run after fixes |
| Sparse documentation | Slow development | Document as we discover; stay close to Pete |
| User-vendor many-to-many | Complex data model | Wait for Segwik's solution; adapt as needed |

---

## Segwik API Context

**Contact:** Pete Romano (Segwik)

**API Status:**
- Documentation was available via Swagger; link currently broken (requested refresh)
- Segwik is actively developing new features specifically for Pro Audio Voices
- API may change as development continues
- Documentation is sparse or non-existent for some features

**Known Complexities:**
- User ↔ Vendor relationship is many-to-many
- Segwik team implementing workarounds to support this model
- May need to adapt scripts as API evolves

**Mitigation:**
- Design scripts to be resilient to API changes
- Document discovered API behavior in `docs/segwik-api.md`
- Keep close communication with Pete for API updates
- Use defensive coding (graceful handling of unexpected responses)

---

## Open Questions

1. **Password Migration:** Does Segwik support importing password hashes, or will users need to reset?
2. **Vendor/Publisher Model:** How does Segwik handle the many-to-many user ↔ vendor relationship?
3. **Order History:** Does Segwik have an "order" concept or just ownership flags?
4. **Webhooks:** Does Segwik support webhooks for real-time sync?
5. **Catalog Management:** Will audiobook metadata live in Segwik or remain in a separate system?
6. **Lookup Endpoints:** Can we query customers by email, products by ISBN? (Required for idempotency)
7. **Upsert Support:** Does the API support upsert operations natively?

---

## Next Steps

### Segwik
1. Follow up with Pete Romano on Swagger docs link
2. Schedule kickoff with Segwik to clarify data model questions (see Open Questions)
3. Get API credentials and documentation access

### PAV Discovery
4. Schedule discovery session with Emily/Becky to document:
   - Audiobook upload/creation workflow
   - Author and publisher onboarding
   - Sales/promotions configuration
   - Which admin tasks are self-serve vs PAV-managed
   - See `docs/domain-glossary.md` for full question list

### Technical
5. Begin Phase 1.1 - API documentation audit
6. Export sample data to understand edge cases
7. Review `docs/domain-glossary.md` and validate terminology with stakeholders
