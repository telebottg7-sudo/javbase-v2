# Avdb — Minimalist Video Metadata Browser & GitHub JSON Database

Avdb is a high-performance, minimalist web application and scraper pipeline for searching, organizing, and browsing video metadata. The database is entirely serverless and cloud-portable, persisting all data directly into a GitHub repository (`telebottg7-sudo/Avdb`) as structured, sharded JSON files and fast-lookup indexes.

---

## Non-Negotiable Architecture Rules

1. **GitHub JSON is the Sole Persistent Store**:
   - Zero relational or document databases (no PostgreSQL, SQLite, MongoDB, or Firebase).
   - All state, indexes, and sharded profiles are stored as JSON files on GitHub.
2. **Strict Abstraction**:
   - Scrapers, APIs, and the UI never call the GitHub API directly. All operations pass through the isolated storage layer (`server/storage/githubStorage.ts`).
3. **Deterministic Parsing (No AI)**:
   - Video code detection and metadata extraction use strict regular expressions and DOM heuristics. AI is never used for code detection.
4. **Global Code Uniqueness**:
   - Every normalized code (e.g. `SSIS-001`, `IPX-054`) is globally unique across `database/index/codes.json`. Existing codes are automatically skipped during ingestion.
5. **Unified Architecture for Separate Datasets**:
   - `Actress` and `Studio` entities are distinct datasets that share a symmetric schema, normalization pattern, and frontend explorer UI.
6. **Single Atomic GitHub Commits (Stop Rule)**:
   - Bulk ingestion transactions compile all modified indexes and sharded entity files into an in-memory Git tree, executing **strictly 1 atomic Git commit per bulk operation**. Individual per-video commits are forbidden.
7. **Storage Layer Hardening**:
   - **WriteQueue**: Serialized FIFO mutex preventing concurrent branch update collisions (`409 Conflict`).
   - **StorageCache**: In-memory LRU/TTL cache reducing repeated master index read latency from ~300ms to <0.5ms.
   - **Resilience**: Outbound request timeouts and exponential backoff retries with jitter for HTTP 429 and 5xx errors.

---

## Target GitHub Storage Hierarchy

```
database/
├── index/
│   ├── codes.json         # Global registry of normalized video codes (unique registry)
│   ├── actresses.json     # Master summary index of all actresses and profile paths
│   ├── studios.json       # Master summary index of all studios and profile paths
│   └── videos.json        # Master aggregated index of cataloged videos
├── pstar/
│   ├── a/                 # Sharded by initial lowercase letter
│   │   └── {slug}.json    # Full actress profile, aliases, thumbnail, and video array
│   └── ...
└── studio/
    ├── a/                 # Sharded by initial lowercase letter
    │   └── {slug}.json    # Full studio profile, thumbnail, and video array
    └── ...
```

---

## 12-Step Implementation Lifecycle Summary

| Step | Milestone | Key Architectural Deliverable |
| :--- | :--- | :--- |
| **STEP 1** | Project Foundation | Clean React 19 + TypeScript + Express structure with collapsible responsive sidebar and theme. |
| **STEP 2** | GitHub Storage Foundation | `GitHubStorage` service with atomic file operations, Git Tree batch commits, and path isolation. |
| **STEP 3** | JSON Schema & Indexes | Canonical types, schemas, and validators for `codes.json`, `actresses.json`, `studios.json`, and `videos.json`. |
| **STEP 4** | Video-Code Detector | Deterministic multi-tier code detection engine with uppercase hyphenated normalization (`ABP-123`). |
| **STEP 5** | Actress & Studio System | Reusable entity service with slugification, alphabetical letter sharding, and metadata indexing. |
| **STEP 6** | Post Parser & Ingestion | Normalized video item pipeline linking actress and studio profiles while preserving global code uniqueness. |
| **STEP 7** | Bulk Scraper & Batch Commits | Multi-page universal scraper committing all batch changes in **exactly 1 atomic Git commit** (Stop Rule). |
| **STEP 8** | Search & Lookup Engine | Instant index-driven multi-facet search across codes, actresses, and studios with direct code matching. |
| **STEP 9** | Frontend Catalog Views | Full minimalist UI: Home, Search, Bulk Scraper, Actress, Studio, Code, and Video explorers. |
| **STEP 10** | Caching & Performance | `WriteQueue` zero-collision mutex, in-memory index cache (<0.5ms lookups), timeouts, and retry logic. |
| **STEP 11** | Validation & Maintenance | Diagnostic engine detecting malformed JSON, duplicate codes, orphan files, and atomic ground-truth rebuild. |
| **STEP 12** | Final Cleanup & Verification | Review for dead code, refined configuration, complete test suite verification, and architecture summary. |

---

## REST API Reference

### System & Configuration
- `GET /api/health` — Application health check.
- `GET /api/config/status` — Repository configuration, branch name, and GitHub connectivity status.
- `GET /api/storage/metrics` — Cache hit ratios, write queue metrics, and retry statistics.
- `POST /api/storage/cache/purge` — Invalidate in-memory cache on demand.
- `POST /api/system/step10-performance-test` — Automated Step 10 concurrency, cache, and timeout benchmark suite.

### Search & Catalogs
- `GET /api/search?q={query}&type={all|videos|actresses|studios|codes}&page={n}&limit={n}` — Fast index-driven search.
- `GET /api/codes?search={q}&page={n}&limit={n}` — Browse global code registry.
- `GET /api/actresses?search={q}&letter={a-z}&page={n}&limit={n}` — Browse actress index.
- `GET /api/actresses/:slug` — Retrieve full sharded actress profile.
- `GET /api/studios?search={q}&letter={a-z}&page={n}&limit={n}` — Browse studio index.
- `GET /api/studios/:slug` — Retrieve full sharded studio profile.
- `GET /api/videos?search={q}&page={n}&limit={n}` — Browse aggregated video index.

### Scraper & Ingestion
- `POST /api/scraper/scrape-url` — Deterministic scraper for any Javtiful page (catalog, search, actress, or studio).
- `POST /api/ingest/video` — Ingest a single video post with code deduplication.
- `POST /api/ingest/bulk` — Atomic single-commit batch ingestion pipeline.
- `POST /api/ingest/step7-test-suite` — Automated Step 7 verification test suite.

### Maintenance & Diagnostics
- `GET /api/maintenance/diagnostics` — Comprehensive database diagnostic report (orphans, duplicates, schema errors).
- `POST /api/maintenance/repair` — Auto-repair discovered issues and reconcile index counters.
- `POST /api/maintenance/rebuild-indexes` — Atomically rebuild all 4 master indexes from sharded entity ground truth.
- `POST /api/maintenance/step11-test-suite` — Automated Step 11 validation and maintenance test suite.

---

## Local Development & Production Build

### Environment Setup
Create a `.env` file based on `.env.example`:
```bash
GITHUB_TOKEN=ghp_your_github_personal_access_token
GITHUB_OWNER=telebottg7-sudo
GITHUB_REPO=Avdb
GITHUB_BRANCH=main
DATABASE_ROOT=database
PORT=3000
```

### Commands
```bash
# Start development server with tsx and Vite middleware
npm run dev

# Run TypeScript type check / linter
npm run lint

# Compile production bundle (Vite client + esbuild CommonJS backend)
npm run build

# Start production server
npm run start
```
