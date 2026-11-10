# LeadForge — Technical Plan

> Approved on 2026-11-10 (Phase 0). Changes after approval are recorded in [DEVELOPMENT_PROGRESS.md](../DEVELOPMENT_PROGRESS.md).

## Context

LeadForge is a learning-focused lead generation app: search people/companies via Apollo.io, save them as leads in our own Postgres DB, manage them, and show dashboard stats. The real goal is to be able to **design, build, debug and explain a third-party API integration** in an interview without getting stuck. Stack: Next.js (App Router) + Tailwind + shadcn/ui, NestJS, PostgreSQL + Prisma, Apollo REST API.

**Current state (inspected 2026-11-10):**
- Repo `iamzeeshandev/lead-forge` is completely empty: no commits, no branches locally or on the remote.
- Machine: Node 24.18, npm 11.16, pnpm 12.8. Docker 29.6 installed but not running. No local Postgres/psql, no `gh` CLI.
- Latest stable: Next 16.4, React 19.3, Tailwind 4.3, shadcn CLI 4.23, NestJS 12.4, TanStack Query 5.107, TanStack Table 9.3.
- ⚠️ npm's `latest` tag for `prisma` points to **8.0.0-rc.33** (a release candidate) while `@prisma/client` latest is 7.10.1. A plain `npm i prisma` installs mismatched versions → we pin both to **7.10.x**.

**Decisions made during planning:** Docker Compose for Postgres · TanStack Query for data fetching · Folders named `client/` and `server/` · Developer commits, pushes and opens PRs (assistant stages changes and drafts commit/PR text) · The Apollo account uses a non-work email · Apollo phases are hands-on: you do the key parts yourself, with an explain-back check before moving on.

---

## 1. How You'll Learn (applies to every phase, deepest for Apollo)

Every task follows this loop:
1. **Brief:** I answer your 7 questions (what, why, how, internals, alternatives, production pitfalls, senior considerations), tied to LeadForge code. Short, no basics.
2. **You try first:** before I write anything, you do a small exercise: read a doc section, make a raw API call, sketch a type, design a table, or predict what will happen.
3. **Build:** a role marker decides who writes the code:
   - 🧑 **You build.** I give you requirements + **failing unit tests I've written**. You make them pass, then I review like a PR reviewer.
   - 🤝 **Together.** I scaffold and explain line by line; you write the core logic (or the reverse).
   - 🤖 **I build, explained.** Boilerplate/config/UI. I explain each decision; you don't need to type it.
4. **Break it:** we deliberately cause failures (wrong key, 429, timeout, invalid param, duplicate import, missing fields) and trace each one through every layer: Apollo → client → service → controller → HTTP response → UI.
5. **Explain back (gate):** I ask 3–5 interview-style questions. You answer in your own words; I correct gaps. **We don't move to the next task until your answers are solid.**
6. **Notebook:** you write your answers into `docs/learning/apollo-notebook.md` (your words; I only review). It becomes your interview prep document.

| Phase | Mostly | You personally do |
|---|---|---|
| 1 Setup | 🤖 | 🧑 Create a **scoped** Apollo API key yourself, run the access check, read the response headers |
| 2 UI (mock) | 🤖 | 🤝 Design the mock API function signatures (they become the real API contract) |
| **3 Apollo fundamentals** | **🧑 / 🤝** | Doc-reading worksheet, raw calls, response types, error translation, mapper, pagination math (details in §10) |
| 4 Client ↔ API | 🤝 | Query-key design, 429/error UX flow |
| 5 Database & leads | 🤝 | 🧑 Propose the schema first; 🧑 the duplicate-safe import + a concurrency experiment |
| **6 Company search** | **🧑 solo** | You build it alone following the Phase 3 pattern; I review. This proves you can repeat the integration without help. |
| **7 Enrichment** | **🤝** | 🧑 Design the credit-guard rules + idempotency strategy before we code |
| 8 Dashboard | 🤖 / 🤝 | Prisma aggregation queries |
| 9 Hardening | 🤝 | 🧑 Classify which errors are retryable (and why) before we implement retries |

