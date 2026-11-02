# Implementation plan

Each phase leaves the app runnable. The system stays **read-only** (no order execution) until
market data and portfolio features are stable.

## Phase 1 — Dashboard UI with mock market data ✅

- pnpm monorepo: `apps/web`, `apps/api` (placeholder), `packages/shared`, `packages/market-data`
- Provider interface + simulated provider (clearly labelled), quote book, ref-counted subscriptions
- Terminal layout: top bar, watchlist, chart area, account tabs, market overview, portfolio, news
- Dark (default) and light themes; responsive layout

## Phase 2 — Interactive charts and indicators ✅

- Lightweight Charts v5: candles, OHLC, line, area; 8 timeframes; IST axis
- Live bar updates via `CandleAggregator`; pause/resume; back-paging on scroll
- SMA, EMA, BB, VWAP, Volume overlays; RSI and MACD panes; configurable inputs/colours
- Full screen, snapshot, log scale, magnet crosshair; preferences persisted

## Phase 3 — Watchlists and customizable layouts

- `react-grid-layout` dashboard: drag, resize, add/remove widgets from a widget registry
  (the Phase 1 widgets are already self-contained components)
- Multiple named dashboards per user; "restore default layout"
- Watchlist polish: drag-reorder symbols, per-list column options
- Layout schema versioning + migrations for persisted layouts

## Phase 4 — Backend APIs and PostgreSQL

- `apps/api`: Express + TypeScript, Zod request validation, central error handler, pino logging
- Prisma schema: `User`, `Watchlist`, `WatchlistItem`, `Dashboard` (layout JSON), `ChartPreference`,
  `Holding`, `Position`, `Order` (read-only mirror); migrations + seed script (demo user)
- Endpoints: `GET /api/market/overview|quotes|history`, watchlist CRUD, `GET /api/portfolio`,
  `/api/positions`, `/api/orders`, `GET|PUT /api/dashboard/layout`
- Web: replace localStorage persistence behind the existing store actions with API calls
  (optimistic updates, localStorage as offline cache)

## Phase 5 — WebSocket infrastructure

- Socket.IO server; one upstream provider connection shared by all clients
- Server-side `SubscriptionManager` per socket + global refcount; room per symbol
- Redis: latest-quote cache, pub/sub fan-out for horizontal scaling, candle cache
- Web: `SocketMarketDataClient` implementing `MarketDataClient`; selected via
  `NEXT_PUBLIC_MARKET_DATA_SOURCE=api`
- Heartbeats, reconnect with backoff + resubscribe, snapshot-on-reconnect

## Phase 6 — Real market data (FYERS / Zerodha Kite)

- Adapters in `packages/market-data/src/providers/{fyers,kite}` implementing `MarketDataProvider`
- Instrument master download + symbol mapping (internal symbol ↔ broker token)
- Token-bucket rate limiter per endpoint class; retry on `RATE_LIMITED`/`NETWORK`
- Historical candles via official APIs with Redis caching; daily access-token login flow
- Exchange holiday calendar → `getMarketStatus(…, holidays)`
- See [MARKET_DATA_PROVIDERS.md](MARKET_DATA_PROVIDERS.md)

## Phase 7 — Authentication and portfolio management

- Register/login, bcrypt/argon2 password hashing, JWT in HTTP-only `Secure` `SameSite` cookies,
  refresh-token rotation, CSRF protection for cookie auth
- Per-user authorization on every resource; rate limiting (login + API), Helmet, strict CORS
- Broker account linking (server-side token storage, encrypted at rest); holdings/positions/orders
  sync from broker (read-only)

## Phase 8 — Tests, Docker, deployment

- API integration tests (Supertest + test DB), Playwright E2E for core flows
- Dockerfiles for web/api, `docker-compose` with Postgres + Redis
- CI: `pnpm check`, build, migrations; deployment guide and environment matrix

## Out of scope for v1

Order placement/modification, alerts, drawing tools, options chain. Each would be a separate,
explicitly approved phase.
