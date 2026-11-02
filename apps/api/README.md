# @td/api

Express + TypeScript + Socket.IO backend. **Not implemented yet** — arrives in Phase 4 (REST +
PostgreSQL/Prisma) and Phase 5 (WebSockets + Redis). See
[docs/IMPLEMENTATION_PLAN.md](../../docs/IMPLEMENTATION_PLAN.md).

It will reuse `@td/shared` (types, indicators, portfolio maths) and `@td/market-data`
(provider interface, aggregation, subscriptions) and is the only place broker credentials live.
