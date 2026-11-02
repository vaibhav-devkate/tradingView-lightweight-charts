"use client";

import { formatChange } from "@td/shared";
import { Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInstruments, useLiveQuotes, useMarketStatus } from "@/hooks/use-market-data";
import { getLiveFeed, useFeedStatus } from "@/lib/market-data/live-feed";
import { useChartStore } from "@/lib/stores/chart-store";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { ChangePct, LivePrice, toneClass } from "./primitives";

const TICKER_SYMBOLS = ["NIFTY50", "BANKNIFTY", "SENSEX", "NIFTYIT"];

export function TopBar() {
  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b bg-panel px-3">
      <div className="flex items-center gap-2">
        <Logo />
        <span className="hidden text-sm font-semibold tracking-tight lg:inline">Terminal</span>
      </div>
      <IndexStrip />
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden w-56 justify-start gap-2 text-muted-foreground md:flex"
          onClick={() => useUiStore.getState().setSearchOpen(true)}
        >
          <Search />
          <span className="text-xs">Search instruments</span>
          <kbd className="ml-auto rounded border bg-muted px-1 text-[10px]">Ctrl K</kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Search instruments"
          onClick={() => useUiStore.getState().setSearchOpen(true)}
        >
          <Search />
        </Button>
        <MarketStatusPill />
        <FeedStatus />
        <ThemeToggle />
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <rect x="3" y="9" width="3" height="9" rx="0.5" className="fill-up" />
      <rect x="4.25" y="6" width="0.5" height="15" className="fill-up" />
      <rect x="10.5" y="5" width="3" height="10" rx="0.5" className="fill-down" />
      <rect x="11.75" y="3" width="0.5" height="15" className="fill-down" />
      <rect x="18" y="7" width="3" height="11" rx="0.5" className="fill-primary" />
      <rect x="19.25" y="4" width="0.5" height="17" className="fill-primary" />
    </svg>
  );
}

function IndexStrip() {
  const quotes = useLiveQuotes(TICKER_SYMBOLS);
  const { bySymbol } = useInstruments();
  return (
    <div className="thin-scroll hidden min-w-0 items-center gap-4 overflow-x-auto md:flex">
      {TICKER_SYMBOLS.map((symbol) => {
        const q = quotes[symbol];
        return (
          <button
            key={symbol}
            type="button"
            onClick={() => useChartStore.getState().setSymbol(symbol)}
            className="flex shrink-0 items-baseline gap-1.5 rounded px-1 py-0.5 text-xs hover:bg-accent"
          >
            <span className="font-medium text-muted-foreground">{bySymbol(symbol)?.name ?? symbol}</span>
            <LivePrice symbol={symbol} className="font-medium" />
            <span className={cn("num hidden text-[11px] xl:inline", toneClass(q?.change))}>
              {q ? formatChange(q.change) : ""}
            </span>
            <ChangePct value={q?.changePct} className="text-[11px]" />
          </button>
        );
      })}
    </div>
  );
}

function MarketStatusPill() {
  const status = useMarketStatus();
  const color = status.phase === "OPEN" ? "bg-up" : status.phase === "PRE_OPEN" ? "bg-warn" : "bg-muted-foreground";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] whitespace-nowrap text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", color)} />
          <span className="hidden sm:inline">NSE</span> {status.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">
        Equity session 09:15–15:30 IST, Mon–Fri{status.reason ? ` · ${status.reason}` : ""}. Exchange holidays are not
        yet included; they will come from the exchange calendar once a provider is connected.
      </TooltipContent>
    </Tooltip>
  );
}

function FeedStatus() {
  const state = useFeedStatus((s) => s.state);
  const info = getLiveFeed().info;
  const dot = state === "connected" ? "bg-up" : state === "error" ? "bg-down" : "bg-warn animate-pulse";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
            info.simulated ? "border-warn/50 bg-warn/10 text-warn" : "text-muted-foreground",
          )}
        >
          <span className={cn("size-1.5 rounded-full", dot)} />
          {info.simulated ? "Simulated data" : info.name}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-xs">
        {info.simulated
          ? "All prices, charts and volumes are generated by a random-walk simulator for development. They are not real market data."
          : `Connected to ${info.name}.`}{" "}
        Feed: {state}.
      </TooltipContent>
    </Tooltip>
  );
}

function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <Button variant="ghost" size="icon-sm" aria-label={`Switch to ${next} theme`} onClick={() => setTheme(next)}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
