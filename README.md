# LeadForge

LeadForge is a lead generation and management platform. It searches people and companies through external data providers (starting with [Apollo.io](https://docs.apollo.io/)), imports them as leads into its own database, and helps you manage them.

The project focuses on building a clean, well-understood **third-party API integration**: authentication, pagination, response mapping, error handling, rate limits, API credits and duplicate-safe persistence.

## Stack

| Layer | Technology |
|---|---|
| Client | Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query |
| Server | NestJS, TypeScript, REST, `@nestjs/axios` |
| Database | PostgreSQL (Docker Compose), Prisma ORM |
| Integration | Apollo.io REST API (API key, server-side only) |

## Repository structure

```
lead-forge/
├─ client/                   Next.js application
├─ server/                   NestJS application
├─ docs/
│  ├─ PLAN.md                Approved technical plan
│  └─ learning/              Apollo integration study notes
├─ DEVELOPMENT_PROGRESS.md   Progress, decisions and next steps
└─ README.md
```

## Getting started

Requirements:

- Node.js 24 (see `.nvmrc`)
- npm
- Docker Desktop (for PostgreSQL)
- An Apollo.io API key (kept in `server/.env`, never committed)

### Database

```bash
docker compose up -d --wait   # PostgreSQL 18 on 127.0.0.1:5434
```

- Host port 5434 avoids clashes with other local Postgres containers. Set `POSTGRES_PORT` to use a different one, and update `DATABASE_URL` to match.
- Data lives in the `leadforge_postgres-data` volume. `docker compose down` keeps it; `docker compose down -v` deletes it.

### Server

```bash
cd server
npm install            # also generates the Prisma client
cp .env.example .env   # adjust values if needed
npm run start:dev      # http://localhost:4000/api
```

Check that it runs: `curl http://localhost:4000/api/health`. It returns `200` when the database is reachable and `503` when it isn't.

The server validates its environment variables at startup and refuses to start if one is missing or invalid.

#### Apollo

Set `APOLLO_API_KEY` in `server/.env`. The key stays on the server; the browser never sees it. `APOLLO_TIMEOUT_MS` (default `10000`) is optional.

Apollo's Free plan doesn't include People Search, so a fake Apollo server stands in for it. It serves people search in Apollo's documented format and passes every other request through to the live API:

```bash
npm run apollo:fake    # http://127.0.0.1:4010, in a second terminal
```

with `APOLLO_BASE_URL=http://127.0.0.1:4010/api/v1` in `server/.env`. Without it, the server calls `https://api.apollo.io/api/v1` directly.

```bash
# People search (0 credits). Filters repeat: titles=CTO&titles=VP
curl "http://localhost:4000/api/apollo/people?titles=CTO&seniorities=c_suite&companySizes=51-200&page=2&perPage=10"

# Company lookup by domain (live API, 1 credit for each company found)
curl "http://localhost:4000/api/apollo/organizations/enrich?domain=apollo.io"
```

Put `test:empty`, `test:rate-limit`, `test:platform-limit`, `test:access-denied`, `test:invalid`, `test:unavailable` or `test:timeout` in `keywords` to make the fake Apollo fail in that way. Company lookups accept URLs and emails (`https://www.Apollo.io/pricing` becomes `apollo.io`). Invalid input is rejected before Apollo is called.

Errors use one shape everywhere: `{ statusCode, code, message, retryAfterSeconds?, requestId? }`. `requestId` is Apollo's id for the failed call. How the integration works, and why: [docs/learning/apollo-notebook.md](docs/learning/apollo-notebook.md).

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run with file watching |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint with oxlint (type-aware) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Vitest + Supertest); needs the database running |
| `npm run db:migrate` | Create and apply a migration after changing `prisma/schema.prisma` |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Browse the database in Prisma Studio |

### Client

```bash
cd client
npm install
npm run dev            # http://localhost:3000
```

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build with type check |
| `npm run lint` | Lint with ESLint (Next.js rules) |
| `npm run format` | Format with Prettier (also sorts Tailwind classes) |
| `npm test` | Unit tests (Vitest) |

UI components come from [shadcn/ui](https://ui.shadcn.com/) on Base UI primitives. Add one with `npx shadcn@latest add <component>`, then run `npm run format`.

Until the client calls the server (Phase 4), People search runs on a mock API (`src/mocks/people-api.ts`) with the same signature as the real one. Type one of these into **Keywords** to see each state: `test:empty`, `test:rate-limit`, `test:access-denied`, `test:timeout`, `test:unavailable`.

Saved leads use a mock too (`src/mocks/leads-api.ts`), stored in the browser's `localStorage` under `leadforge:mock-leads`. Remove that key to start with no saved leads.

The company lookup mock (`src/mocks/companies-api.ts`) knows `apollo.io` (from a real Apollo response) and `corvid-analytics.example`. Any other domain is "not found", and `rate-limit.example` returns a 429.

Design tokens (colors, type scale, radius) live in `src/app/globals.css`. For a link that looks like a button, use `<Link className={buttonVariants()}>` rather than `<Button render={<Link />}>`, which would announce it as a button.

## Git workflow

- `main`: stable, presentable releases
- `dev`: integration branch
- `feature/*`: one branch per task, created from `dev` and merged back through a PR

Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Documentation

- [Technical plan](docs/PLAN.md)
- [Development progress](DEVELOPMENT_PROGRESS.md)
- [Apollo integration notebook](docs/learning/apollo-notebook.md)
