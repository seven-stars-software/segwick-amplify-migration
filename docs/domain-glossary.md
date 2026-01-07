# Domain Glossary: Terminology Rosetta Stone

This document establishes a **canonical vocabulary** for the migration project, mapping terms across three domains:

- **WooCommerce (WC)** - Current technical implementation
- **Pro Audio Voices (PAV)** - Business/industry terminology
- **Segwik** - Target CRM system

When in doubt, use the **Canonical Term** in project discussions and documentation.

---

## Entities

### People / Accounts

| Canonical Term | WooCommerce | PAV Business Term | Segwik | Notes |
|----------------|-------------|-------------------|--------|-------|
| **Listener** | Customer (role: subscriber) | Listener, Customer | Customer (persona: 1122) | End user who purchases/listens to audiobooks |
| **Author** | Vendor Admin (role: vendor_admin) | Author | Customer (persona: 1120) + CMS Page | Creates audiobook content; has bio/pen name |
| **Publisher** | Vendor | Publisher | Customer (persona: 1121) | Business entity that publishes audiobooks |
| **Narrator** | ? | Narrator, Voice Actor | Customer (persona: 1154) | Performs audiobook narration |
| **Staff** | WP Admin | PAV Team | Account? User? | Internal PAV employees |

**Complexity:** A single person can be multiple things (e.g., an Author who is also a Listener).
- WC: Multiple roles on same user account
- Segwik: Multiple personas on same customer (`personas: [1120, 1122]`)

### Content / Products

| Canonical Term | WooCommerce | PAV Business Term | Segwik | Notes |
|----------------|-------------|-------------------|--------|-------|
| **Audiobook** | Product (category: Audiobook) | Audiobook, Title | ? | A single audiobook title |
| **Track** | - (stored in S3) | Chapter, Track | - | Individual audio file within an audiobook |
| **Sample** | - | Retail Sample | - | Free preview track |
| **ISBN** | Product meta: `asin_isbn` | ISBN | ? | Unique identifier for audiobook |

### Commerce

| Canonical Term | WooCommerce | PAV Business Term | Segwik | Notes |
|----------------|-------------|-------------------|--------|-------|
| **Purchase** | Order | Purchase, Sale | ? | Transaction where listener buys audiobook |
| **Ownership** | Order Line Item | Library item | ? | Listener's right to access an audiobook |
| **Library** | (derived from orders) | Library, My Books | ? | Collection of audiobooks a listener owns |
| **Cart** | Cart | Cart | ? | Pending purchases |
| **Coupon** | Coupon | Discount Code, Promo | ? | Discount mechanism |
| **Sale** | Product on_sale flag | Sale, Promotion | ? | Temporary price reduction |

### Relationships

| Canonical Term | WooCommerce | PAV Business Term | Segwik | Notes |
|----------------|-------------|-------------------|--------|-------|
| **Publishes** | Vendor → Product | Publisher releases Title | ? | Publisher-to-Audiobook relationship |
| **Wrote** | Product meta: author_* | Author wrote Title | ? | Author-to-Audiobook relationship |
| **Narrated** | ? | Narrator performed Title | ? | Narrator-to-Audiobook relationship |
| **Owns** | Customer → Order → Line Item | Listener owns Title | ? | Listener-to-Audiobook ownership |
| **Works With** | Vendor Admin → Vendor | Author works with Publisher | ? | Author-to-Publisher relationship (many-to-many!) |

---

## Key Relationships Diagram

```
                    ┌──────────┐
                    │  AUTHOR  │
                    └────┬─────┘
                         │ wrote
                         ▼
┌───────────┐  publishes  ┌───────────┐  owns   ┌──────────┐
│ PUBLISHER │────────────►│ AUDIOBOOK │◄────────│ LISTENER │
└───────────┘             └─────┬─────┘         └──────────┘
      ▲                         │
      │ works with              │ contains
      │                         ▼
┌─────┴────┐              ┌───────────┐
│  AUTHOR  │              │   TRACK   │
└──────────┘              └───────────┘
                                │
                          (stored in S3)
```

