"use client";

import { computePortfolioSummary, formatINR, formatPct, formatSignedINR } from "@td/shared";
import { useMemo } from "react";
import { useInstruments, useLiveQuotes } from "@/hooks/use-market-data";
import { DEMO_HOLDINGS } from "@/lib/demo/fixtures";
import { cn } from "@/lib/utils";
import { DemoBadge, Panel, toneClass } from "../terminal/primitives";

const SECTOR_COLORS = ["#2962ff", "#f5a623", "#9c6ade", "#00a3b8", "#e91e63", "#7cb342", "#ff7043", "#8d6e63"];

export function PortfolioSummary({ className }: { className?: string }) {
  const quotes = useLiveQuotes(DEMO_HOLDINGS.map((h) => h.symbol));
  const { bySymbol } = useInstruments();
  const summary = useMemo(
    () => computePortfolioSummary(DEMO_HOLDINGS, quotes, (s) => bySymbol(s)?.sector ?? "Other"),
    [quotes, bySymbol],
  );

  return (
    <Panel
      title="Portfolio"
      badge={<DemoBadge title="Demo portfolio priced against simulated quotes" />}
      className={className}
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-2.5 py-2">
        <Stat label="Current value" value={formatINR(summary.currentValue)} />
        <Stat label="Invested" value={formatINR(summary.totalInvestment)} />
        <Stat
          label="Total P&L"
          value={formatSignedINR(summary.totalPnl)}
          sub={formatPct(summary.totalPnlPct)}
          tone={toneClass(summary.totalPnl)}
        />
        <Stat
          label="Day's P&L"
          value={formatSignedINR(summary.dayPnl)}
          sub={formatPct(summary.dayPnlPct)}
          tone={toneClass(summary.dayPnl)}
        />
      </div>
      <div className="border-t px-2.5 py-2">
        <div className="mb-1.5 text-[10px] tracking-wider text-muted-foreground uppercase">Allocation by sector</div>
        <div className="flex h-2 overflow-hidden rounded-sm" role="img" aria-label="Sector allocation">
          {summary.allocationBySector.map((a, i) => (
            <div
              key={a.key}
              title={`${a.key} ${a.pct.toFixed(1)}%`}
              style={{ width: `${a.pct}%`, background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
              className="border-r border-panel last:border-r-0"
            />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
          {summary.allocationBySector.map((a, i) => (
            <div key={a.key} className="flex items-center gap-1.5 text-[11px]">
              <span
                className="size-2 shrink-0 rounded-sm"
                style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
              />
              <span className="truncate text-muted-foreground">{a.key}</span>
              <span className="num ml-auto">{a.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("num truncate text-sm font-semibold", tone)}>{value}</div>
      {sub && <div className={cn("num text-[10px]", tone)}>{sub}</div>}
    </div>
  );
}
