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
| 1 | Once Upon a Dance | Product meta only | - | TBD | - |
| 2 | Kelley Anne Manuel | Vendor (as "Kelly Manuel") | 1373 | Pending | - |
| 3 | Sheldon Collins | Vendor | 3259 | Pending | - |
| 4 | Dee Knight | Vendor | 3137 | Pending | - |
| 5 | Dan Flanigan | Product meta only | - | TBD | - |
| 6 | Jessica Beebe | Vendor | 3333 | Pending | - |
| 7 | Joe Durrette | Vendor (as "Joseph Durette") | 1271 | Pending | - |
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

### 8. Kelly Manuel (requested as "Kelley Anne Manuel")
- **WC ID:** 1373
- **WC Name:** Kelly Manuel
- **Email:** kellyannetheresa@icloud.com
- **Pen Name:** TBD - confirm spelling with PAV team
- **Question:** Should pen name be "Kelley Anne Manuel" or "Kelly Manuel"?

### 9. Joseph Durette (requested as "Joe Durrette")
- **WC ID:** 1271
- **WC Name:** Joseph Durette
- **Email:** wenjoe@cox.net
- **Pen Name:** TBD - confirm spelling with PAV team
- **Question:** Should pen name be "Joe Durrette" or "Joseph Durette"?

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
- **Question:** Should we create a Segwik customer for this author? Who is the account owner?

### 11. Dan Flanigan
- **WC Vendor Account:** None
- **Found in:** Products #12872 "On Lonesome Roads", #12869 "Mink Eyes"
- **Product Meta:**
  - `author_first_name`: "Dan"
  - `author_last_name`: "Flanigan"
  - `author_full_name`: "Dan Flanigan"
  - `author_bio`: "Dan Flanigan is a novelist, poet, playwright, and practicing lawyer. He has published four books in a detective series (Mink Eyes, The Big Tilt, On Lonesome Roads, An American Tragedy)..."
- **Question:** Should we create a Segwik customer for this author? What email should be used?

---

## Open Questions for PAV Team

1. **Kelly Manuel** - Should the pen name be "Kelley Anne Manuel" (as requested) or "Kelly Manuel" (as in WC)?

2. **Joseph Durette** - Should the pen name be "Joe Durrette" (as requested) or "Joseph Durette" (as in WC)?

3. **Once Upon a Dance** - No WC vendor account exists. Should we:
   - Create a new Segwik customer? If so, what email/contact info?
   - Skip for now?
   - Link to an existing customer?

4. **Dan Flanigan** - No WC vendor account exists. Should we:
   - Create a new Segwik customer? If so, what email/contact info?
   - Skip for now?
   - Link to an existing customer?

---

## Migration Progress Log

| Date | Action | Notes |
|------|--------|-------|
| 2026-01-28 | Initial research | Identified 9 WC vendors + 2 product-meta-only authors |
| 2026-01-28 | Data source decision | Favor ACF product metadata over WC vendor data |
| 2026-01-28 | WP/WC search | Confirmed Once Upon a Dance & Dan Flanigan have no user accounts |

---

## Next Steps

1. [ ] Confirm pen name spellings with PAV team (Kelly/Kelley, Joseph/Joe)
2. [ ] Decide how to handle Once Upon a Dance and Dan Flanigan
3. [ ] Create/verify Segwik customers for each author
4. [ ] Create pen names in Segwik
5. [ ] Update this tracking document with Segwik IDs