**Many-to-Many Relationships:**
- Author ↔ Publisher (an author can work with multiple publishers; a publisher has multiple authors)
- Author ↔ Audiobook (co-authored books)
- Narrator ↔ Audiobook (full-cast productions have multiple narrators)

---

## Use Cases by Actor

### Listener Use Cases

| Use Case | Current (WC) Implementation | Segwik Implementation |
|----------|----------------------------|----------------------|
| **Browse catalog** | WC Products API (category: Audiobook) | ? |
| **View audiobook details** | WC Product + meta_data | ? |
| **Purchase audiobook** | WC Cart → Checkout → Order | ? |
| **View my library** | Derived from Orders with status=completed | ? |
| **Stream/download audiobook** | S3 presigned URLs (via amplify-backend) | S3 unchanged |
| **Track playback progress** | WP usermeta (via app) | ? |
| **Create account** | WP User registration | ? |
| **Login** | WP JWT auth | ? |
| **Reset password** | WP password reset | ? |

### Author Use Cases

| Use Case | Current (WC) Implementation | Segwik Implementation |
|----------|----------------------------|----------------------|
| **View my titles** | Vendor dashboard → Products | ? |
| **View sales reports** | Vendor dashboard → Reports | ? |
| **Update bio/profile** | WP User profile + Vendor profile | CMS Page? |
| **Upload new audiobook** | ? (not in app scope) | ? |

### Publisher Use Cases

| Use Case | Current (WC) Implementation | Segwik Implementation |
|----------|----------------------------|----------------------|
| **Manage catalog** | Vendor dashboard → Products | ? |
| **Add new audiobook** | WC Product creation + meta fields | ? |
| **Set pricing** | WC Product price fields | ? |
| **Run sales/promotions** | WC Sale price + dates | ? |
| **Manage authors** | Vendor Admin assignments | ? |
| **View sales reports** | Vendor Reports | ? |
| **Manage payouts** | ? | ? |

### PAV Staff Use Cases

| Use Case | Current (WC) Implementation | Segwik Implementation |
|----------|----------------------------|----------------------|
| **Onboard new publisher** | Create Vendor | ? |
| **Onboard new author** | Create User + Vendor Admin role | ? |
| **Manage all products** | WP Admin → Products | ? |
| **Process refunds** | WC Order refund | ? |
| **Customer support** | WP Admin → Users | ? |
| **Generate reports** | WC Reports | ? |
| **Manage coupons** | WC Coupons | ? |

---

## Terminology Conflicts / Confusion Points

| Term | Problem | Resolution |
|------|---------|------------|
| **Customer** | WC: anyone who buys. Segwik: any person in system (even authors) | Use "Listener" for buyers, "Customer" only in Segwik context |
| **Vendor** | WC: the publisher entity. Common usage: could mean any seller | Use "Publisher" in project discussions |
| **Product** | WC: an audiobook. Generic e-commerce term | Use "Audiobook" in project discussions |
| **User** | WC: WordPress user account. Segwik: ? | Specify: "WP User" or "Segwik Customer" |
| **Order** | WC: full purchase transaction. But we mainly care about ownership | Use "Purchase" for transaction, "Ownership" for the result |
| **Persona** | Segwik-specific term for user type | Define clearly; map to WC roles |

---

## Open Questions

### Entities
- [ ] What does Segwik call an "Audiobook"?
- [ ] Is there a separate "Product" vs "Catalog Item" concept in Segwik?
- [ ] How does Segwik model ownership/entitlements?

### Relationships
- [ ] How does Segwik handle Author ↔ Publisher many-to-many?
- [ ] How are Audiobooks associated with Publishers in Segwik?
- [ ] Can an Audiobook have multiple Authors in Segwik?

### Use Cases Not Yet Mapped

**Action Required:** Schedule discovery session with PAV (Emily/Becky) to document:
- [ ] How does audiobook upload/creation work in current WC system?
- [ ] How does author onboarding work today?
- [ ] How does publisher onboarding work today?
- [ ] How are sales/promotions configured?
- [ ] What reports do publishers/authors need access to?
- [ ] Which tasks are self-serve (publisher does it) vs PAV-managed?

**Current Admin Model:** Mix of self-serve (publishers via WC Vendor dashboard) and PAV staff managed.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-06 | Initial draft based on known WC structure |
