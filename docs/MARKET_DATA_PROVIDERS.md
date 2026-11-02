# Market data providers

The application consumes market data only through the `MarketDataProvider` interface in
`packages/market-data/src/provider.ts`. Adding a source means writing one adapter; nothing in the
UI changes.

| Provider | Status          | Runs where          | Credentials                         |
| -------- | --------------- | ------------------- | ----------------------------------- |
| `mock`   | ✅ Phase 1      | Browser (dev only)  | None                                |
| `fyers`  | Planned Phase 6 | **API server only** | App ID, secret, daily access token  |
| `kite`   | Planned Phase 6 | **API server only** | API key, secret, daily access token |

## Rules

1. **Official APIs only.** Use FYERS API v3 and Zerodha Kite Connect v3 under your account's
   terms. Never scrape websites or call unofficial endpoints.
2. **Secrets stay on the server.** API keys, secrets and access tokens are read from environment
   variables (or a secret manager) by `apps/api`. They are never sent to the browser and must
   never be put in `NEXT_PUBLIC_*` variables.
3. **Label simulated data.** A provider sets `info.simulated = true` if it produces synthetic data;
   the UI then shows "Simulated data" badges.
4. **Market data licensing.** Check your broker/exchange agreement before redistributing live
   data to other users.

## Adapter checklist

An adapter implements `MarketDataProvider` and is responsible for:

- **Auth** — both brokers issue an access token through a browser login redirect that is valid
  for one trading day. The API exposes a login callback route, exchanges the auth/request code
  for a token server-side and stores it (encrypted) for that day.
- **Instrument master** — download the broker's instrument list at startup and map our symbols
  (`RELIANCE`, `NIFTY50`) to broker identifiers (FYERS `NSE:RELIANCE-EQ`, Kite `instrument_token`).
- **Quotes** — `getQuotes` via the broker quote endpoint (batch symbols per request).
- **History** — `getHistory` via the historical-candles endpoint; map our timeframes to the
  broker's resolutions, convert timestamps to epoch seconds and page by date range for `before`.
  Cache results (Redis) because historical endpoints are tightly rate limited.
- **Streaming** — connect the broker WebSocket, subscribe/unsubscribe on demand (the server's
  `SubscriptionManager` ensures one upstream subscription per symbol), normalise messages to
  `Tick` with `cumulativeVolume` so `CandleAggregator` computes volumes correctly.
- **Resilience** — exponential backoff reconnect with resubscribe; heartbeat/staleness detection;
  map failures to `MarketDataError` codes (`AUTH_FAILED` when the daily token expires,
  `RATE_LIMITED`, `NETWORK`).
- **Rate limits** — enforce the broker's currently published limits with a token bucket per
  endpoint class (quotes, history, orders) and queue/retry on `RATE_LIMITED`. Limits change;
  confirm them in the official docs instead of hard-coding assumptions.

## FYERS API v3

- Docs: <https://myapi.fyers.in/docsv3>
- Create an app in the FYERS API dashboard and set its redirect URI to the API's callback route.
- Server environment:

  ```
  MARKET_DATA_PROVIDER=fyers
  FYERS_APP_ID=XXXXXXXX-100
  FYERS_SECRET_KEY=...
  FYERS_REDIRECT_URI=http://localhost:4000/api/auth/fyers/callback
  ```

## Zerodha Kite Connect v3

- Docs: <https://kite.trade/docs/connect/v3/>
- Create a Kite Connect app; historical data may require the separate historical-data
  subscription on your developer account.
- Server environment:

  ```
  MARKET_DATA_PROVIDER=kite
  KITE_API_KEY=...
  KITE_API_SECRET=...
  KITE_REDIRECT_URI=http://localhost:4000/api/auth/kite/callback
  ```

## Switching the web app to the API (Phase 5+)

```
# apps/web/.env.local
NEXT_PUBLIC_MARKET_DATA_SOURCE=api
NEXT_PUBLIC_API_URL=http://localhost:4000
```

The browser then connects to our API over Socket.IO/REST; the API holds the broker connection.
