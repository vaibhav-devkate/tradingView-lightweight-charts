# Architecture

## Overview

```
┌──────────────────────────── Browser (apps/web) ────────────────────────────┐
│                                                                            │
│  Widgets (React)          Zustand stores           Chart                   │
│  ─ Watchlist        ◄──── quotes-store ◄────┐      ChartController         │
│  ─ Market overview        watchlist-store   │      (imperative wrapper     │
│  ─ Portfolio / Account    chart-store       │       around Lightweight     │
│  ─ Top bar / News         theme / ui        │       Charts: series, panes, │
│                                             │       indicators, legend)    │
│                                             │            ▲                 │
│                                   LiveFeed (singleton)   │ bars            │
│                                   ─ SubscriptionManager  │                 │
│                                   ─ QuoteBook            │ CandleAggregator│
│                                   ─ batched store flush  │ (per chart)     │
│                                   ─ per-symbol tick fan-out ──┘            │
│                                             ▲                              │
│                                   MarketDataClient (interface)             │
└─────────────────────────────────────────────┼──────────────────────────────┘
                                              │
              Phase 1–2: MockMarketDataProvider runs in the browser (no secrets)
              Phase 5+:  Socket.IO + REST client ──► apps/api ──► FYERS / Kite adapters
```

## Packages

### `@td/shared` — pure domain logic, no I/O

| Module                   | Responsibility                                                                |
| ------------------------ | ----------------------------------------------------------------------------- |
| `types.ts`               | `Instrument`, `Quote`, `Tick`, `Candle`, `Timeframe`, `Holding`, `Order`, …   |
| `timeframe.ts`           | IST-aware bucket alignment (see below)                                        |
| `market-hours.ts`        | NSE session phase (pre-open / open / closed) from the clock + holiday set     |
| `indicators/core.ts`     | SMA, EMA, RSI (Wilder), MACD, Bollinger (population σ), session VWAP          |
| `indicators/registry.ts` | Indicator metadata (params, outputs, placement), param sanitising, dispatcher |
| `portfolio.ts`           | Holding metrics, portfolio summary, allocation, position P&L                  |
| `format.ts`              | Indian number formatting (lakh/crore), tick-size rounding                     |
| `instruments.ts`         | Initial instrument universe (metadata only, **no prices**) and ranked search  |

Everything here is deterministic and unit-tested, and is shared by the web app today and the API
later (e.g. server-side candle aggregation, portfolio valuation).

### `@td/market-data` — provider abstraction

- **`MarketDataProvider`** — the one interface every source implements: connection state,
  instruments, quote snapshots, historical candles (with `before` paging), refcount-safe
  subscribe/unsubscribe, batched tick listeners. `info.simulated` tells the UI whether it must
  label data as simulated.
- **`CandleAggregator`** — builds OHLCV bars for a timeframe from ticks. Volume comes from the
  delta of cumulative session volume (robust to dropped ticks), falling back to last-trade
  quantity. Stale ticks are ignored; the aggregator can be seeded with the last historical bar.
- **`QuoteBook`** — applies ticks on top of quote snapshots (LTP, day range, change, volume).
- **`SubscriptionManager`** — reference counting so the upstream feed sees exactly one
  subscribe/unsubscribe per symbol however many consumers exist (UI widgets now, many browser
  sockets on the server later).
- **`MockMarketDataProvider`** — seeded geometric random walk with mean reversion. History is
  generated backwards from the live price so the last bar always matches the quote; the daily
  bar before today closes exactly at `prevClose`; daily history skips weekends. Intraday history
  is a continuous 24h timeline so the demo is lively at any hour.
- `MarketDataError` — typed error codes (`RATE_LIMITED`, `AUTH_FAILED`, …) with `retryable`.

## Web app (`apps/web`)

- **Rendering** — the page is a server-rendered shell; the terminal is loaded client-only with
  `next/dynamic({ ssr: false })` because it depends on the clock, a live feed, a canvas chart and
  `localStorage`. The saved theme is applied by an inline script before first paint.
- **LiveFeed** (`lib/market-data/live-feed.ts`) owns the realtime connection. Components call
  `useLiveQuotes(symbols)`, which acquires/releases symbols. Ticks update the `QuoteBook`
  immediately but are flushed to React at most every 250 ms in one store update, so bursts of
  ticks cost one render. The chart subscribes to raw ticks for its symbol.
- **ChartController** keeps Lightweight Charts out of React's render cycle. React effects push
  configuration (theme, chart type, indicators, scale options); data flows through
  `useChartData`: load 500 bars → seed aggregator → apply ticks (coalesced per animation frame) →
  page older bars when the viewport nears the left edge (capped at 5 000 bars).
  Indicators are recomputed on each bar update (O(n), cheap at these sizes) and only the last
  point is pushed to the canvas. Pane indicators (RSI, MACD) get their own panes, which Lightweight
  Charts removes automatically when emptied.
- **State** — Zustand stores; watchlists, chart preferences and theme persist to `localStorage`
  under `td.*` keys. Their action APIs are what Phase 4 will back with the REST API.
- **Styling** — Tailwind v4 + shadcn/ui (Radix). Terminal tokens (`--panel`, `--up`, `--down`, …)
  live in `globals.css` for dark (default) and light themes; the chart palette mirrors them.

### Key decisions

| Decision                                          | Why                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Candle `time` = epoch **seconds** of bucket start | Native Lightweight Charts format; no conversion on the hot path                      |
| Intraday buckets anchored to **09:15 IST**        | Matches Kite/FYERS (1h bars are 09:15–10:15, not 09:00–10:00)                        |
| Daily/weekly buckets at IST midnight / Monday     | A day bar must not straddle two IST dates                                            |
| Index-aligned indicator outputs with `null`       | `values[i]` always belongs to `candles[i]`; no off-by-warm-up bugs                   |
| Bollinger uses population σ, EMA seeded by SMA    | Same conventions as TradingView, so values match what traders compare against        |
| Broker adapters only on the server                | Secrets/access tokens never reach the browser; one upstream connection for all users |
| Mock provider implements the real interface       | Swapping to a real feed is a configuration change, not a rewrite                     |

## Testing

`pnpm test` runs Vitest over `packages/*/src/**/*.test.ts` (54 tests): indicator maths (including
the classic Wilder RSI dataset), IST bucket alignment, market-hours phases, candle aggregation and
volume deltas, quote book, ref-counted subscriptions, portfolio maths, formatting/search, and
mock-provider invariants (OHLC validity, contiguous paging, last close = live price, weekend
skipping).