---

## 2. Apollo API — Verified Facts (from docs.apollo.io)

| Capability | Endpoint | Cost | Key limitation |
|---|---|---|---|
| People search | `POST /api/v1/mixed_people/api_search` | **0 credits** | **Last name obfuscated** (`last_name_obfuscated`), **no emails/phones** — only `has_email`, `has_direct_phone` flags. Org = name + `has_*` flags only. Response has **no pagination object**, only `total_entries` + `people`. |
| Company search | `POST /api/v1/mixed_companies/search` | **1 credit per page** | 403 example: "only available to Apollo users on paid plans". Returns full `pagination` object + rich org data. |
| People enrichment | `POST /api/v1/people/match` (by Apollo `id`, name+domain, email, linkedin_url) | 1 credit (demographics/email), **+8 for mobile phone** | Phone reveal is **async** — requires a public HTTPS `webhook_url` or `poll_only`. `match_confidence: none` → 0 credits. |
| Bulk enrichment | `POST /api/v1/people/bulk_match` | same per person | max 10 per request |
| Org enrichment | `GET /api/v1/organizations/enrich?domain=` | 1 credit | |
| Usage stats | `POST /api/v1/usage_stats/api_usage_stats` | 0 | source of truth for limits |

**Auth:** `x-api-key: <key>` header. Keys are either **scoped** (only selected endpoints; others → 403) or **master** (all endpoints). Least privilege: a scoped key with only the endpoints we use.

**Free-plan access:** "Free accounts must register with a **work email** to use people/organization search, enrichment…". **An account registered with a non-work email will likely get a 403 on search.** Verified with a 0-credit test call (Phase 1.4).

**Pagination:** `page` + `per_page`; max 100 per page, **max 500 pages** (50,000 records display limit). The cap is *pages*, so `per_page=25` can reach only 12,500 records.

**Rate limits** (per team, per endpoint, fixed windows not aligned to the clock; minute + hour + day all apply):

| Plan | Search endpoints | Enrichment |
|---|---|---|
| Free | 50/min · 200/hr · 600/day | 50/min · 200/hr · 600/day (bulk 20/min) |
| Paid | 200/min · 6,000/hr · 50,000/day | 1,000/min |

Headers: `x-minute-requests-left`, `x-hourly-requests-left`, `x-24-hour-requests-left`, `retry-after` (on 429).

**Errors:** structured `error_details: { code: "DOMAIN.CATEGORY.REASON", message, suggestions[{retry_after_seconds…}], context }`. Legacy root fields (`error`, `error_code`, `message`) are **removed 2027-02-16** → we branch on `error_details.code` only. Notable: 401 bad key, 403 `API_INACCESSIBLE` / plan, 422 validation, 429 `USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED` (team quota) vs `USAGE.RATE_LIMIT.PLATFORM_RATE_LIMIT` (Apollo-wide load, no `retry-after` header), 500 retryable.

**Terms:** Exposing/reselling Apollo data to non-Apollo users needs a contract → LeadForge stays a personal/local learning app; **never commit real personal data** (test fixtures get sanitized).

### Impact on the product
1. **Search results are "prospects", not full leads.** The free search gives first name + masked last name + title + company name + availability flags. Full name/email/LinkedIn require enrichment (credits).
2. **"Lead details" for an unsaved search result** = a side panel with what search returned. The full Lead Details page is for saved leads.
3. **Companies:** people search does not return a company domain or ID, so we can't reliably dedupe companies from it. Companies come from company search or enrichment.
4. **Company search and enrichment may be impossible on your account.** That drives the phase reorder in §10.

---

## 3. Missing Requirements I've Filled In (please confirm)

