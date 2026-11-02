"use client";

import {
  computePortfolioSummary,
  formatPct,
  formatPrice,
  formatSignedINR,
  positionPnl,
  type Order,
  type OrderStatus,
} from "@td/shared";
import { useMemo, useState } from "react";
import { useInstruments, useLiveQuotes } from "@/hooks/use-market-data";
import { DEMO_HOLDINGS, DEMO_POSITIONS, demoOrders } from "@/lib/demo/fixtures";
import { useChartStore } from "@/lib/stores/chart-store";
import { cn } from "@/lib/utils";
import { formatIstTime } from "../chart/time-format";
import { DemoBadge, LivePrice, toneClass } from "../terminal/primitives";

type Tab = "positions" | "holdings" | "orders";

/** Positions / Holdings / Orders. Read-only: order placement is out of scope for v1. */
export function AccountPanel({ className }: { className?: string }) {
  const [tab, setTab] = useState<Tab>("positions");
  const orders = useMemo(() => demoOrders(), []);
  const openOrders = orders.filter((o) => o.status === "OPEN").length;

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-md border bg-panel", className)}>
      <div role="tablist" className="flex h-8 shrink-0 items-center gap-0.5 border-b bg-panel-header px-1">
        {(
          [
            ["positions", `Positions (${DEMO_POSITIONS.length})`],
            ["holdings", `Holdings (${DEMO_HOLDINGS.length})`],
            ["orders", `Orders (${openOrders} open)`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "h-6 rounded px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
              tab === id && "bg-accent font-medium text-foreground",
            )}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pr-1.5">
          <span className="hidden text-[10px] text-muted-foreground sm:inline">Read-only</span>
          <DemoBadge title="Fictional account data for development" />
        </div>
      </div>
      <div className="thin-scroll min-h-0 flex-1 overflow-auto">
        {tab === "positions" && <PositionsTable />}
        {tab === "holdings" && <HoldingsTable />}
        {tab === "orders" && <OrdersTable orders={orders} />}
      </div>
    </section>
  );
}

const th =
  "sticky top-0 z-[1] bg-panel px-2.5 py-1 text-[10px] font-normal tracking-wider text-muted-foreground uppercase";
const td = "px-2.5 py-1 whitespace-nowrap";

function SymbolCell({ symbol, extra }: { symbol: string; extra?: string }) {
  const { bySymbol } = useInstruments();
  const inst = bySymbol(symbol);
  return (
    <td className={cn(td, "text-left")}>
      <button
        type="button"
        className="font-medium hover:text-primary"
        onClick={() => useChartStore.getState().setSymbol(symbol)}
      >
        {inst?.type === "INDEX" ? inst.name : symbol}
      </button>
      {extra && <span className="ml-1.5 rounded-sm bg-muted px-1 text-[9px] text-muted-foreground">{extra}</span>}
    </td>
  );
}

function PositionsTable() {
  const quotes = useLiveQuotes(DEMO_POSITIONS.map((p) => p.symbol));
  const rows = DEMO_POSITIONS.map((p) => {
    const ltp = quotes[p.symbol]?.ltp;
    return { ...p, ltp, pnl: ltp === undefined ? null : positionPnl(p, ltp) };
  });
  const total = rows.reduce((s, r) => s + (r.pnl ?? 0), 0);
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="text-right">
          <th className={cn(th, "text-left")}>Instrument</th>
          <th className={th}>Qty</th>
          <th className={th}>Avg</th>
          <th className={th}>LTP</th>
          <th className={th}>P&L</th>
          <th className={th}>Chg%</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.symbol}-${r.product}`} className="border-t border-border/60 text-right hover:bg-row-hover">
            <SymbolCell symbol={r.symbol} extra={r.product} />
            <td className={cn(td, "num", r.quantity < 0 ? "text-down" : "text-up")}>{r.quantity}</td>
            <td className={cn(td, "num")}>{formatPrice(r.avgPrice)}</td>
            <td className={td}>
              <LivePrice symbol={r.symbol} />
            </td>
            <td className={cn(td, "num", toneClass(r.pnl))}>{r.pnl === null ? "—" : formatSignedINR(r.pnl)}</td>
            <td
              className={cn(
                td,
                "num",
                toneClass(r.ltp === undefined ? null : (r.ltp - r.avgPrice) * Math.sign(r.quantity)),
              )}
            >
              {r.ltp === undefined ? "—" : formatPct(((r.ltp - r.avgPrice) / r.avgPrice) * 100 * Math.sign(r.quantity))}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t text-right">
          <td className={cn(td, "text-left text-muted-foreground")} colSpan={4}>
            Total
          </td>
          <td className={cn(td, "num font-semibold", toneClass(total))}>{formatSignedINR(total)}</td>
          <td />
        </tr>
      </tfoot>
    </table>
  );
}

function HoldingsTable() {
  const quotes = useLiveQuotes(DEMO_HOLDINGS.map((h) => h.symbol));
  const summary = useMemo(() => computePortfolioSummary(DEMO_HOLDINGS, quotes), [quotes]);
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="text-right">
          <th className={cn(th, "text-left")}>Instrument</th>
          <th className={th}>Qty</th>
          <th className={th}>Avg cost</th>
          <th className={th}>LTP</th>
          <th className={th}>Cur. value</th>
          <th className={th}>P&L</th>
          <th className={th}>Net chg</th>
          <th className={th}>Day chg</th>
        </tr>
      </thead>
      <tbody>
        {summary.holdings.map((h) => (
          <tr key={h.symbol} className="border-t border-border/60 text-right hover:bg-row-hover">
            <SymbolCell symbol={h.symbol} />
            <td className={cn(td, "num")}>{h.quantity}</td>
            <td className={cn(td, "num")}>{formatPrice(h.avgPrice)}</td>
            <td className={td}>
              <LivePrice symbol={h.symbol} />
            </td>
            <td className={cn(td, "num")}>{formatPrice(h.currentValue)}</td>
            <td className={cn(td, "num", toneClass(h.pnl))}>{formatSignedINR(h.pnl)}</td>
            <td className={cn(td, "num", toneClass(h.pnlPct))}>{formatPct(h.pnlPct)}</td>
            <td className={cn(td, "num", toneClass(h.dayChangePct))}>{formatPct(h.dayChangePct)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  OPEN: "bg-primary/15 text-primary",
  COMPLETE: "bg-up-soft text-up",
  CANCELLED: "bg-muted text-muted-foreground",
  REJECTED: "bg-down-soft text-down",
};

function OrdersTable({ orders }: { orders: Order[] }) {
  return (
    <table className="w-full border-collapse text-xs">
      <thead>
        <tr className="text-right">
          <th className={cn(th, "text-left")}>Time</th>
          <th className={cn(th, "text-left")}>Type</th>
          <th className={cn(th, "text-left")}>Instrument</th>
          <th className={th}>Qty</th>
          <th className={th}>Price</th>
          <th className={th}>Avg</th>
          <th className={cn(th, "text-left")}>Status</th>
        </tr>
      </thead>
      <tbody>
        {[...orders].reverse().map((o) => (
          <tr key={o.id} className="border-t border-border/60 text-right hover:bg-row-hover">
            <td className={cn(td, "num text-left text-muted-foreground")}>{formatIstTime(o.placedAt)}</td>
            <td className={cn(td, "text-left")}>
              <span
                className={cn(
                  "mr-1.5 rounded-sm px-1 text-[10px] font-semibold",
                  o.side === "BUY" ? "bg-primary/15 text-primary" : "bg-down-soft text-down",
                )}
              >
                {o.side}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {o.type} · {o.product}
              </span>
            </td>
            <SymbolCell symbol={o.symbol} />
            <td className={cn(td, "num")}>
              {o.filledQuantity}/{o.quantity}
            </td>
            <td className={cn(td, "num")}>{o.price === null ? "MKT" : formatPrice(o.price)}</td>
            <td className={cn(td, "num")}>{o.averagePrice === null ? "—" : formatPrice(o.averagePrice)}</td>
            <td className={cn(td, "text-left")}>
              <span className={cn("rounded-sm px-1.5 py-px text-[10px] font-medium", STATUS_STYLE[o.status])}>
                {o.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
