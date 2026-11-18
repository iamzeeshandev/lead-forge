# Apollo Integration Notebook

This is your interview study guide for LeadForge's Apollo integration. Every point is tied to code in this repo, so you can answer from what you built, not from memory of a tutorial. The notebook grows with each Phase 3+ task.

- [1. Reading the docs](#1-reading-the-docs)
- [2. What the live API actually did](#2-what-the-live-api-actually-did-2026-11-11)
- [3. How LeadForge calls Apollo](#3-how-leadforge-calls-apollo)
- [4. Decisions, alternatives and pitfalls](#4-decisions-alternatives-and-pitfalls)
- [5. Breaking it on purpose](#5-breaking-it-on-purpose)
- [6. People search through a fake Apollo](#6-people-search-through-a-fake-apollo)
- [7. Interview questions](#7-interview-questions)

---

## 1. Reading the docs

How to read any third-party API doc: for each endpoint, fill in the same worksheet. The gaps you find (things the doc doesn't say) are as important as the answers.

### Organization enrichment ([docs](https://docs.apollo.io/reference/organization-enrichment)), used live

| Question | Answer |
|---|---|
| Method and URL | `GET https://api.apollo.io/api/v1/organizations/enrich` |
| Auth | `x-api-key: <key>` header. Partners can use `Authorization: Bearer <OAuth token>` instead |
| Key scope | A scoped key must include `api/v1/organizations/enrich`, or be a master key |
| Cost | **1 credit** per organization |
| Parameters | Query string, all optional strings: `domain` (no `www.`, no `@`), `website`, `linkedin_url`, `name`. At least one identifier is required in practice |
| Response | `{ "organization": { … } }`, about 60 fields: firmographics, revenue, funding, technologies, head count by department |
| Not documented | What "no match" looks like, and whether it costs a credit |
| Errors | 401 bad key, 403 endpoint not allowed, 422 no identifier, 429 rate limit |
| Rate limits (Free) | 50/min · 200/hour · 600/day |

The docs contradict themselves twice. The intro says `name` alone works, while the schema says it doesn't. A 422 example suggests `website_url`, but the parameter is called `website`. **Lesson: docs are a starting point; the live API is the truth.**

### People API Search ([docs](https://docs.apollo.io/reference/people-api-search)), through the fake server (task 3.2)

| Question | Answer |
|---|---|
| Method and URL | `POST https://api.apollo.io/api/v1/mixed_people/api_search`, with parameters in the **query string**, even though it's a POST |
| Cost | **0 credits**. Not included in the Free plan (our access check got a 403) |
| Array parameters | Repeat the key with brackets: `person_titles[]=CTO&person_titles[]=CEO` |
| Our filters → Apollo | `titles` → `person_titles[]`, `seniorities` → `person_seniorities[]` (`owner`, `founder`, `c_suite`, `partner`, `vp`, `head`, `director`, `manager`, `senior`, `entry`, `intern`), `locations` → `person_locations[]`, `companySizes` `'51-200'` → `organization_num_employees_ranges[]` `'51,200'`, `domains` → `q_organization_domains_list[]` (up to 1,000), `keywords` → `q_keywords` |
| Pagination | `page` + `per_page`. Max 100 per page and **500 pages**; 50,000 records display limit |
| Response | `{ total_entries, people: [...] }`. **No pagination object**: we compute total pages ourselves |
| What's missing | No email, no phone, no full last name. You get `last_name_obfuscated` ("Hu***n"), `has_email`, `has_direct_phone` (a **string**: `"Yes"` or `"Maybe: please request direct dial via people/bulk_match"`), and an `organization` with only a `name` and `has_*` flags |
| Errors | 401, 403, 422 (e.g. 100+ titles), 429 |

### Rate limits ([docs](https://docs.apollo.io/reference/rate-limits))

- **Per team, per endpoint.** Not per key or per user. Two keys don't double your limit.
- **Three fixed windows at once** (minute, hour, day). A window starts with your first request and resets after its duration, so it isn't aligned to the clock.
- Response headers: `x-rate-limit-minute|hourly|24-hour` (limit), `x-minute|hourly|24-hour-usage` (used), and `x-minute|hourly|24-hour-requests-left` (left).
- On 429, `error_details.code` tells you which kind of limit you hit:
  - `USAGE.RATE_LIMIT.API_RATE_LIMIT_EXCEEDED`: your team used up a window. The `Retry-After` header gives the seconds to wait, and `context.window.value` names the window.
  - `USAGE.RATE_LIMIT.PLATFORM_RATE_LIMIT`: Apollo as a whole is under load. There's **no** `Retry-After` header, only `suggestions[].retry_after_seconds` (60).

### Errors ([docs](https://docs.apollo.io/reference/status-codes), [changelog](https://docs.apollo.io/changelog/api-errors-now-include-structured-details))

```json
{
  "error_details": {
    "code": "AUTH.AUTHENTICATION.API_KEY_INVALID",
    "message": "This API key is not valid.",
    "suggestions": [{ "label": "Send a valid API key in the X-Api-Key header", "header": "X-Api-Key" }],
    "context": {}
  }
}
```

- `code` is stable and has the form `DOMAIN.CATEGORY.REASON`. **Branch on it.** The `message` wording can change.
- Legacy root fields (`error`, `error_code`, `message`) are **removed on 2027-02-16**. Responses now carry a `deprecation` object saying so. LeadForge never reads them.

### Credits ([docs](https://docs.apollo.io/docs/api-pricing))

| Call | Credits |
|---|---|
| Organization enrichment | 1 per organization |
| People search | 0 |
| People enrichment | 1, plus 8 if a mobile phone is returned. No charge when `match_confidence` is `none` |
| Organization search | 1 per page (paid plans only) |

---

## 2. What the live API actually did (2026-11-11)

I made these calls with your scoped key (`organizations/enrich` only), plus one through our own server. They cost 3 credits in total; the others were free.

| Call | The docs say | The API did | What the code does about it |
|---|---|---|---|
| No `x-api-key` header | 401, `AUTH.AUTHENTICATION.CREDENTIALS_MISSING` | **422**, `AUTH.AUTHENTICATION.API_KEY_REQUIRED` | Classify by `error_details.code` first, status second. By status alone this would look like a validation error |
| Wrong key | 401 with a **plain-text** body | 401 with a **JSON** body, `AUTH.AUTHENTICATION.API_KEY_INVALID` | Handle both: a code if there is JSON, otherwise fall back to the status |
| No identifier | 422 `ORGANIZATION_IDENTIFIER_REQUIRED` | Same, **with** rate-limit headers: the failed call counted against the limit | Validate before calling Apollo, so bad input never costs rate limit |
| `usage_stats` with a scoped key | — | 403 `AUTH.AUTHORIZATION.ENDPOINT_ACCESS_DENIED` | Proof that the scoped key limits a leak |
| Unknown domain | Not documented | **`200` with `{}`** | The service turns a missing `organization` into our 404 `NOT_FOUND` |
| `apollo.io` | `organization` with `account`, `blog_url`, … | No `account` or `blog_url`; extra `organization_revenue`, `sanitized_phone`, `latest_funding_detected_at`; **195 technology names, 4 of them repeated** | Raw types list only the fields we read, all optional. The mapper dedupes technologies |
| `stripe.com` through our server | — | 200, mapped cleanly (9,400 employees, $6.9B revenue) | The mapper works on data it wasn't written from |

Other observations:
- **Every** response has an `x-request-id` (a UUID). Apollo support asks for it, so we log it and pass it to the client on errors.
- Auth failures have **no** rate-limit headers: authentication happens before rate limiting.
- **Open question:** does the `{}` "no match" cost a credit? The docs don't say. Your Apollo credit count was 74 before these calls, and I spent 3 lookups (`unknown domain`, `apollo.io`, `stripe.com`). If Apollo now shows 72 credits, no-match calls are free; if it shows 71, they're charged. Check **Settings → Billing and credits → Credit usage** in Apollo.

**The lesson to say in an interview:** "Type the contract you observe, not the one you hope for. I explored the API with raw calls before writing code, saved a real response as a test fixture, and wrote down every place the docs and reality differ."

---

## 3. How LeadForge calls Apollo

```
GET /api/apollo/organizations/enrich?domain=https://www.Stripe.com/pricing
 │
 ├─ StandardSchemaValidationPipe + enrichOrganizationQuerySchema
 │     normalizes to "stripe.com"; invalid input → 400 here, Apollo is never called
 ├─ ApolloController            thin: reads the query, calls the service
 ├─ ApolloService               the module boundary: returns CompanyProfile, throws ApiException
 ├─ ApolloClient                the only class that speaks HTTP to Apollo; raw types in, ApolloApiError out; logs
 ├─ HttpService (axios)         baseURL, x-api-key, 10 s timeout, no redirects
 ▼
api.apollo.io
 ◀─ 200 { organization }   → mapApolloOrganization() → CompanyProfile → 200
 ◀─ 200 {}                 → 404 NOT_FOUND
 ◀─ 4xx/5xx/timeout        → toApolloApiError() → toApiException() → ApiExceptionFilter → error envelope
```

| File | Job |
|---|---|
| [apollo.module.ts](../../server/src/modules/apollo/apollo.module.ts) | Registers an `HttpModule` that only this module can use: base URL, key header, timeout, `maxRedirects: 0` |
| [apollo.client.ts](../../server/src/modules/apollo/apollo.client.ts) | One method per Apollo endpoint. Times each call, logs status, duration, requests left and request id. Converts every failure into `ApolloApiError` |
| [apollo.errors.ts](../../server/src/modules/apollo/apollo.errors.ts) | `toApolloApiError` (axios error → typed Apollo error) and `toApiException` (Apollo error → our API error) |
| [apollo.headers.ts](../../server/src/modules/apollo/apollo.headers.ts) | Reads rate-limit, `Retry-After` and request id headers |
| [apollo.mapper.ts](../../server/src/modules/apollo/apollo.mapper.ts) | Pure functions: raw Apollo shape → `CompanyProfile` |
| [apollo.service.ts](../../server/src/modules/apollo/apollo.service.ts) | Calls the client, interprets `{}`, maps, translates errors |
| [interfaces/](../../server/src/modules/apollo/interfaces/) | Raw Apollo types. **Nothing outside `modules/apollo/` imports them** |
| [api-exception.filter.ts](../../server/src/common/filters/api-exception.filter.ts) | Turns every exception into `{ statusCode, code, message, retryAfterSeconds?, requestId? }` and sets `Retry-After` |
| [`__fixtures__/organization-enrich.apollo-io.json`](../../server/src/modules/apollo/__fixtures__/organization-enrich.apollo-io.json) | The real `apollo.io` response. Long lists we don't map are shortened, and the one person id is replaced |

**Why three layers (client → service → controller)?** Each one has a single reason to change:
- **Client:** changes when Apollo's HTTP details change (paths, headers, error format).
- **Mapper/service:** changes when our product's data model changes.
- **Controller:** changes when our public API changes.

When Apollo renames a field, you edit the raw type and the mapper; nothing else in the codebase notices. That's what "Apollo shapes stop at the module boundary" means.

---

## 4. Decisions, alternatives and pitfalls

### 4.1 The API key

- **Where it lives.** `server/.env` (gitignored) → `APOLLO_API_KEY`, validated at startup. A missing or blank key **stops the server from booting**: fail fast, not on the first user request.
- **Never in the browser.** A `NEXT_PUBLIC_` variable is inlined into the JavaScript bundle, so anyone could read it in DevTools and spend your credits. The browser calls our server; only the server calls Apollo.
- **Scoped key, least privilege.** Ours can only call `organizations/enrich`, so a leaked key can't search or reveal emails. The live 403 on `usage_stats` proves it.
- **Only the Apollo module carries it.** `HttpModule.registerAsync` is registered inside `ApolloModule`, not globally. Another module's HTTP client can't accidentally send the key to a different API.
- **`maxRedirects: 0`.** On a cross-host redirect, axios (via `follow-redirects`) drops only `Authorization`, `Proxy-Authorization` and `Cookie`. A custom header like `x-api-key` **would be forwarded** to the redirect target. Apollo's API never redirects, so a redirect means something is wrong. We stop it and treat it as an unexpected response.
- **Never logged.** An `AxiosError` holds the full request config, **including headers**. Logging the raw error, or attaching it as `cause`, leaks the key into log files. `ApolloApiError` is built from scratch with no `cause`, and a unit test checks that the key isn't in its message, stack or JSON.
- **Rotation** (production): create the new key, deploy it, then revoke the old one. Two keys can be active at once, so there's no downtime.

### 4.2 HTTP client: `@nestjs/axios`

- **Why:** configured once through dependency injection (base URL, headers, timeout). The default array format (`a[]=1&a[]=2`, with the brackets URL-encoded) is exactly what Apollo expects. Timeouts are built in. It's a common Nest choice that interviewers recognize.
- **Alternatives:**
  - Native `fetch`: no dependency, but you write the timeout (`AbortSignal.timeout`), query serialization and error-on-non-2xx yourself.
  - A hand-made axios instance: works, but it's harder to swap in tests and bypasses Nest's DI.
- `HttpService` returns RxJS Observables; `firstValueFrom()` turns them into Promises because we don't need streams.
- **Supply chain:** axios is pinned to an exact version (`1.21.0`) that had been out for over two weeks and has a signed build attestation. axios had a malicious-release incident in 2026, and an exact pin means a bad new release can't slip in with `npm install`.

### 4.3 Timeouts

- axios's default timeout is **0, which waits forever**. One hung Apollo connection would hold a request open, and many would exhaust the server. We use 10 s (`APOLLO_TIMEOUT_MS`).
- **Pitfall:** a timeout means "no answer arrived", **not** "Apollo didn't process it". A timed-out enrichment may still have spent a credit, so credit-spending calls are **never retried automatically**. Free calls like search can be retried with backoff (Phase 9).

### 4.4 Error handling: two translations

1. **axios error → `ApolloApiError`** (`toApolloApiError`). It records the `kind`, Apollo's status and `error_details.code`, `retryAfterSeconds` and `requestId`. The classification is by **code first** (`AUTH.AUTHENTICATION.*` → auth, `AUTH.AUTHORIZATION.*` → access, `USAGE.RATE_LIMIT.*` → rate limit), then by **status** for undocumented codes and plain-text bodies. No response at all is a timeout or a network error.
2. **`ApolloApiError` → our `ApiException`** (`toApiException`):

| Apollo | We answer | Why |
|---|---|---|
| Bad, missing or unauthorized key (401/403, or 422 with an `AUTH.*` code) | **502** `PROVIDER_ACCESS_DENIED` | A 401 would tell the client *the user* isn't logged in. The broken credential is the server's: an upstream (gateway) failure |
| 429 | **429** `PROVIDER_RATE_LIMITED` + `retryAfterSeconds` + `Retry-After` header | The client really must wait; the UI shows a countdown |
| 422 (other) | **400** `VALIDATION_FAILED` | The request's parameters were rejected |
| `200 {}` from enrichment | **404** `NOT_FOUND` | No company for that domain |
| 5xx, connection refused | **502** `PROVIDER_UNAVAILABLE` | Apollo or the network is down |
| Timeout | **504** `PROVIDER_TIMEOUT` | Gateway timeout |
| Our own bug | **500** `INTERNAL_ERROR` | — |

- **Apollo's own messages never reach the client**; they go to the logs. They can mention Apollo parameter names and internals, and their wording changes.
- **The `requestId` does reach the client**, so a user can quote it and you can find the exact call in Apollo's support tools.
- **One error envelope for the whole API** (a global `@Catch()` filter) means the client parses a single shape and branches on `code`. The health check is the exception: its 503 *is* the report, so it sets the status instead of throwing.

### 4.5 Mapping

- **Raw types list only the fields we read, and all are optional and nullable** except `id`. The real response lacked documented fields and had undocumented ones. Typing all ~60 fields would be a promise the API doesn't keep.
- **The mapper is pure** (no I/O), so it's easy to test against the real fixture.
- **Normalization:**
  - Trimmed strings, with blank strings becoming `null`.
  - The domain is lowercased.
  - The name falls back to the domain, then the id.
  - Negative or non-finite numbers become `null`.
  - Revenue falls back from `annual_revenue` to `organization_revenue`.
  - Technologies are deduped case-insensitively (195 → 191).
- **We use the number, not the display string.** Apollo sends `annual_revenue: 150000000` *and* `annual_revenue_printed: "150M"`. The number can be sorted and formatted; the string can't.
- **Production follow-up (Phase 5/6):** store the raw payload (`rawData`) next to the mapped fields. When you fix a mapping bug later, you can re-map without paying for the data again. The trade-off is storage and personal data held at rest.

### 4.6 Domain normalization on the server too

The client already normalizes, but **the server can't trust the client**. Anything can call the API with curl. The normalized domain is also the key that Phase 6 caches and stores: `Stripe.com`, `www.stripe.com` and `https://stripe.com/pricing` are one company and must cost **one** credit, not three. Invalid input gets a 400 **before** Apollo is called, so it costs nothing.

### 4.7 Rate limits

- We **read and log** the requests left in each window on every call (`left 49/min 196/h 595/day`). Phase 4 sends them to the UI usage meter.
- Even our own validation failures would count against the limit at Apollo (the 422 above had usage headers), which is one more reason to validate first.
- **Not built yet, on purpose:** automatic retry with backoff and jitter, honoring `Retry-After` (Phase 9). Today a 429 is passed straight to the client. Retrying blindly when the hourly window is used up only makes more failed calls.

### 4.8 Logging

What a log line looks like:

```
[ApolloClient] GET /organizations/enrich | 200 | 893ms | left 49/min 196/h 595/day | req 2b23d8bb-5743-41e1-b540-28cd94538338
[ApolloClient] GET /organizations/enrich | 401 | AUTH.AUTHENTICATION.API_KEY_INVALID | 740ms | req 5e7cc885-… | This API key is not valid.
[ApolloClient] GET /organizations/enrich | network | 20ms | req - | ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:1
```

- **Logged:** method, path, status or failure kind, Apollo's error code, duration, requests left, retry delay, request id, and Apollo's message or the socket error. Without that last part, "network" can't tell a refused connection from a DNS failure.
- **Never logged:**
  - Headers, because they hold the key.
  - Query strings, because people search sends names, and enrichment can send emails.
  - Raw axios errors, for the same reason as the headers.

### 4.9 Testing without spending credits

| Test | What it proves | File |
|---|---|---|
| Unit: `toApolloApiError` with real error bodies | Classification, `Retry-After` fallback, no key leakage | `apollo.errors.spec.ts` |
| Unit: mapper with the real fixture | Field mapping, dedupe, nulls, fallbacks | `apollo.mapper.spec.ts` |
| Unit: headers, filter, domain, env | Small pure functions | `*.spec.ts` |
| **E2E with a fake Apollo** | The whole chain through real axios: key header sent, domain normalized, `{}` → 404, 429 → 429 + `Retry-After`, auth codes → 502, 500 → 502, timeout → 504, nothing logs the key | `test/apollo.e2e-spec.ts` |

- The e2e test starts a tiny `node:http` server on a random port and sets `APOLLO_BASE_URL` to it. **The server code is unchanged.** That's the same switch task 3.2's fake Apollo server uses.
- **Why not mock `HttpService`?** A mock returns what you tell it to, so it can't catch a wrong header name, a wrong query format or a broken timeout. A real HTTP stub can.
- **Why not call the live API in tests?** It costs credits, uses rate limit, and is flaky.

---

## 5. Breaking it on purpose

Run against the built server on 2026-11-11. All free except the `stripe.com` call.

| Experiment | Apollo said | The log said | Our API answered |
|---|---|---|---|
| `APOLLO_API_KEY=wrong-key-123` | 401 `API_KEY_INVALID` | `401 \| AUTH.AUTHENTICATION.API_KEY_INVALID \| 740ms \| req 5e7c… \| This API key is not valid.` | `502 PROVIDER_ACCESS_DENIED` + `requestId` |
| `APOLLO_TIMEOUT_MS=1` | (no answer) | `timeout \| 22ms \| req - \| ECONNABORTED: timeout of 1ms exceeded` | `504 PROVIDER_TIMEOUT` |
| `APOLLO_BASE_URL=http://127.0.0.1:1/api/v1` | (no connection) | `network \| 20ms \| req - \| ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:1` | `502 PROVIDER_UNAVAILABLE` |
| `APOLLO_API_KEY=" "` | — | `Config validation error: APOLLO_API_KEY: Too small` | Server refuses to start |
| `?domain=not a domain` | (not called) | — | `400 VALIDATION_FAILED` |

To repeat one yourself (PowerShell, from `server/`):
1. Build and start with a wrong key: `npm run build`, then `$env:APOLLO_API_KEY='wrong-key-123'; node dist/main.js`. Environment variables win over `.env`.
2. In a second terminal, call the endpoint: `curl.exe "http://localhost:4000/api/apollo/organizations/enrich?domain=apollo.io"`. A rejected key costs no credit.
3. Stop the server with Ctrl+C, then `Remove-Item env:APOLLO_API_KEY` so the real key from `.env` applies again.

---

## 6. People search through a fake Apollo

### Why a fake server, and how it works

The Free plan returns 403 on People Search, but it's the core endpoint of a lead-generation integration. So [server/tools/fake-apollo.ts](../../server/tools/fake-apollo.ts) plays Apollo:
- It's one file with no dependencies. Start it with `npm run apollo:fake`, then set `APOLLO_BASE_URL=http://127.0.0.1:4010/api/v1`.
- **The NestJS code doesn't change**: it only knows a base URL. With a paid plan you'd point the URL back at `api.apollo.io`.
- **Every other path is passed through** to the real `api.apollo.io`, with the same headers and key. Company enrichment stays live behind the fake.
- **The data is deterministic.** The same filters always give the same total and the same people on each page, so paging behaves like a real search.

What it imitates, all from the docs or from our own live calls:

| Behavior | Source |
|---|---|
| `{ total_entries, people }`, no pagination object | People Search docs |
| `last_name_obfuscated` like `Wa***h`; `has_direct_phone` is the string `"Yes"` or `"Maybe: …"`; `title` sometimes null | People Search docs |
| `per_page` capped at 100; pages past 500 or past the last result return an empty list | Docs (limits); empty list assumed |
| Missing key → `422 AUTH.AUTHENTICATION.API_KEY_REQUIRED` | Our live call |
| Fixed windows of 50/min, 200/hour and 600/day, with `x-rate-limit-*`, `x-*-usage` and `x-*-requests-left` headers; 429 with `Retry-After` and `context.window` | Rate-limit docs |
| `q_keywords=test:…` triggers: `rate-limit`, `platform-limit` (no `Retry-After` header), `access-denied` (the real 403 body from task 1.4), `invalid` (422 with **no** `error_details`, as documented), `unavailable` (HTML 500), `timeout` (15 s), `empty` | Docs and live calls |

**Alternatives:**
- **WireMock or Mockoon:** stub servers driven by JSON files, with record and playback. WireMock needs Java or Docker. Computed responses (paging, totals, rate-limit counters) need its templating, which gets awkward fast.
- **Prism:** generates a mock from an OpenAPI spec. Apollo's spec doesn't describe the real quirks we found, like the 422 for a missing key or `200 {}` for no match.
- **Mocking `HttpService` in unit tests:** no real HTTP, so it can't catch a wrong header, query format or timeout.

The same pattern is used in industry to develop against paid, rate-limited or unfinished APIs: a contract-faithful fake at the network boundary.

### Our query → Apollo's parameters

```
GET /api/apollo/people?titles=CTO&titles=VP%20Engineering&includeSimilarTitles=false&seniorities=c_suite
    &locations=Berlin&companySizes=51-200&companySizes=5001%2B&domains=https://www.Stripe.com/pricing&page=2&perPage=10
```

What Apollo received (from the fake's log):

```
POST /api/v1/mixed_people/api_search?page=2&per_page=10&person_titles[]=CTO&person_titles[]=VP+Engineering
    &include_similar_titles=false&person_seniorities[]=c_suite&person_locations[]=Berlin
    &organization_num_employees_ranges[]=51,200&organization_num_employees_ranges[]=5001,1000000
    &q_organization_domains_list[]=stripe.com
```

| Ours | Apollo | Note |
|---|---|---|
| `keywords` | `q_keywords` | |
| `titles` (repeated key) | `person_titles[]` | axios writes arrays with `[]`, Apollo's format |
| `includeSimilarTitles=false` | `include_similar_titles=false` | Sent only when false; Apollo's default is true |
| `seniorities` | `person_seniorities[]` | Same values; Apollo also has `intern` |
| `locations` | `person_locations[]` | |
| `companySizes` `51-200`, `5001+` | `organization_num_employees_ranges[]` `51,200`, `5001,1000000` | Apollo wants `min,max`, so the open bucket gets an upper bound |
| `domains` | `q_organization_domains_list[]` | Normalized like enrichment; up to 1,000 at Apollo |
| `page`, `perPage` | `page`, `per_page` | |

- **Why POST with a query string?** That's how Apollo documents it, so the client follows. **Our** API exposes it as `GET /api/apollo/people`, because it's a read. The query string is also the URL the client shows, so searches can be shared and cached.
- **Why our own filter names and values** (`'51-200'`, not `'51,200'`)? The client, its URLs and saved searches never depend on one provider. A second provider means writing a second mapper, not changing the client. The mapping lives in [apollo.mapper.ts](../../server/src/modules/apollo/apollo.mapper.ts) (`toApolloPeopleSearchParams`).
- **Validation happens before Apollo is called**, so it costs nothing:
  - `perPage` must be one of 10, 25, 50 or 100.
  - `page` must be between 1 and 500.
  - Seniorities and sizes must be known values.
  - Fewer than 100 titles (Apollo returns 422 at 100).
  - Domains must normalize.

### Pagination math

Apollo returns only `total_entries`; [buildPaginationMeta](../../server/src/common/pagination.ts) does the rest:

```
39,508 results, 10 per page → ceil(39,508 / 10) = 3,951 pages → capped at 500
→ { page: 2, perPage: 10, totalItems: 39508, totalPages: 500, hasNextPage: true, hasPreviousPage: true }
```

- **The cap is on pages, not records.** At 100 per page you can reach 50,000 records; at 10 per page only 5,000. That's why we keep `totalItems` (the real total) separate from `totalPages` (what's reachable). The UI shows "39,508 results, first 500 pages browsable".
- **Past the last page** (page 500 of 243), Apollo returns 200 with an empty list, not an error. `hasNextPage` is false and the UI offers a way back.
- **Offset pagination drift:** if Apollo's data changes between page 1 and page 2, records shift. You can see a person twice or miss one. Apollo has no cursor, so we accept it and deduplicate by Apollo `id` when saving.
- **Every page is one rate-limited request.** Caching pages on the client (5 minutes) means going back costs nothing.

### Mapping people ([mapApolloPerson](../../server/src/modules/apollo/apollo.mapper.ts))

| Apollo | Ours | Why |
|---|---|---|
| `last_name_obfuscated` `"Wa***h"` | `lastNameMasked` | The free search never gives the full name. Enrichment (credits) does |
| `has_direct_phone` `"Yes"` / `"Maybe: please request…"` | `directPhone: 'yes' \| 'maybe' \| 'no'` | A string, not a boolean. Matched by prefix, because Apollo may reword the advice text |
| `has_city` / `has_state` / `has_country` | `hasLocation` | Only flags; the actual location needs enrichment |
| `has_email` | `hasEmail` | The email itself needs enrichment |
| `organization.name` | `companyName` | No company id or domain in search results, so companies can't be reliably deduplicated from search alone |

### What was verified (fake Apollo plus our built server)

| Request | Result |
|---|---|
| The search above | 200, 10 people, `totalPages` capped at 500 |
| `keywords=growth&page=500&perPage=10` | 200, empty list, `totalPages: 243`, `hasNextPage: false` |
| `perPage=30` / `seniorities=boss&page=501` / `domains=not a domain` | 400 `VALIDATION_FAILED`, with every bad field named; Apollo never called |
| `test:rate-limit` / `test:platform-limit` | 429 with `retryAfterSeconds` 1800 / 60. The second came from the body, since there was no header |
| `test:access-denied` | 502 `PROVIDER_ACCESS_DENIED` |
| `test:invalid` (no `error_details`) | 400 `VALIDATION_FAILED`, through the status fallback |
| `test:unavailable` / `test:timeout` | 502 / 504 |
| 50 requests in a minute | 429, `retryAfterSeconds: 54`: the fixed window's remaining time |
| `organizations/enrich` through the fake, with no domain | Passed to live Apollo, which returned its real 422 (free) |

---

## 7. Interview questions

**Q: Walk me through how your app calls Apollo.**
The browser never talks to Apollo; it calls our NestJS API. A request is validated and normalized first, so bad input never costs anything. Then a thin controller calls `ApolloService`, which is the boundary of the Apollo module. It calls `ApolloClient`, the only class that speaks HTTP to Apollo, using an axios instance configured with the base URL, the key header and a timeout. The raw response goes through a pure mapper into our own `CompanyProfile` type. Errors are translated twice: into a typed Apollo error, then into our API's error envelope. Apollo's field names and error shapes never leave the module.

**Q: How do you authenticate, and how do you protect the key?**
Apollo uses an `x-api-key` header. The key lives only in the server's environment, is validated at boot, and is attached only by the Apollo module's HTTP client. It's a scoped key limited to the one endpoint we use. We never log headers or raw axios errors, because those contain the request config with the key. We disabled redirects, because axios forwards custom headers like `x-api-key` across hosts and only strips `Authorization` and `Cookie`.

**Q: Apollo returns 401, 403, 422, 429 and 500. How do you handle them?**
I branch on `error_details.code`, not on the status, because the status is ambiguous: a missing key comes back as 422. Auth and permission problems become a 502 to our client, since the broken credential is ours, not the user's. A rate limit stays a 429 with `retryAfterSeconds` and a `Retry-After` header. Server errors and network failures become 502, and timeouts 504. Every error carries Apollo's request id for support, but never Apollo's own message.

**Q: What does your code do when Apollo can't find the company?**
Apollo returns `200` with an empty object, not a 404; we found that with a raw call because the docs don't say. The service checks for a missing `organization` and returns our own 404 `NOT_FOUND`.

**Q: How do you avoid wasting credits?**
- Validate and normalize the domain before calling Apollo, so invalid input and duplicate spellings cost nothing.
- Use a scoped key.
- Never auto-retry a credit-spending call, because a timeout doesn't mean it wasn't charged.
- In the coming phases: check our database before enriching a domain we already have, and require an explicit user action with the cost shown.

**Q: What's the difference between `API_RATE_LIMIT_EXCEEDED` and `PLATFORM_RATE_LIMIT`?**
`API_RATE_LIMIT_EXCEEDED` means our team used up a minute, hour or day window for that endpoint. The `Retry-After` header says how long to wait, and `context.window.value` says which window. `PLATFORM_RATE_LIMIT` means Apollo as a whole is under load. It has no `Retry-After` header, so we read `retry_after_seconds` from the suggestions. Our code handles both through the same `retryAfterSeconds` field.

**Q: Are limits per API key?**
No. They're per team and per endpoint. Creating more keys doesn't raise them.

**Q: Apollo removes its legacy error fields on 2027-02-16. Are you affected?**
No. We only read `error_details`; the legacy `error`, `error_code` and `message` fields aren't even in our types.

**Q: Why did you type only part of the response?**
I typed the fields we use, from a real response, and made them optional. The real response didn't match the docs: documented fields were missing and undocumented ones were present. A full type would claim guarantees the API doesn't give. The mapper handles missing values in one place.

**Q: How do you test an integration without calling the real API?**
- Unit tests for the pure parts (mapper, error translation, headers), using a real response saved as a sanitized fixture.
- An end-to-end test that starts a fake Apollo HTTP server and points the base URL at it. That tests real axios behavior: the headers sent, query encoding, timeouts and error parsing.
- Live calls only by hand, and on purpose, because they cost credits.

**Q: What happens if Apollo is slow?**
The axios timeout is 10 seconds; the default would wait forever. After that we answer 504, and nothing retries the call automatically. Free endpoints could be retried with backoff and jitter later. Paid ones shouldn't be, because the timed-out call may still have been charged.

**Q: Your Apollo plan couldn't call People Search. How did you build it?**
I built a small fake Apollo server that serves the documented response shapes and the behavior we observed live. That covers masked names, the 500-page cap, rate-limit headers with fixed windows, and the real error bodies. It passes every other request through to the real API, so company enrichment stays live. Our server only knows `APOLLO_BASE_URL`, so the integration code is identical for the fake and the real Apollo. With a paid plan, I'd change one environment variable.

**Q: How does pagination work with Apollo?**
`page` and `per_page`, at most 100 per page and 500 pages. The search returns only `total_entries`, so I compute `totalPages = min(ceil(total / perPage), 500)` and the next/previous flags myself. The cap is on pages, so the page size decides how deep you can go: 100 per page reaches 50,000 records, while 10 per page reaches only 5,000. A page past the end is an empty 200, not an error. It's offset pagination, so results can shift between requests; we deduplicate by Apollo id when saving.

**Q: How do you send array filters?**
Apollo uses repeated keys with brackets, like `person_titles[]=CTO&person_titles[]=VP`, which is also axios's default array format. Our own API takes repeated plain keys (`titles=CTO&titles=VP`), validates them with Zod, and a mapper converts them. Company sizes become Apollo's `min,max` ranges, and empty filters aren't sent at all.

**Q: Why does search return `Wa***h` instead of a last name, and no email?**
The People API Search is free (0 credits) precisely because it returns only teaser data: first name, masked last name, title, company name, and flags saying whether an email or phone exists. Full details cost credits through people enrichment. Our data model keeps `lastNameMasked` and the availability flags separate from the enriched fields for that reason.

**Q: How do you know you're close to the rate limit?**
Every response carries `x-minute|hourly|24-hour-requests-left`. We log them on each call, and the UI's usage meter will show them. Limits are fixed windows per team and per endpoint: 50/min, 200/hour and 600/day on the Free plan. When one runs out, the 429's `Retry-After` header says when that window resets; in our run that was 54 seconds.