| Gap | Proposal |
|---|---|
| Apollo account access | 0-credit curl test in Phase 1. If 403 → fallback in §7. |
| Credit budget | Hard guards: enrichment only on explicit click + confirm dialog showing cost; `APOLLO_ENRICHMENT_ENABLED` env kill switch; no auto-retry of credit-consuming calls. |
| Repo layout / package manager | Two independent apps in one repo (`client/`, `server/`), **npm**, no workspace tooling. (pnpm 10+ blocks postinstall scripts by default, which adds Prisma friction for little gain.) No shared types package yet. |
| Ports | client `3000`, server `4000` (Nest defaults to 3000 → clash), Postgres `5432`. |
| API contract | Every list endpoint returns `{ items, meta: { page, perPage, totalItems, totalPages, hasNextPage, hasPreviousPage } }`. Errors return `{ statusCode, code, message, retryAfterSeconds? }`. |
| Env vars | server: `DATABASE_URL`, `APOLLO_API_KEY`, `APOLLO_BASE_URL`, `APOLLO_TIMEOUT_MS`, `APOLLO_ENRICHMENT_ENABLED`, `PORT`, `CORS_ORIGIN` — validated at boot (fail fast). client: `NEXT_PUBLIC_API_BASE_URL` (our server URL, not a secret). `.env.example` committed, `.env` gitignored. |
| Lint/format | ESLint + Prettier as scaffolded by Nest CLI / create-next-app. `.nvmrc` = 24. |
| Rate-limit hygiene in UI | Search runs on submit, not on every keystroke. TanStack Query `staleTime` 5 min, `refetchOnWindowFocus: false`, `placeholderData: keepPreviousData` for paging. |

---

## 4. Architecture

```
Browser (client/ — Next.js, TanStack Query)
  │  REST/JSON  (never sees the Apollo key)
  ▼
NestJS (server/)  /api
  ├─ ApolloModule   ── HTTPS + x-api-key ──▶ api.apollo.io
  │    client → service → mapper  (Apollo shapes stop here)
  ├─ LeadsModule    ── Prisma ──▶ PostgreSQL (Docker)
  ├─ CompaniesModule (Phase 6)
  └─ DashboardModule (Phase 8)
```

**Vocabulary:** a **Prospect** is provider data we don't own (transient search result). A **Lead** is our persisted record. This split keeps Apollo shapes out of our domain.

### Provider abstraction: introduced in 3 steps
1. **Day 1 (Phase 3):** Apollo raw types live only inside `modules/apollo/`. `apollo.mapper.ts` converts them to internal `ProspectPerson` / `ProspectCompany` types (in `src/common/types/`). DB rows carry `source` + `externalId`. The leads module never imports Apollo types. This gives provider independence at the data level with zero interfaces.
2. **Phase 7 (enrichment):** this is the first time leads needs to call a provider. We add a small `PersonEnrichmentProvider` interface + injection token, so `LeadsService` depends on the contract, not on `ApolloService`.
3. **Provider #2 (future):** add a provider registry keyed by `LeadSource` and a provider-neutral `/api/discovery/*` controller. Not built now: a registry with one entry is pure ceremony.

### Apollo module internals (the core learning surface)
- `apollo.client.ts`: the only class that talks HTTP. `@nestjs/axios` `HttpModule.registerAsync` scoped to ApolloModule (baseURL, `x-api-key`, timeout 10s). It translates Axios errors into a typed `ApolloApiError` (status, `error_details.code`, `retryAfterSeconds`), reads rate-limit headers, and logs method/path/status/duration/requests-left. **It never logs the key.**
- `apollo.service.ts`: builds Apollo query params from our DTO (`titles` → `person_titles[]`), calls the client, runs the mapper, computes pagination meta.
- `apollo.mapper.ts`: pure functions, raw → internal. It handles nulls, masked names, `"Yes"/"Maybe"` phone flags, and trimming/lowercasing. Unit-tested with sanitized fixtures.
- `apollo.controller.ts`: thin. `GET /api/apollo/people`, `GET /api/apollo/organizations`. GET because they are read operations; filters ride in the query string, mirroring the client URL.
- Error mapping to our API: 401/403 → 502 "Apollo access problem" (it's *our* config, not the user's request); 422 → 400; 429 → 429 + `retryAfterSeconds`; 5xx/timeout → 502/504.

