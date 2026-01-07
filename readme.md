# Pro Audio Voices Migration to Segwik

Migration scripts and documentation for moving Pro Audio Voices from WordPress/WooCommerce to Segwik CRM.

## Quick Links

- **[Migration Roadmap](MIGRATION_ROADMAP.md)** - Full 8-phase plan
- **[Domain Glossary](docs/domain-glossary.md)** - Terminology Rosetta Stone (WC ↔ PAV ↔ Segwik)
- **[Data Mapping](docs/data-mapping.md)** - Field-level WP/WC → Segwik mapping
- **[Segwik API Notes](docs/segwik-api.md)** - API documentation and patterns

## Current Status

**Phase:** 1 - Discovery & API Mapping

## Directory Structure

```
├── docs/           # Documentation
├── scripts/
│   ├── export/     # WP/WC → JSON
│   ├── transform/  # JSON → Segwik format
│   ├── import/     # → Segwik
│   ├── validate/   # Comparison scripts
│   └── sync/       # Parallel running sync
├── data/
│   ├── exports/    # Raw WP/WC exports
│   ├── transformed/# Segwik-formatted data
│   └── id-mappings/# WP ID → Segwik ID
└── logs/           # Import/sync logs
```

## Setup

```bash
npm install
cp .env.example .env  # Add API credentials
```

## Related Repos

- **amplify-react-native** - Mobile app (will not change during migration)
- **amplify-backend** - API gateway (will be updated in Phase 5)
