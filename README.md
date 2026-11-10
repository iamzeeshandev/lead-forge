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
│  └─ PLAN.md                Approved technical plan
├─ DEVELOPMENT_PROGRESS.md   Progress, decisions and next steps
└─ README.md
```

`client/` and `server/` are added during Phase 1.

## Getting started

Requirements:

- Node.js 24 (see `.nvmrc`)
- npm
- Docker Desktop (for PostgreSQL)
- An Apollo.io API key (kept in `server/.env`, never committed)

### Server

```bash
cd server
npm install
cp .env.example .env   # adjust values if needed
npm run start:dev      # http://localhost:4000/api
```

Check that it runs: `curl http://localhost:4000/api/health`

The server validates its environment variables at startup and refuses to start if one is missing or invalid.

| Command | Purpose |
|---|---|
| `npm run start:dev` | Run with file watching |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | Lint with oxlint (type-aware) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Vitest + Supertest) |

### Client

Added in task 1.2.

## Git workflow

- `main`: stable, presentable releases
- `dev`: integration branch
- `feature/*`: one branch per task, created from `dev` and merged back through a PR

Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

## Documentation

- [Technical plan](docs/PLAN.md)
- [Development progress](DEVELOPMENT_PROGRESS.md)