**HTTP client choice:** `@nestjs/axios` (DI-configured, easy to mock `HttpService` in tests; Observables → `firstValueFrom`) over a hand-made axios instance or native `fetch` (no interceptors, manual timeout/JSON/error plumbing).

---

## 5. Folder Structures

```
lead-forge/
├─ client/                       ← Next.js
├─ server/                       ← NestJS
├─ docs/PLAN.md                  ← this approved plan
├─ docs/learning/apollo-notebook.md   ← your own explanations (interview prep)
├─ docker-compose.yml            ← Postgres 17 + named volume
├─ DEVELOPMENT_PROGRESS.md
├─ README.md  .gitignore  .nvmrc
```

```
server/
├─ prisma/ schema.prisma, migrations/          (prisma.config.ts at root — Prisma 7 style)
├─ http/apollo.http                            raw Apollo exploration calls (key from env, never inline)
├─ src/
│  ├─ main.ts            /api prefix, ValidationPipe(whitelist, transform), CORS, exception filter
│  ├─ app.module.ts
│  ├─ config/env.validation.ts                  class-validator based, fail fast
│  ├─ common/
│  │  ├─ dto/pagination-query.dto.ts
│  │  ├─ types/paginated-result.ts, prospect.types.ts
│  │  └─ filters/http-exception.filter.ts
│  ├─ prisma/ prisma.module.ts, prisma.service.ts
│  └─ modules/
│     ├─ health/
│     ├─ apollo/  apollo.module|controller|service|client|mapper.ts, apollo.errors.ts
│     │           dto/  interfaces/ (raw Apollo response types)  __fixtures__/ (sanitized)
│     ├─ leads/   leads.module|controller|service.ts, dto/
│     ├─ companies/   (Phase 6)
│     └─ dashboard/   (Phase 8)
└─ test/  (e2e, Phase 9)
```

```
client/src/
├─ app/  layout.tsx, page.tsx (Overview), people/, companies/, leads/, leads/[id]/, globals.css (tokens)
├─ components/
│  ├─ ui/         shadcn primitives (restyled)
│  ├─ layout/     AppHeader, PageHeader
│  ├─ data/       DataTable, Pagination, StatStrip
│  ├─ feedback/   EmptyState, LoadingState, ErrorState, ConfirmDialog
│  └─ filters/    SearchInput, FilterRail, MultiValueInput
├─ features/  people-search/, company-search/, leads/, dashboard/   (columns, filters, hooks per feature)
├─ lib/       api-client.ts (fetch wrapper → typed ApiError), query-params.ts (URL ⇄ filters), utils.ts
├─ types/     API contract types (mirror server DTOs)
└─ mocks/     Phase 2 mock data + mock API functions with the SAME signatures as the real API
```
The mock API keeps the same function signatures as the real one, so Phase 4 is a swap of implementation, not a rewrite of components.

---

## 6. Pagination End to End

```
URL   /people?titles=CTO&page=3&perPage=25          ← single source of truth (shareable, back button)
  │   TanStack Query key ['people', {titles, page, perPage}]  (keepPreviousData while paging)
  ▼
Nest  GET /api/apollo/people?titles=CTO&page=3&perPage=25
  │   DTO: page ≥ 1, perPage ∈ {10,25,50,100}, page ≤ 500
  ▼
Apollo POST /mixed_people/api_search?person_titles[]=CTO&page=3&per_page=25
  │   → { total_entries: 48213, people: [25] }      (no pagination object!)
  ▼
Nest  → { items: ProspectPerson[25], meta: { page:3, perPage:25, totalItems:48213,
          totalPages: min(ceil(48213/25), 500) = 500, hasNextPage: true } }
```
- UI shows "51–75 of 48,213 · first 500 pages browsable". Changing filters or page size resets to page 1.
- Teaching points: offset pagination drift (new records shift pages → duplicates/gaps between requests); page-size choice limits reachable depth; each page = 1 rate-limited request (and 1 credit on company search).
- Saved leads (our DB): Prisma `skip/take` + `count` in one `$transaction`, same `meta` shape. Cursor pagination is noted as the scale-up alternative.

