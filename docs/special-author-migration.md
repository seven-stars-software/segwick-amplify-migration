# Special Author Migration

**Created:** 2026-01-28
**Source:** List from Elias (PAV employee)
**Purpose:** Track migration of selected authors from WooCommerce to Segwik

---

## Data Source Decision

**Favor ACF product metadata over WooCommerce vendor account data.**

### Rationale

Some authors exist only as metadata on products (entered via ACF fields) without a corresponding WC vendor account. Even for authors with vendor accounts, the ACF data is:

1. **Intentionally structured** - separate `author_first_name`, `author_last_name`, `author_full_name`, `author_bio` fields
2. **Human-entered** - represents what PAV staff intends the author to be called
3. **Consistent** - follows a template vs. ad-hoc WC account creation
4. **Complete** - includes bio, whereas WC accounts often have empty fields

### Data Flow

```
Source of Truth: Product ACF Fields
├── pen_name_first_name  ←  acf.author_first_name
├── pen_name_last_name   ←  acf.author_last_name
└── author_bio           ←  acf.author_bio

Segwik Customer Linkage:
├── If WC vendor account exists  →  Link pen name to migrated customer
└── If no WC account             →  Create new Segwik customer (need email from PAV)
```

### WC Product ACF Structure

```json
{
  "acf": {
    "author_first_name": "Once Upon",
    "author_last_name": "a Dance",
    "author_full_name": "Once Upon a Dance",
    "author_bio": "...",
    "asin_isbn": "978-1-234567-89-0",
    "length_duration": "00 hrs 43 min",
    "co-author": ""
  }
}
```

---

## Summary

| # | Requested Name | WC Status | WC ID | Segwik Status | Pen Name Created |
|---|----------------|-----------|-------|---------------|------------------|
| 1 | Once Upon a Dance | WP user (Terrel Lefferts) | WP#1274 | Pending | - |
| 2 | Kelly Anne Manuel | Vendor | 1373 | Pending | - |
| 3 | Sheldon Collins | Vendor | 3259 | Pending | - |
| 4 | Dee Knight | Vendor | 3137 | Pending | - |
| 5 | Dan Flanigan | WP user (Meghan Flanigan) | WP#2928 | Pending | - |
| 6 | Jessica Beebe | Vendor | 3333 | Pending | - |
| 7 | Joseph Durette | Vendor | 1271 | Pending | - |
| 8 | Jacqui Burnett | Vendor | 1927 | Pending | - |
| 9 | Donna Griffit | Vendor | 1273 | Pending | - |
| 10 | Parkinson's Foundation | Vendor | 1385 | Pending | - |
| 11 | Cheryl Melody Baskin | Vendor | 1971 | Pending | - |

---

## Authors with WC Vendor Accounts (9)

These users exist as WooCommerce Product Vendors and can be migrated directly.

### 1. Sheldon Collins
- **WC ID:** 3259
- **WC Name:** SHELDON COLLINS
- **Email:** storybycollins@gmail.com
- **Pen Name:** Sheldon Collins

### 2. Dee Knight
- **WC ID:** 3137
- **WC Name:** Dee Knight
- **Email:** deeknight816@gmail.com
- **Pen Name:** Dee Knight

### 3. Jessica Beebe
- **WC ID:** 3333
- **WC Name:** Jessica Beebe
- **Email:** jess.beebe@yahoo.com
- **Pen Name:** Jessica Beebe

### 4. Jacqui Burnett
- **WC ID:** 1927
- **WC Name:** Jacqui Burnett
- **Email:** jacqui@jacquiburnett.com
- **Pen Name:** Jacqui Burnett

### 5. Donna Griffit
- **WC ID:** 1273
- **WC Name:** Donna Griffit
- **Email:** donna@donnagriffit.com
- **Pen Name:** Donna Griffit

### 6. Parkinson's Foundation
- **WC ID:** 1385
- **WC Name:** Parkinson's Foundation
- **Email:** publications@parkinson.org
- **Pen Name:** Parkinson's Foundation
- **Note:** Good case study for non-profit author

### 7. Cheryl Melody Baskin
- **WC ID:** 1971
- **WC Name:** Cheryl Melody Baskin
- **Email:** chermelody@aol.com
- **Pen Name:** Cheryl Melody Baskin

