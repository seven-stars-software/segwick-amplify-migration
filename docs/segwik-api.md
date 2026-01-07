# Segwik API Notes

Documentation of Segwik API endpoints and patterns discovered during migration.

---

## Status

| Item | Value |
|------|-------|
| **Contact** | Pete Romano (Segwik) |
| **Swagger Docs** | Link broken; requested refresh |
| **API Stability** | In flux - Segwik developing new features for PAV |

**Note:** Segwik is actively building features to support Pro Audio Voices. API may change. Document behavior as discovered and design scripts defensively.

---

## Base Configuration

```
Base URL: https://api.segwik.com/api/v2
Auth: API key passed in request body as `token`
```

---

## Known Endpoints

### POST /customer/profile

Create or update a customer profile.

**Request:**
```json
{
    "token": "API_KEY",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "custbase_id": 1122,
    "account_id": 6351,
    "user_id": 6352,
    "lead_from": "zapier"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | API key |
| `firstname` | string | Yes | First name |
| `lastname` | string | Yes | Last name |
| `email` | string | Yes | Email address |
| `custbase_id` | number | Yes | Persona ID (see below) |
| `account_id` | number | ? | Staff user that owns customer |
| `user_id` | number | ? | Associated user ID |
| `lead_from` | string | ? | Lead source tracking |

**Response:** TBD

---

## Persona IDs (custbase_id)

| ID | Persona | Description |
|----|---------|-------------|
| 1120 | Author | |
| 1121 | Publisher | |
| 1122 | Listener | Default for app users |
| 1154 | Narrator | |
| 1158 | Subpub-author | |

**Note:** A customer can have multiple personas via the `personas` array field.

---

## CMS Pages

After creating a customer, a CMS page may need to be created for author bio/pen name.

**Endpoint:** TBD
**Fields:** TBD

---

## Endpoints to Discover

**Critical for Idempotency:**
- [ ] Get customer by email (lookup before insert)
- [ ] Get product by ISBN/SKU (lookup before insert)
- [ ] Upsert operations (if supported natively)
- [ ] Update existing customer by ID
- [ ] Update existing product by ID

**Core Functionality:**
- [ ] User authentication (login)
- [ ] Get customer by ID
- [ ] List customers (with pagination)
- [ ] Products/catalog CRUD
- [ ] Ownership/entitlement management
- [ ] CMS page CRUD

**User ↔ Vendor Relationship:**
- [ ] How is the many-to-many relationship modeled?
- [ ] Endpoint to associate user with vendor
- [ ] Endpoint to list user's vendors / vendor's users

---

## Rate Limits

TBD - need to test with bulk operations

---

## Error Handling

TBD - document error response format

---

## Testing Notes

*Add notes from API experimentation here*
