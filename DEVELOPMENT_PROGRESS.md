# LeadForge — Development Progress

_Last updated: 2026-11-10_

## Current phase

**Phase 1 — Project Setup**, task 1.3 (database setup) is next

## Phases

- [x] **Phase 0 — Planning.** Plan approved on 2026-11-10 → [docs/PLAN.md](docs/PLAN.md)
- [ ] **Phase 1 — Project Setup**
  - [x] 1.0 Bootstrap repository (README, .gitignore, .gitattributes, .nvmrc, plan, progress tracker)
  - [x] 1.1 Server setup (NestJS 12 on :4000, `/api`, Zod env validation, CORS, `GET /api/health`)
  - [x] 1.2 Client setup (Next.js 16, Tailwind 4, shadcn/ui on Base UI, IBM Plex fonts, Prettier on :3000)
  - [ ] 1.3 Database setup (Docker Compose Postgres, Prisma 7.10)
  - [ ] 1.4 Apollo access check (0-credit test call)
- [ ] **Phase 2 — Client UI with mock data**
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
| Ports: client 3000, server 4000, Postgres 5432 | NestJS also defaults to 3000 |
| Apollo key lives only in `server/.env` | The browser must never see provider credentials |
| Apollo types stay inside `modules/apollo/`; a mapper converts them to internal `Prospect*` types | Leads logic stays provider-independent |
| Provider interface only in Phase 7, registry only when a 2nd provider exists | Avoid abstractions with one implementation |
| `@@unique([source, externalId])` on leads/companies | The database guarantees no duplicates, even under concurrent imports |
| TanStack Query + URL search params for client state | Caching saves Apollo rate limit; URLs stay shareable |
| Prisma and `@prisma/client` pinned to 7.10.x | npm `latest` tag for `prisma` points to an 8.0 RC |
| Database & leads (Phase 5) before company search (Phase 6) | Core flow works on the free 0-credit endpoint |
| `.gitattributes` forces LF line endings | `core.autocrlf=true` on Windows would make Prettier/ESLint fail on every file |
| Merge feature → dev with merge commits (no squash) | Keeps individual commits in history |
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

## Git

### Branches

| Branch | Purpose | Status |
|---|---|---|
| `main` | Stable releases | Pushed. `origin/main` is 1 commit behind local `main` |
| `dev` | Integration | Pushed |
| `feature/server-setup` | Task 1.1 | Merged into `dev` (PR #1, `a0ad838`) |
| `feature/client-setup` | Task 1.2 | Ready to commit and open a PR into `dev` |

### Commits and PRs

| Date | Branch | Commit / PR |
|---|---|---|
| 2026-11-10 | `main` | `c4cdbd6` Initial Commit |
| 2026-11-10 | `main` | `61d878d` Initial repository setup + add technical plan and progress tracker |
| 2026-11-10 | `feature/server-setup` | `5603f9e` chore(server): scaffold NestJS app |
| 2026-11-10 | `feature/server-setup` | `9e0c36c` feat(server): add env validation, api setup and health check |
| 2026-11-10 | `feature/server-setup` | `d40f809` docs: add server setup steps |
| 2026-11-10 | `dev` | `a0ad838` Merge PR #1 (server setup) |
| 2026-11-10 | `feature/client-setup` | `chore(client): scaffold Next.js app` |
| 2026-11-10 | `feature/client-setup` | `feat(client): set up shadcn/ui, fonts and prettier` |
| 2026-11-10 | `feature/client-setup` | `docs: add client setup steps` |

## Known issues and risks

- **Apollo access unverified.** The account uses a non-work email. Apollo requires a work email for free-plan search, so a 403 is likely. Checked in task 1.4; fallbacks are in [docs/PLAN.md §7](docs/PLAN.md).
- **Company search** costs 1 credit per page and may require a paid plan.
- **Docker Desktop** must be running for PostgreSQL (task 1.3).

- Requests outside `/api` get Express's default HTML 404 (Nest's JSON 404 handler only covers the `/api` prefix). Acceptable: no routes live outside `/api`.
- **Client dev-tool audit findings.** `minimatch` (DoS, via ESLint plugins and shadcn's `ts-morph`) and `deepmerge` (prototype pollution, via the shadcn CLI). Dev-only; `npm audit --omit=dev` reports 0. Don't run `npm audit fix --force`: it downgrades shadcn to v1. Recheck when ESLint/shadcn update.
- **ESLint 9** is in maintenance (10 is latest). Next 16.4's scaffold pins `^9`; upgrade once `eslint-config-next` supports 10.
- `origin/main` is still 1 commit behind local `main` (`git push origin main`).

## Next step

1. Commit `feature/client-setup`, push it, open a PR into `dev` and merge.
2. Start task 1.3 (database setup) on `feature/database-setup`. Docker Desktop must be running.
