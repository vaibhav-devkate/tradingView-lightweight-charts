"use client";

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNow } from "@/hooks/use-market-data";
import { getLiveFeed, useFeedStatus } from "@/lib/market-data/live-feed";
import { ChartWidget } from "../chart/chart-widget";
import { formatIstTime } from "../chart/time-format";
import { WatchlistPanel } from "../watchlist/watchlist-panel";
import { AccountPanel } from "../widgets/account-panel";
import { MarketOverview } from "../widgets/market-overview";
import { NewsPanel } from "../widgets/news-panel";
import { PortfolioSummary } from "../widgets/portfolio-summary";
import { SymbolSearch } from "./symbol-search";
import { TopBar } from "./top-bar";

/**
 * Phase 1–2 layout: a fixed, responsive grid of widgets. Every widget is a
 * self-contained component, so Phase 3 can place the same components in a
 * draggable/resizable grid with per-user saved layouts.
 */
export function Terminal() {
  useEffect(() => getLiveFeed().start(), []);

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex min-h-dvh flex-col bg-app text-foreground xl:h-dvh">
        <TopBar />
        <main className="grid flex-1 grid-cols-1 gap-1 p-1 lg:grid-cols-[272px_minmax(0,1fr)] xl:min-h-0 xl:grid-cols-[288px_minmax(0,1fr)_312px]">
          <WatchlistPanel className="h-[440px] lg:h-auto xl:min-h-0" />
          <div className="flex min-w-0 flex-col gap-1 xl:min-h-0">
            <div className="h-[460px] overflow-hidden rounded-md border sm:h-[540px] xl:h-auto xl:min-h-0 xl:flex-1">
              <ChartWidget />
            </div>
            <AccountPanel className="h-[250px] shrink-0 xl:h-[232px]" />
          </div>
          <aside className="grid gap-1 lg:col-span-2 lg:grid-cols-3 xl:col-span-1 xl:flex xl:min-h-0 xl:flex-col">
            <MarketOverview className="shrink-0" />
            <PortfolioSummary className="shrink-0" />
            <NewsPanel className="max-h-80 xl:max-h-none xl:min-h-24 xl:flex-1" />
          </aside>
        </main>
        <StatusBar />
      </div>
      <SymbolSearch />
    </TooltipProvider>
  );
}

function StatusBar() {
  const now = useNow(1000);
  const state = useFeedStatus((s) => s.state);
  const info = getLiveFeed().info;
  return (
    <footer className="flex h-6 shrink-0 items-center gap-3 border-t bg-panel px-3 text-[10px] text-muted-foreground">
      <span>
        Source: <span className={info.simulated ? "font-medium text-warn" : ""}>{info.name}</span> ({state})
      </span>
      {info.simulated && (
        <span className="hidden sm:inline">
          Simulated prices for development — not real market data. Read-only; no orders are placed.
        </span>
      )}
      <span className="num ml-auto">{formatIstTime(now)} IST</span>
    </footer>
  );
}