### 8. Kelly Anne Manuel
- **WC ID:** 1373
- **WC Name:** Kelly Manuel
- **Email:** kellyannetheresa@icloud.com
- **ACF Data:** Products show "Kelly Anne Manuel" (first: "Kelly Anne", last: "Manuel")
- **Pen Name:** Kelly Anne Manuel (per ACF data)

### 9. Joseph Durette
- **WC ID:** 1271
- **WC Name:** Joseph Durette
- **Email:** wenjoe@cox.net
- **ACF Data:** Anthology products show "Joseph Durette"
- **Pen Name:** Joseph Durette (per ACF data)

---

## Authors in Product Metadata Only (2)

These names appear as author metadata on products but do NOT have WooCommerce vendor accounts.

### 10. Once Upon a Dance
- **WC Vendor Account:** None
- **Found in:** Product #10451 "Frankie's Wish: A Wander in the Wonder"
- **Product Meta:**
  - `author_first_name`: "Once Upon"
  - `author_last_name`: "a Dance"
  - `author_full_name`: "Once Upon a Dance"
  - `author_bio`: "Once Upon a Dance inspires children to move, breathe & connect. By weaving dance into whimsical stories, this mother-daughter duo sparks imagination and unleashes self-expression. Visit DanceStories.com to learn more."
- **RESOLVED:** Real person is **Terrel Lefferts**
  - WP User ID: 1274
  - Email: terreld@msn.com
  - No WC customer record (WP user only)
- **Pen Name:** Once Upon a Dance
- **Action:** Create Segwik customer for Terrel Lefferts, then create pen name "Once Upon a Dance"

### 11. Dan Flanigan
- **WC Vendor Account:** None
- **Found in:** Products #12872 "On Lonesome Roads", #12869 "Mink Eyes"
- **Product Meta:**
  - `author_first_name`: "Dan"
  - `author_last_name`: "Flanigan"
  - `author_full_name`: "Dan Flanigan"
  - `author_bio`: "Dan Flanigan is a novelist, poet, playwright, and practicing lawyer. He has published four books in a detective series (Mink Eyes, The Big Tilt, On Lonesome Roads, An American Tragedy)..."
- **RESOLVED:** Uses daughter **Meghan Flanigan's** account
  - WP User ID: 2928
  - Email: mgflanigan@icloud.com
  - No WC customer record (WP user only)
  - Meghan manages all of Dan's accounts
  - Also associated with "Arjuna Media Arts" (connection TBD)
- **Pen Name:** Dan Flanigan
- **Action:** Create Segwik customer for Meghan Flanigan, then create pen name "Dan Flanigan"

---

## Open Questions for PAV Team

1. ~~**Kelly Manuel**~~ - **RESOLVED:** ACF product data shows "Kelly Anne Manuel"

2. ~~**Joseph Durette**~~ - **RESOLVED:** ACF product data shows "Joseph Durette"

3. ~~**Once Upon a Dance**~~ - **RESOLVED:** Link to Terrel Lefferts (terreld@msn.com)

4. ~~**Dan Flanigan**~~ - **RESOLVED:** Link to Meghan Flanigan (mgflanigan@icloud.com)

5. **Arjuna Media Arts** - What is Dan Flanigan's connection to this? (FYI only, may not affect migration)

---

## Migration Progress Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-28 | Initial research | Identified 9 WC vendors + 2 product-meta-only authors |
| 2026-01-28 | Data source decision | Favor ACF product metadata over WC vendor data |
| 2026-01-28 | WP/WC search | Confirmed Once Upon a Dance & Dan Flanigan have no WC vendor accounts |
| 2026-01-28 | PAV call update | Once Upon a Dance = Terrel Lefferts (WP#1274, terreld@msn.com) |
| 2026-01-28 | PAV call update | Dan Flanigan uses Meghan Flanigan's account (WP#2928, mgflanigan@icloud.com) |
| 2026-01-28 | ACF data review | Resolved pen name spellings using product ACF data (Kelly Anne Manuel, Joseph Durette) |
| 2026-01-28 | Orphan authors report | Created script to find authors in product ACF without WP accounts (79 orphans found) |

---

## Next Steps

1. [x] ~~Confirm pen name spellings with PAV team~~ - Using ACF product data as source of truth
2. [x] ~~Resolve Once Upon a Dance and Dan Flanigan~~ - Both linked to WP user accounts
3. [ ] Create/verify Segwik customers for each author
4. [ ] Create pen names in Segwik
5. [ ] Update this tracking document with Segwik IDs
