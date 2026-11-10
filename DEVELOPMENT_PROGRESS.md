# LeadForge — Development Progress

_Last updated: 2026-11-10_

## Current phase

**Phase 2 — Client UI with mock data**, task 2.5 (dashboard and companies) is next

## Phases

- [x] **Phase 0 — Planning.** Plan approved on 2026-11-10 → [docs/PLAN.md](docs/PLAN.md)
- [x] **Phase 1 — Project Setup**
  - [x] 1.0 Bootstrap repository (README, .gitignore, .gitattributes, .nvmrc, plan, progress tracker)
  - [x] 1.1 Server setup (NestJS 12 on :4000, `/api`, Zod env validation, CORS, `GET /api/health`)
  - [x] 1.2 Client setup (Next.js 16, Tailwind 4, shadcn/ui on Base UI, IBM Plex fonts, Prettier on :3000)
  - [x] 1.3 Database setup (Docker Compose Postgres 18, Prisma 7.10.1 with the pg adapter, database status in health check)
  - [x] 1.4 Apollo access check: People Search `403` (not in the Free plan), company enrichment `200` (1 credit). Decision: hybrid integration ([docs/PLAN.md §7](docs/PLAN.md))
- [ ] **Phase 2 — Client UI with mock data**
  - [x] 2.1 Design system: "Ledger" approved ([mockup](https://claude.ai/artifact/H3ZnTUJZUDNr4rBvvYAMVE)), tokens, restyled Button, top bar with nav and usage meter, `PageHeader`, `EmptyState`, `ErrorState`, error and 404 pages, empty first states for all four routes
  - [x] 2.2 `DataTable` (TanStack Table v9, row selection, active row, skeleton loading), `Pagination` + `PerPageSelect`, `FilterRail`, `MultiValueInput`, `CheckboxGroup`, `SearchInput`; People page renders them with sample data; client unit tests (Vitest)
  - [x] 2.3 People search: API contract (`ProspectPerson`, `PeopleSearchParams`, `Paginated<T>`, error codes), filters in the URL, mock API with error triggers, TanStack Query, empty/loading/error/past-last-page states, prospect side panel
  - [x] 2.4 Saved leads (search as you type, status filter, pagination) and lead details (status, notes, delete with confirmation) on a mock leads API; saving from People search imports with duplicate skipping
  - [ ] 2.5 Dashboard and companies
- [ ] **Phase 3 — Apollo integration fundamentals**
- [ ] **Phase 4 — Client ↔ server (live people search)**
- [ ] **Phase 5 — Database & lead management**
- [ ] **Phase 6 — Company search**
- [ ] **Phase 7 — Enrichment**
- [ ] **Phase 8 — Dashboard analytics**
- [ ] **Phase 9 — Engineering improvements**

## Key technical decisions

| Decision | Reason |
|---|---|
| Two independent apps: `client/` (Next.js) and `server/` (NestJS), npm, no workspace tooling | Simplest setup; no shared code yet |
| Ports: client 3000, server 4000, Postgres 5434 on the host | NestJS also defaults to 3000; 5432/5433 are taken by other local containers |
| Apollo key lives only in `server/.env` | The browser must never see provider credentials |
| Apollo types stay inside `modules/apollo/`; a mapper converts them to internal `Prospect*` types | Leads logic stays provider-independent |
| Provider interface only in Phase 7, registry only when a 2nd provider exists | Avoid abstractions with one implementation |
| `@@unique([source, externalId])` on leads/companies | The database guarantees no duplicates, even under concurrent imports |
| TanStack Query + URL search params for client state | Caching saves Apollo rate limit; URLs stay shareable |
| Prisma and `@prisma/client` pinned to 7.10.x | npm `latest` tag for `prisma` points to an 8.0 RC |
| Database & leads (Phase 5) before company search (Phase 6) | Core flow works on the free 0-credit endpoint |
| `.gitattributes` forces LF line endings | `core.autocrlf=true` on Windows would make Prettier/ESLint fail on every file |
| Merge feature → dev with merge commits (no squash) | Keeps individual commits in history |
| 1–2 commits per task: code, then docs | Changed from "one commit per logical group" (2026-11-10): simpler history |
| Minor docs changes ride along with the next task's branch | No separate branch, commit or PR for small updates |
| **Zod** for env and request validation (plan said class-validator) | Changed in task 1.1. Nest 12 docs recommend Zod for new projects; one schema gives both the runtime check and the TS type |
| Kept Nest 12 defaults: ESM, Vitest, oxlint | Current official tooling; relative imports need `.js` extensions |
| oxlint `no-explicit-any` set to `error` (scaffold had it off) | Project rule: avoid `any` |
| `configureApp()` shared by `main.ts` and e2e tests | Tests run with the same prefix, pipes and CORS as the real server |
| Plain health controller, no `@nestjs/terminus` | One endpoint doesn't need a library; revisit if checks grow |
| Removed `@nestjs/mau` and the `deploy` script | Deployment is out of scope |
| shadcn/ui on **Base UI** with the **Mira** style | Base UI is shadcn's default since July 2026; Mira is the compact style for dense data screens |
| **Lucide** icons (Mira preset defaults to Hugeicons) | Project requirement |
| IBM Plex Sans + Mono via `next/font`, variables `--font-plex-*` | Self-hosted at build; own variable names avoid a self-referencing `--font-sans` |
| Prettier + `prettier-plugin-tailwindcss` in the client, same style as the server | One code style across the repo; Tailwind classes sorted automatically |
| `shadcn` moved to `devDependencies` | Only its CSS is used at build time; `npm audit --omit=dev` stays meaningful |
| React Compiler and Cache Components off | Not needed yet; table libraries have had React Compiler issues. Revisit later |
| `agentRules: false` in `next.config.ts`, no `AGENTS.md` files | Keep AI-tool files out of the repo |
| **PostgreSQL 18** (plan said 17) | Highest version Prisma 7 officially supports |
| Postgres port bound to `127.0.0.1` only | Docker otherwise publishes the database on every network interface |
| `DATABASE_URL` uses `127.0.0.1`, not `localhost` | On Windows `localhost` resolves to IPv6 `::1` first, and the connection times out |
| Prisma 7 config file kept as `prisma7.config.ts` | Prisma 7.10's preferred name; `prisma.config.ts` is reserved for Prisma 8 |
| `process.loadEnvFile()` in the Prisma config instead of `dotenv` | The Prisma CLI doesn't load `.env` itself; Node 24 does it natively, no extra dependency |
| Prisma packages pinned to exactly `7.10.1`; install scripts approved via `allowScripts` | CLI and client must match; npm 11 blocks dependency install scripts unless approved |
| Generated client in `src/generated/prisma`, gitignored, built by `postinstall` | Generated code doesn't belong in Git; fresh clones still get it |
| No `$connect()` at startup; health returns `503` when the DB is down | DB outages are temporary: the app degrades and recovers instead of refusing to boot |
| pg pool `connectionTimeoutMillis: 5000` and `onPoolError` logging | pg waits forever by default; idle-connection errors were otherwise silent |
| `PrismaModule` imported explicitly, not `@Global()` | Each module's database dependency stays visible |
| **Hybrid Apollo integration**: live company enrichment, fake Apollo server for search and person enrichment | The Free plan doesn't include search endpoints; the code stays identical either way |
| Apollo key `leadforge-local`: scoped to `organizations/enrich`, not a master key, integration type Private | Least privilege; a leaked key can't spend credits on other endpoints |
| Ledger tokens mapped onto shadcn's semantic variables (`primary` = ember, `accent` = hover surface) | Every shadcn component picks up the look without per-component overrides |
| Compact type scale (`text-sm` = 13px) defined in the Tailwind theme | Dense data UI; shadcn components shrink with it automatically |
| Links styled as buttons use `buttonVariants()` on `<Link>` | Base UI's `render={<Link />}` adds `role="button"`, which screen readers announce wrongly |
| `typedRoutes: true` | A mistyped `href` fails the build ("Did you mean '/people'?") instead of producing a 404 |
| `error.tsx` uses Next 16's `retry()` and treats `error` as `unknown` | `retry()` re-fetches as well as re-renders; client code can throw non-`Error` values |
| No dark mode yet; shadcn's grey `.dark` palette removed | It wasn't part of the approved design; tokens make it addable later |
| `LoadingState` moves to task 2.2 | Its skeleton should match the real table columns, so it's built with the `DataTable` |
| TanStack Table **v9** (`useTable` + opt-in features), not v8 | Current major, and what shadcn's data-table guide uses |
| Loading state lives inside `DataTable` (skeleton rows per column, `aria-busy`) | The skeleton always matches the real columns |
| Row selection keyed by Apollo id (`getRowId`), select-all covers the current page only | Selection survives paging; the server paginates, so "all rows" means "this page" |
| One documented `any` in `DataTableColumn` | TanStack types mixed column lists this way; each column keeps its own value type |
| Column lists are assigned to a variable before returning | Returning directly let the `any` return type erase every column's value type (found by the build) |
| `formatRange` returns `0` for a page past the last result | Apollo answers an out-of-range page with an empty list, not an error |
| Vitest added to the client, explicit imports (no globals) | Pure logic such as `getPageItems` needs real tests; same runner as the server |
| Multi-value inputs dedupe case-insensitively and commit on blur | "CTO" and "cto" are the same filter; typed text isn't lost when you click Search |
| API contract uses our own filter values (`'51-200'`, `'c_suite'`), not Apollo's formats | The server maps them to the provider; the client and URLs never depend on one provider |
| `ProspectPerson` holds only what the free search returns, plus `source` | Masked last name and availability flags; `source` leaves room for a second provider |
| One error envelope `{ statusCode, code, message, retryAfterSeconds?, requestId? }` | The UI branches on `code`; `requestId` carries Apollo's id for support |
| Filters live in the URL, with the same names as the API query | Shareable searches, working Back/Forward, one serializer for both |
| URL parsed with Zod and `.catch()` defaults | The URL is user input: bad values fall back instead of crashing |
| `page` always written to the URL | Its presence marks that a search ran, even one with no filters |
| Filter rail edits a draft; only Search applies it | Search on submit, not per keystroke; the form is keyed by the applied search so Back/Forward refill it |
| A new search clears the row selection; paging keeps it | Prevents bulk-saving people from a search that is no longer on screen |
| TanStack Query: `retry: false`, `staleTime` 5 min, `keepPreviousData` | Default retries would triple Apollo requests; cached pages cost nothing; paging doesn't flash empty |
| `QueryClient` created in `useState`, not at module level | A module-level client is shared across server-render requests |
| Mock API: deterministic per search and position, honours `AbortSignal`, `test:` keyword triggers | Same results every time; behaves like the real fetch; every error state is reachable |
| `<Suspense>` around the People view | Without it `useSearchParams()` fails the production build (verified by removing it) |
| Pagination marks no page current past the last page | Found in the browser: page 450 of 397 highlighted 397 and left no way back; Previous now jumps to the last page |
| `Lead` contract follows the Phase 5 model, plus `hasEmail`/`directPhone` snapshots from search | Before enrichment those flags are all we know about contact details |
| Import skips duplicates by `(source, externalId)`, including repeats within one request; returns `{ imported, skipped }` | Mirrors the database's unique constraint, so the UI can say "1 already saved" |
| Mock leads persisted in `localStorage` | Saved leads survive reloads until Phase 5's database |
| Query-key factory (`leadKeys`), every key under `['leads']` | One invalidation after a mutation refreshes lists, details and "already saved" markers together |
| Delete removes the cached detail instead of invalidating it | Refetching a deleted lead would only produce a 404 |
| Bulk save sends snapshots taken when each row was ticked | Selection spans pages, but only the current page's data is loaded |
| "Already saved" markers via a lookup query (`findSavedProspects`) | Keeps the search module independent of how leads are stored (plan's `POST /leads/lookup`) |
| Saved leads search filters as you type (debounced, `router.replace`); Apollo search waits for submit | Our database is cheap to query; Apollo requests spend rate limit. `replace` avoids a history entry per keystroke |
| Status and notes use separate mutations on the details page | Saving notes doesn't lock the status picker, and each shows its own error |
| `ConfirmDialog` stays open until the action succeeds; focus starts on Cancel | A failed delete shows its error; Enter can't delete by accident |
| `shadcn add` of a component that depends on `button` must answer "no" to overwriting | `--yes` doesn't answer that prompt; overwriting would drop the Ledger button |

## Git

### Branches

| Branch | Purpose | Status |
|---|---|---|
| `main` | Stable releases | Pushed. `origin/main` is 1 commit behind local `main` |
| `dev` | Integration | Pushed |
| `feature/server-setup` | Task 1.1 | Merged into `dev` (PR #1, `a0ad838`) |
| `feature/client-setup` | Task 1.2 | Merged into `dev` (PR #2, `cce48ac`) |
| `feature/database-setup` | Task 1.3 | Merged into `dev` (PR #3, `25d0f61`) |
| `feature/client-design-system` | Task 2.1 (also carries the task 1.4 docs) | Merged into `dev` (PR #4, `08c2256`) |
| `feature/client-data-table` | Task 2.2 | Merged into `dev` (PR #5, `46d401d`) |
| `feature/client-people-search` | Task 2.3 | Merged into `dev` (PR #6, `97666e9`); its docs ride along with task 2.4 |
| `feature/client-saved-leads` | Task 2.4 | Ready to commit and open a PR into `dev` |

### Commits and PRs

| Date | Branch | Commit / PR |
|---|---|---|
| 2026-11-10 | `main` | `c4cdbd6` Initial Commit |
| 2026-11-10 | `main` | `61d878d` Initial repository setup + add technical plan and progress tracker |
| 2026-11-10 | `feature/server-setup` | `5603f9e` chore(server): scaffold NestJS app |
| 2026-11-10 | `feature/server-setup` | `9e0c36c` feat(server): add env validation, api setup and health check |
| 2026-11-10 | `feature/server-setup` | `d40f809` docs: add server setup steps |
| 2026-11-10 | `dev` | `a0ad838` Merge PR #1 (server setup) |
| 2026-11-10 | `feature/client-setup` | `c7e69a8` feat(client): set up shadcn/ui, fonts and prettier (scaffold, setup and docs in one commit) |
| 2026-11-10 | `dev` | `cce48ac` Merge PR #2 (client setup) |
| 2026-11-10 | `feature/database-setup` | `b6fb21e` feat(db): add postgres with prisma and a database health check (code and docs in one commit) |
| 2026-11-10 | `dev` | `25d0f61` Merge PR #3 (database setup) |
| 2026-11-10 | `feature/client-design-system` | `38535d6` feat(client): add ledger design system and app shell |
| 2026-11-10 | `feature/client-design-system` | `7cdd6c5` docs: record apollo access check and design system |
| 2026-11-10 | `dev` | `08c2256` Merge PR #4 (design system) |
| 2026-11-10 | `feature/client-data-table` | `d1c3c84` feat(client): add data table, pagination and filter components (code and docs in one commit) |
| 2026-11-10 | `dev` | `46d401d` Merge PR #5 (data components) |
| 2026-11-10 | `feature/client-people-search` | `15d8c8a` feat(client): add people search with url state and mock api |
| 2026-11-10 | `dev` | `97666e9` Merge PR #6 (people search) |
| 2026-11-10 | `feature/client-saved-leads` | `feat(client): add saved leads and lead details` |
| 2026-11-10 | `feature/client-saved-leads` | `docs: update progress for people search and saved leads` |

## Known issues and risks

- **Apollo Free plan limits** (confirmed in task 1.4). No API access to people search, company search or person enrichment; those run on the fake server. Company enrichment works: 1 credit each, 74 of 75 credits left, 50 requests/min · 200/hour · 600/day.
- **Docker Desktop** must be running for PostgreSQL and the e2e tests.

- Requests outside `/api` get Express's default HTML 404 (Nest's JSON 404 handler only covers the `/api` prefix). Acceptable: no routes live outside `/api`.
- **Client dev-tool audit findings.** `minimatch` (DoS, via ESLint plugins and shadcn's `ts-morph`) and `deepmerge` (prototype pollution, via the shadcn CLI). Dev-only; `npm audit --omit=dev` reports 0. Don't run `npm audit fix --force`: it downgrades shadcn to v1. Recheck when ESLint/shadcn update.
- **ESLint 9** is in maintenance (10 is latest). Next 16.4's scaffold pins `^9`; upgrade once `eslint-config-next` supports 10.
- `origin/main` is still 1 commit behind local `main` (`git push origin main`).

- **shadcn CLI writes Mira defaults** (28px inputs, dark-mode classes). Every `shadcn add` needs restyling to Ledger tokens.
- **Mock leads live in this browser only** (`localStorage` key `leadforge:mock-leads`). Phase 5 moves them to Postgres; clear the key to start fresh.
- **Stand-alone `tsc` can report stale route types** after adding a route. Run `npx next typegen` (or `npm run build`, which regenerates them).
- **Usage meter shows "—"** until Phase 4 passes Apollo's rate-limit headers to the client. The mockup's "credits left" figure is left out until we confirm an endpoint the scoped key can read it from.
- **Prisma 8** is in release candidate, and the default Prisma docs already describe it. Use the v7 docs (`prisma.io/docs/orm/v7`, `/guides/v7`) until we decide to upgrade.

## Next step

1. Commit `feature/client-saved-leads`, push it, open a PR into `dev` and merge.
2. Task 2.5: dashboard (stat strip and distributions from the mock leads) and the companies page, then release v0.1.0 to `main`.