---

## 7. Fallback if Apollo Blocks Your Account

The 0-credit test call decides this. If it returns 403:
- **A (best for learning):** create an Apollo account with an email on a domain you control. A cheap domain plus free mail forwarding is enough to receive verification.
- **B:** an Apollo paid trial, if one is offered.
- **C (always available):** a small **fake Apollo server** (`tools/apollo-fake/`, zero-dependency Node script) that serves documented response shapes and can simulate 401/403/429/500/timeout. Our client, mapper and error handling stay 100% identical; only `APOLLO_BASE_URL` changes. It's worth building even with live access, for deterministic demos and error-path testing that doesn't burn rate limits.

---

## 8. Initial Database Models (Prisma; built in Phase 5)

```prisma
enum LeadSource       { APOLLO  MANUAL }
enum LeadStatus       { NEW  CONTACTED  QUALIFIED  DISQUALIFIED }
enum EnrichmentStatus { NOT_ENRICHED  ENRICHED  NOT_FOUND  FAILED }

model Company {
  id String @id @default(uuid())
  source LeadSource
  externalId String?          // Apollo org id
  name String
  domain String?              // normalized lowercase, no www
  websiteUrl String?  linkedinUrl String?  industry String?
  employeeCount Int?  city String?  state String?  country String?  foundedYear Int?
  leads Lead[]
  rawData Json?               // last provider payload (debug/reprocess)
  lastSyncedAt DateTime?  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  @@unique([source, externalId])
  @@index([domain])
}

model Lead {
  id String @id @default(uuid())
  source LeadSource
  externalId String           // Apollo person id
  firstName String?  lastName String?  lastNameMasked String?
  title String?  seniority String?
  email String?  emailStatus String?  linkedinUrl String?
  city String?  state String?  country String?
  companyName String?         // snapshot — always available
  companyId String?  company Company? @relation(fields: [companyId], references: [id], onDelete: SetNull)
  status LeadStatus @default(NEW)
  notes String?
  enrichmentStatus EnrichmentStatus @default(NOT_ENRICHED)
  enrichedAt DateTime?  lastSyncedAt DateTime?  rawData Json?
  createdAt DateTime @default(now())  updatedAt DateTime @updatedAt
  @@unique([source, externalId])
  @@index([status])  @@index([createdAt])  @@index([email])
}
```
(In Phase 5 you propose your own schema first; we compare it with this one.)
- **Duplicate prevention is the DB's job.** `@@unique([source, externalId])` + `createMany({ skipDuplicates: true })` / `upsert`. App-level "check then insert" has a race condition. Import returns `{ imported, skipped }`.
- `companyName` snapshot vs `companyId` FK: search gives a name but no reliable company identity. The FK is filled later (enrichment/company import). This is our answer to "missing/inconsistent external data".
- `rawData`: lets us re-map later without re-paying credits. Trade-off: storage + PII.
- **Sync strategy:** saved leads are snapshots. Refresh is manual ("Refresh from Apollo" = enrichment = credits) and tracked via `lastSyncedAt`. No scheduled sync (it would silently burn credits).
- A `ProviderCallLog` table (endpoint, status, credits, duration) will be considered in Phase 7 for credit tracking. Not created up front.

---

## 9. UI Design Direction — "Ledger" (final approval before Phase 2)

