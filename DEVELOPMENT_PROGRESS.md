# LeadForge — Development Progress

_Last updated: 2026-11-10_

## Current phase

**Phase 2 — Client UI with mock data**, task 2.2 (data table, pagination, filters) is next

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
  - [ ] 2.2 `DataTable`, `Pagination`, search and filter inputs, `LoadingState`
  - [ ] 2.3 People search page with mock data
  - [ ] 2.4 Saved leads and lead details
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

## Git

### Branches

| Branch | Purpose | Status |
|---|---|---|
| `main` | Stable releases | Pushed. `origin/main` is 1 commit behind local `main` |
| `dev` | Integration | Pushed |
| `feature/server-setup` | Task 1.1 | Merged into `dev` (PR #1, `a0ad838`) |
| `feature/client-setup` | Task 1.2 | Merged into `dev` (PR #2, `cce48ac`) |
| `feature/database-setup` | Task 1.3 | Merged into `dev` (PR #3, `25d0f61`) |
| `feature/client-design-system` | Task 2.1 (also carries the task 1.4 docs) | Ready to commit and open a PR into `dev` |

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
| 2026-11-10 | `feature/client-design-system` | `feat(client): add ledger design system and app shell` |
| 2026-11-10 | `feature/client-design-system` | `docs: record apollo access check and design system` |

## Known issues and risks

- **Apollo Free plan limits** (confirmed in task 1.4). No API access to people search, company search or person enrichment; those run on the fake server. Company enrichment works: 1 credit each, 74 of 75 credits left, 50 requests/min · 200/hour · 600/day.
- **Docker Desktop** must be running for PostgreSQL and the e2e tests.

- Requests outside `/api` get Express's default HTML 404 (Nest's JSON 404 handler only covers the `/api` prefix). Acceptable: no routes live outside `/api`.
- **Client dev-tool audit findings.** `minimatch` (DoS, via ESLint plugins and shadcn's `ts-morph`) and `deepmerge` (prototype pollution, via the shadcn CLI). Dev-only; `npm audit --omit=dev` reports 0. Don't run `npm audit fix --force`: it downgrades shadcn to v1. Recheck when ESLint/shadcn update.
- **ESLint 9** is in maintenance (10 is latest). Next 16.4's scaffold pins `^9`; upgrade once `eslint-config-next` supports 10.
- `origin/main` is still 1 commit behind local `main` (`git push origin main`).

- **Usage meter shows "—"** until Phase 4 passes Apollo's rate-limit headers to the client. The mockup's "credits left" figure is left out until we confirm an endpoint the scoped key can read it from.
- **Prisma 8** is in release candidate, and the default Prisma docs already describe it. Use the v7 docs (`prisma.io/docs/orm/v7`, `/guides/v7`) until we decide to upgrade.

## Next step

1. Commit `feature/client-design-system`, push it, open a PR into `dev` and merge.
2. Task 2.2: `DataTable` (TanStack Table), `Pagination`, search and filter inputs, `LoadingState`.
