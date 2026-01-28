# Pro Audio Voices Migration to Segwik

Migration scripts and documentation for moving Pro Audio Voices from WordPress/WooCommerce to Segwik CRM.

## Quick Links

- **[Migration Roadmap](MIGRATION_ROADMAP.md)** - Full 8-phase plan
- **[Domain Glossary](docs/domain-glossary.md)** - Terminology Rosetta Stone (WC ↔ PAV ↔ Segwik)
- **[Data Mapping](docs/data-mapping.md)** - Field-level WP/WC → Segwik mapping
- **[Segwik API Notes](docs/segwik-api.md)** - API documentation and patterns

## Current Status

**Phase:** 2 - Customer & Author Migration

- ✅ API discovery complete
- ✅ Customer migration pipeline working
- ✅ Special authors batch (11) migrated with pen names
- 🔄 Remaining author migrations pending

## Directory Structure

```
├── docs/                       # Documentation
├── src/
│   ├── segwik-client.js        # Core Segwik API client
│   ├── migrate-customers.js    # Main orchestrator (export → transform → import)
│   ├── wp-wc-export/           # Export from WordPress/WooCommerce
│   ├── wc-wp-to-segwik/        # Transform to Segwik format
│   ├── segwik-import/          # Import to Segwik API
│   └── discovery-and-testing/  # One-off scripts, API exploration
└── data/
    ├── cache/                  # API response cache (24h TTL)
    ├── wp-wc-exports/          # Raw WP/WC exports
    ├── transform-tests/        # Segwik-formatted test data
    ├── import-tests/           # Import result logs
    └── one-off-migration-tests/# Migration result logs
```

## Setup

```bash
npm install
cp .env.example .env  # Add API credentials
```

## NPM Scripts

```bash
# Main migration pipeline
npm run migrate:customers           # Full pipeline: export → transform → import
npm run migrate:customers -- --dry-run  # Preview without importing

# Individual steps
npm run export:customers            # Export WC customers to JSON
npm run transform <file.json>       # Transform to Segwik format
npm run import:customers <file.json> # Import to Segwik

# API exploration
npm run discover                    # Run all API tests
npm run scratchpad                  # Quick ad-hoc testing
```

## Related Repos

- **[amplify-react-native](https://github.com/seven-stars-software/amplify-audiobooks-react-native)** - Mobile app (will not change during migration)
- **[amplify-backend](https://github.com/seven-stars-software/amplify-backend)** - API gateway (will be updated in Phase 5)