Reference point: financial terminals and editorial print, not SaaS templates.
- **Layout:** a **top bar, not a sidebar**. Only 4–5 sections, so a sidebar wastes ~240px of table width. Wordmark · Overview / People / Companies / Saved Leads · right side: a live **Apollo usage meter** ("142/200 this hour", from rate-limit headers). The meter has a purpose: it makes the integration visible.
- **Search pages:** fixed left **filter rail** (~260px, dense grouped fields, collapsible) + results **table** + a row-click **side sheet** for prospect details, so search context is never lost. Bulk select → "Save N leads".
- **Lead details:** full page with a two-column field grid (label/value, mono for IDs/emails/domains), status control, notes, provenance block (source, externalId, imported/synced/enriched timestamps).
- **Dashboard:** one **stat strip** of figures divided by hairline rules (no gradient cards), then recent imports table + distribution bars (status, seniority, country, enrichment coverage).
- **Typography:** IBM Plex Sans (UI) + IBM Plex Mono (numbers, IDs, `tabular-nums`, right-aligned). Avoids the default Geist/Inter look.
- **Color:** warm paper neutrals (off-white bg, stone borders), near-black ink, **one ember-orange accent** for primary actions, focus and selection. Muted status colors as dot + label. CSS variable tokens so dark mode can be added later.
- **Shape and density:** 4px radius, 1px hairlines instead of shadows, no gradients, 36–40px table rows, compact form controls.
- **States:** text-first empty states that explain *why* and offer the next action. Skeleton rows matching table columns. Error states with cause + retry, and rate-limit errors with a countdown.
- **Icons:** Lucide at 16px, used sparingly. No images.

---

## 10. Roadmap (milestones · branches · who builds)

**Recommended change: Database & Lead Management moves before Company Search.** Why: the core loop (search → save → manage) works on the free 0-credit endpoint. Company search costs credits and may be blocked on your account, so a blocker there shouldn't stall the core product. Also, **tests are written as we go** (I write the tests for your exercises in Phase 3) instead of all at once in Phase 9, because mappers are where integration bugs hide.

| Phase | Branch(es) from `dev` | Deliverable / verification |
|---|---|---|
| **0 Planning** | — | This plan approved |
| **1.0 Bootstrap** 🤖 | first commit on `main` (no `dev` exists yet) | README, .gitignore, .nvmrc, `docs/PLAN.md`, DEVELOPMENT_PROGRESS.md. You push `main`, then create + push `dev`. |
| **1.1 Server setup** 🤖 | `feature/server-setup` | Nest on :4000, `/api` prefix, ValidationPipe, env validation, CORS, `GET /api/health` → `curl` returns ok |
| **1.2 Client setup** 🤖 | `feature/client-setup` | Next 16 + Tailwind 4 + shadcn init, fonts. `npm run dev` renders on :3000 |
| **1.3 Database setup** 🤖 | `feature/database-setup` | docker-compose Postgres, Prisma 7.10 pinned (+ `@prisma/adapter-pg`), PrismaService. Health reports `db: up` |
| **1.4 Apollo access check** 🧑 | no code | You create a scoped key, run the 0-credit curl (below), read status + headers. Result recorded in DEVELOPMENT_PROGRESS.md → live vs fake decision |
| **2 Client UI (mock)** 🤖 | `feature/client-design-system` → `feature/client-data-table` → `feature/client-people-search` → `feature/client-saved-leads` → `feature/client-dashboard-companies` | All 5 pages navigable, filters in URL, pagination works on mock data shaped like real Apollo data (masked names, missing fields). **Release v0.1.0 → main** |
| **3 Apollo fundamentals** 🧑🤝 | `feature/apollo-client` → `feature/apollo-people-search` (+ `feature/apollo-fake-server` if needed) | Lab below. `curl :4000/api/apollo/people?titles=CTO&page=2` returns a mapped page; unit tests green; explain-back gate passed |
| **4 Client ↔ API** 🤝 | `feature/client-api-layer` → `feature/people-search-live` | Real search in UI with loading/error/429 states and usage meter. **Release v0.2.0** |
| **5 Database & leads** 🤝 | `feature/lead-schema` → `feature/lead-import` → `feature/lead-management` → `feature/client-leads-live` | Save (single + bulk) with duplicate skip, list/search/filter/sort/paginate, update status/notes, delete with confirm. "Already saved" markers in search via `POST /api/leads/lookup` (keeps Apollo module decoupled from leads). Concurrency experiment: fire two identical imports at once and watch the unique constraint hold. |
| **6 Company search** 🧑 solo | `feature/apollo-company-search` → `feature/company-import` | You build it following the Phase 3 pattern; I review. Access check (1 credit) first. Credit guard: explicit search button, cost notice. Save companies. Fallback: fake server + companies derived from leads. **Release v0.3.0** |
| **7 Enrichment** 🤝 | `feature/lead-enrichment` | You design the guard rules first. Enrich a saved lead by Apollo `id` (email + full name, 1 credit). No phone reveal (needs a public HTTPS webhook; covered as theory + optional extension). Skip if already ENRICHED, `NOT_FOUND` on `match_confidence: none`, no retry on timeout, kill switch. Introduces the provider interface. |
| **8 Dashboard** 🤖🤝 | `feature/dashboard-analytics` | `GET /api/dashboard/summary` via Prisma count/groupBy, wired to the stat strip + distributions |
| **9 Hardening** 🤝 | `feature/apollo-resilience`, `test/e2e`, `docs/*` | You classify errors as retryable/not first. Retry with backoff + jitter for search only (honor `retry-after`, max 2), short-TTL server cache for repeated searches, usage-stats endpoint, e2e tests (supertest + test DB), logging review, README/integration docs, final review, full interview Q&A run-through. **Release v1.0.0** |

