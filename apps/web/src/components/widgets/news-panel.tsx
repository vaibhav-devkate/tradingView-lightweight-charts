"use client";

import { useMemo } from "react";
import { demoNews } from "@/lib/demo/fixtures";
import { useChartStore } from "@/lib/stores/chart-store";
import { formatIstTime } from "../chart/time-format";
import { DemoBadge, Panel } from "../terminal/primitives";

export function NewsPanel({ className }: { className?: string }) {
  const items = useMemo(() => demoNews(), []);
  const symbol = useChartStore((s) => s.symbol);
  return (
    <Panel title="News" badge={<DemoBadge title="Placeholder headlines — not real news" />} className={className}>
      <p className="border-b px-2.5 py-1.5 text-[10px] leading-snug text-muted-foreground">
        Placeholder items. Connect a licensed news provider to show real headlines.
      </p>
      <ul>
        {items.map((n) => (
          <li key={n.id} className="border-b border-border/60 px-2.5 py-1.5 last:border-b-0">
            <p className="text-xs leading-snug">{n.headline}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="num">{formatIstTime(n.publishedAt)} IST</span>
              <span>· {n.source}</span>
              {n.symbols.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => useChartStore.getState().setSymbol(s)}
                  className={
                    s === symbol
                      ? "rounded-sm bg-primary/15 px-1 text-primary"
                      : "rounded-sm bg-muted px-1 hover:text-foreground"
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
