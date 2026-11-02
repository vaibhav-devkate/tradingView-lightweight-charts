"use client";

import { DEFAULT_INSTRUMENTS, formatChange, type Quote } from "@td/shared";
import { useMemo } from "react";
import { useInstruments, useLiveQuotes } from "@/hooks/use-market-data";
import { useChartStore } from "@/lib/stores/chart-store";
import { cn } from "@/lib/utils";
import { ChangePct, DemoBadge, LivePrice, Panel, toneClass } from "../terminal/primitives";

const INDICES = DEFAULT_INSTRUMENTS.filter((i) => i.type === "INDEX").map((i) => i.symbol);
const EQUITIES = DEFAULT_INSTRUMENTS.filter((i) => i.type === "EQ").map((i) => i.symbol);

export function MarketOverview({ className }: { className?: string }) {
  const indexQuotes = useLiveQuotes(INDICES);
  const eqQuotes = useLiveQuotes(EQUITIES);
  const { bySymbol } = useInstruments();

  const { gainers, losers, advances, declines, unchanged } = useMemo(() => {
    const list = Object.values(eqQuotes).filter((q): q is Quote => !!q);
    const sorted = [...list].sort((a, b) => b.changePct - a.changePct);
    return {
      gainers: sorted.filter((q) => q.changePct > 0).slice(0, 4),
      losers: sorted
        .filter((q) => q.changePct < 0)
        .reverse()
        .slice(0, 4),
      advances: list.filter((q) => q.change > 0).length,
      declines: list.filter((q) => q.change < 0).length,
      unchanged: list.filter((q) => q.change === 0).length,
    };
  }, [eqQuotes]);
  const total = advances + declines + unchanged || 1;

  return (
    <Panel
      title="Market overview"
      badge={<DemoBadge label="Sim" title="Simulated prices — not real market data" />}
      className={className}
    >
      <div className="grid grid-cols-2 gap-px bg-border">
        {INDICES.map((s) => {
          const q = indexQuotes[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => useChartStore.getState().setSymbol(s)}
              className="flex flex-col items-start gap-0.5 bg-panel px-2.5 py-1.5 text-left hover:bg-row-hover"
            >
              <span className="text-[10px] font-medium text-muted-foreground">{bySymbol(s)?.name}</span>
              <LivePrice symbol={s} className="-mx-0.5 text-sm font-semibold" />
              <span className="num flex gap-1.5 text-[10px]">
                <span className={toneClass(q?.change)}>{q ? formatChange(q.change) : "—"}</span>
                <ChangePct value={q?.changePct} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t px-2.5 py-2">
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>
            Advances <span className="num text-up">{advances}</span>
          </span>
          <span>
            Declines <span className="num text-down">{declines}</span>
          </span>
        </div>
        <div
          className="flex h-1.5 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${advances} advancing, ${declines} declining`}
        >
          <div className="bg-up" style={{ width: `${(advances / total) * 100}%` }} />
          <div className="bg-muted-foreground/40" style={{ width: `${(unchanged / total) * 100}%` }} />
          <div className="bg-down" style={{ width: `${(declines / total) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 border-t">
        <MoverList title="Top gainers" quotes={gainers} />
        <MoverList title="Top losers" quotes={losers} className="border-l" />
      </div>
    </Panel>
  );
}

function MoverList({ title, quotes, className }: { title: string; quotes: Quote[]; className?: string }) {
  return (
    <div className={cn("py-1", className)}>
      <div className="px-2.5 pb-0.5 text-[10px] tracking-wider text-muted-foreground uppercase">{title}</div>
      {quotes.length === 0 && <div className="px-2.5 py-1 text-[11px] text-muted-foreground">—</div>}
      {quotes.map((q) => (
        <button
          key={q.symbol}
          type="button"
          onClick={() => useChartStore.getState().setSymbol(q.symbol)}
          className="flex w-full items-center justify-between px-2.5 py-0.5 text-[11px] hover:bg-row-hover"
        >
          <span className="truncate font-medium">{q.symbol}</span>
          <ChangePct value={q.changePct} />
        </button>
      ))}
    </div>
  );
}