**Apollo access check (Phase 1.4).** Run in PowerShell, 0 credits. Never paste the key into chat or commit it:
```
curl.exe -i -g -X POST "https://api.apollo.io/api/v1/mixed_people/api_search?person_titles[]=founder&per_page=1" -H "x-api-key: YOUR_KEY" -H "Content-Type: application/json" -H "Cache-Control: no-cache"
```
`200` with `total_entries` → live works. `403` → note `error_details.code` → §7 fallback. (`-i` shows response headers; `-g` stops curl from treating `[]` as a glob pattern.)

### Phase 3 lab: Apollo integration, step by step
| Step | Who | What you do / learn |
|---|---|---|
| 3.A Read the docs | 🧑 | Read People API Search, Authentication, Rate Limits, Status Codes, API Pricing. Fill a **doc-reading worksheet**: method, URL, auth, cost, required/optional params, array param format, pagination limits, response keys, what's *missing*, error codes, rate-limit headers. We compare it with my reading. Skill: how to read *any* third-party API doc. |
| 3.B Raw calls | 🧑 | In `server/http/apollo.http` (VS Code REST Client) or curl: happy path; page 1 vs 2; wrong key (401); no key; `per_page=200`; `page=501`; watch `x-*-requests-left` drop. Save one sanitized response as a fixture. Skill: explore an API before coding against it. |
| 3.C Response types | 🧑 | Write the TypeScript interfaces for the raw response from the real JSON, and decide what's optional/nullable and why. Rule: type the contract you observe, not the one you hope for. |
| 3.D HTTP client | 🤝 | I explain `HttpModule.registerAsync`, auth header injection, timeouts, Observables → Promises. **You** write `toApolloApiError()` (Axios error → typed error) against my tests. |
| 3.E Mapper | 🧑 | I write failing tests from fixtures (masked name, null title, `"Maybe"` phone, missing org). **You** implement `mapApolloPerson()`. |
| 3.F Pagination math | 🧑 | **You** implement `buildPaginationMeta(total, page, perPage, maxPages)` against my tests (500-page cap, empty results, last page). |
| 3.G DTO + service + controller | 🤝 | Query validation, array params (`titles=CTO&titles=CEO` → `person_titles[]`), thin controller, error mapping table (**you** draft Apollo status → our status first). |
| 3.H Break it | 🤝 | 1ms timeout, wrong key, invalid params, simulated 429. Trace each one through logs to the HTTP response. |
| 3.I Explain-back gate | 🧑 | Answer the Phase 3 questions below in your notebook. We move on only when they're solid. |

