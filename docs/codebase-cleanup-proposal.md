# Codebase Cleanup Proposal

**Date:** 2026-01-28
**Purpose:** Review and simplify the migration codebase

---

## Current Directory Structure

```
segwik-amplify-migration/
├── scripts/
│   ├── discovery/
│   │   ├── api-explorer.js      ✅ Active - API testing utility
│   │   ├── scratchpad.js        ✅ Active - Quick tests
│   │   ├── segwik-client.js     ✅ Active - Core Segwik API client
│   │   └── results/             ⚠️  OLD TEST DATA - 15 JSON files from Jan 13-14
│   ├── export/
│   │   ├── export-customers.js  ✅ Active
│   │   ├── export-orders.js     ⚠️  Unused? - defined but not in active workflow
│   │   ├── export-products.js   ⚠️  Unused? - defined but not in active workflow
│   │   └── wc-client.js         ✅ Active - WooCommerce API client
│   ├── import/
│   │   ├── import-customers.js  ✅ Active
│   │   └── user-migration.js    ⚠️  Test script - single user add
│   ├── migration/
│   │   ├── migrate-special-authors.js   ✅ Active
│   │   └── update-special-authors.js    ✅ Active
│   ├── reports/
│   │   └── orphan-authors-report.js     ✅ Active
│   ├── sync/                    ❌ EMPTY - Phase 7 placeholder
│   ├── transform/
│   │   └── wc-to-segwik.js      ✅ Active
│   ├── validate/                ❌ EMPTY - Phase 6 placeholder
│   └── migrate-customers.js     ✅ Active - but at root level (inconsistent)
├── data/
│   ├── cache/                   ✅ Active - 24h API response cache
│   ├── exports/                 ✅ Active - WC data exports
│   ├── id-mappings/             ❌ EMPTY - never implemented
│   ├── import-results/          ✅ Active - import logs
│   ├── migration-results/       ✅ Active - migration logs
│   ├── reports/                 ✅ Active - generated reports
│   └── transformed/             ✅ Active - Segwik-format JSON
└── docs/                        ✅ Active - documentation
```

---

## Cleanup Tasks

### Task 1: Remove Empty Placeholder Directories
**Impact:** Low risk, just removes clutter

| Directory | Why it's empty | Action |
|-----------|---------------|--------|
| `scripts/sync/` | Phase 7 placeholder - gradual cutover sync not yet needed | DELETE |
| `scripts/validate/` | Phase 6 placeholder - validation not yet needed | DELETE |
| `data/id-mappings/` | Documented but never implemented | DELETE |

### Task 2: Remove Old Discovery Test Results
**Impact:** Low risk, historical artifacts

| Directory | Contents | Action |
|-----------|----------|--------|
| `scripts/discovery/results/` | 15 JSON files from Jan 13-14 API exploration | DELETE |

Sample files: `customer-add-test.json`, `customer-lookup-test.json`, etc.
These were one-time API response captures during initial discovery.

### Task 3: Move Orchestration Script (Optional)
**Impact:** Organizational improvement

Currently `migrate-customers.js` sits at `scripts/` root while other scripts are in subdirectories.

| Current | Proposed |
|---------|----------|
| `scripts/migrate-customers.js` | `scripts/orchestration/migrate-customers.js` |

Would also require updating `package.json`:
```json
"migrate:customers": "node --env-file=.env scripts/orchestration/migrate-customers.js"
```

### Task 4: Audit Unused Export Scripts (Optional)
**Impact:** Needs review

These scripts exist but may not be in active use:
- `scripts/export/export-orders.js`
- `scripts/export/export-products.js`

Options:
- Keep them (they work, just not needed yet)
- Remove them (can recreate from git history if needed)
- Leave as-is and document status

---

## Recommended Approach

**Minimal cleanup (low risk):**
- Delete empty directories (Task 1)
- Delete old test results (Task 2)

**Full cleanup:**
- All of the above
- Move orchestration script (Task 3)
- Audit export scripts (Task 4)

---

## What Gets Deleted

### Task 1 + 2 (Minimal)
```
scripts/sync/           (empty directory)
scripts/validate/       (empty directory)
scripts/discovery/results/
  ├── customer-add-test.json
  ├── customer-lookup-test.json
  ├── customer-list-test.json
  ├── customer-signup-test.json
  ├── transaction-test.json
  └── ... (10 more test JSON files)
data/id-mappings/       (empty directory)
```

Total: 3 empty directories + ~15 old test files
