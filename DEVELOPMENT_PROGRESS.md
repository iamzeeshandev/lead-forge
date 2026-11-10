# LeadForge — Development Progress

_Last updated: 2026-11-10_

## Current phase

**Phase 1 — Project Setup**, task 1.0 (repository bootstrap)

## Phases

- [x] **Phase 0 — Planning.** Plan approved on 2026-11-10 → [docs/PLAN.md](docs/PLAN.md)
- [ ] **Phase 1 — Project Setup**
  - [ ] 1.0 Bootstrap repository (README, .gitignore, .gitattributes, .nvmrc, plan, progress tracker)
  - [ ] 1.1 Server setup (NestJS on :4000, `/api`, env validation, health endpoint)
  - [ ] 1.2 Client setup (Next.js, Tailwind, shadcn/ui on :3000)
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

## Git

### Branches

| Branch | Purpose | Status |
|---|---|---|
| `main` | Stable releases | First commit pending (1.0) |
| `dev` | Integration | Create from `main` after the first commit |

### Commits and PRs

| Date | Branch | Commit / PR |
|---|---|---|
| — | — | — |

## Known issues and risks

- **Apollo access unverified.** The account uses a non-work email. Apollo requires a work email for free-plan search, so a 403 is likely. Checked in task 1.4; fallbacks are in [docs/PLAN.md §7](docs/PLAN.md).
- **Company search** costs 1 credit per page and may require a paid plan.
- **Docker Desktop** must be running for PostgreSQL (task 1.3).

## Next step

1. Commit the bootstrap files on `main` and push.
2. Create `dev` from `main` and push it.
3. Start task 1.1 (server setup) on `feature/server-setup`.