---

## 11. Interview Readiness: Question Bank (grows each phase)
By the end of the project you should be able to answer all of these from your own code:
- Why does the Apollo key live only in NestJS? What breaks if it's in a `NEXT_PUBLIC_` var?
- Scoped vs master key: which one did you use and why?
- Search says 48,213 results. Why can the UI reach only page 500, and how does page size change that?
- Why does `api_search` return masked last names and no emails? How did your data model handle it?
- `API_RATE_LIMIT_EXCEEDED` vs `PLATFORM_RATE_LIMIT`: what's the difference, and how does your code handle each?
- Which Apollo calls are safe to retry automatically, and which aren't? Why is a timeout on enrichment dangerous to retry?
- How do you prevent duplicate leads when two imports of the same person run at the same time?
- How do you avoid burning credits (UI, server, data model)?
- Apollo removes legacy error fields on 2027-02-16. Is your code affected?
- What happens to saved leads when Apollo's data changes? How do you sync?
- How would you get phone numbers, and why is that flow asynchronous (webhooks vs polling)?
- How would you add a second provider without rewriting the leads module?
- How do you test an integration without calling the real API?

---

## 12. Git Workflow

- Branches: `main` (stable, releases only), `dev` (integration), `feature/*` from latest `dev`; also `fix/*`, `docs/*`, `chore/*`, `test/*`.
- **Per task:** I inspect → explain → wait for approval → implement on a feature branch I create locally from `dev` → run checks → explain the changes → **stage one logical group at a time** and give you a **short Conventional Commit message** (one subject line, optional 1–2 line body, no attribution; scopes like `server`, `client`, `apollo`, `leads`, `db`). You commit. Repeat per logical group (never one giant commit). → I give you a **PR title + description** (what/why/how to test). You push, open the PR into `dev`, test, merge.
- Merge feature→dev with **"Create a merge commit"** (or rebase), **not squash**, so the commit history is kept. dev→main via a release PR at milestones, tagged `v0.x.0`.
- Optional: branch protection on `main` in GitHub settings.

## 13. Working Rules I'll Follow
One task at a time · explain before implementing · wait for approval · inspect before changing · small reviewable diffs · show how to verify after each task · no claimed success without running it · DEVELOPMENT_PROGRESS.md updated at milestones · explain-back gate before leaving any Apollo task.

## 14. Decisions Needing Your Approval
1. Phase reorder: Database & Leads (5) before Company Search (6), and tests written as we go.
2. Repo layout: `client/` + `server/` as two independent apps, **npm**, no shared types package yet. Ports 3000/4000/5432.
3. Provider abstraction in 3 steps (data-level now, interface in Phase 7, registry only for provider #2). Prospect vs Lead vocabulary.
4. `@nestjs/axios` HttpModule; GET search endpoints with query params; our standard pagination/error envelope.
5. TanStack Table for DataTable (headless, row selection for bulk save, manual pagination). If shadcn's recipe doesn't support v9 yet, pin v8.
6. Prisma pinned to 7.10.x (avoid the 8.0 RC on `latest`).
7. "Ledger" design direction (final sign-off at the start of Phase 2).
8. Fake Apollo server as fallback (and optional demo/testing aid).
9. The learning method in §1 (role split, exercises with my tests, explain-back gates, your notebook).

## Verification of This Phase
Phase 0 has no code. The next concrete step after approval is **Phase 1.0 Bootstrap**: I create README, .gitignore, .nvmrc, docs/PLAN.md and DEVELOPMENT_PROGRESS.md, stage them, and give you the commit message for the first commit on `main`.
