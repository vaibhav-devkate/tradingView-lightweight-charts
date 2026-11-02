"use client";

import { formatPrice, formatVolume, searchInstruments, type Quote } from "@td/shared";
import { ArrowDown, ArrowUp, CandlestickChart, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useInstruments, useLiveQuotes } from "@/hooks/use-market-data";
import { useChartStore } from "@/lib/stores/chart-store";
import {
  MAX_SYMBOLS_PER_WATCHLIST,
  MAX_WATCHLISTS,
  useWatchlistStore,
  type WatchlistSortKey,
} from "@/lib/stores/watchlist-store";
import { cn } from "@/lib/utils";
import { ChangePct, LivePrice } from "../terminal/primitives";

export function WatchlistPanel({ className }: { className?: string }) {
  const lists = useWatchlistStore((s) => s.lists);
  const activeId = useWatchlistStore((s) => s.activeId);
  const sort = useWatchlistStore((s) => s.sort);
  const store = useWatchlistStore.getState();
  const active = lists.find((l) => l.id === activeId) ?? lists[0]!;
  const quotes = useLiveQuotes(active.symbols);
  const chartSymbol = useChartStore((s) => s.symbol);
  const [renaming, setRenaming] = useState<string | null>(null);

  const rows = useMemo(() => sortSymbols(active.symbols, quotes, sort.key, sort.dir), [active.symbols, quotes, sort]);

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-md border bg-panel", className)}>
      <div className="flex h-8 shrink-0 items-center gap-0.5 border-b bg-panel-header px-1">
        <div className="thin-scroll flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {lists.map((l) =>
            renaming === l.id ? (
              <Input
                key={l.id}
                autoFocus
                defaultValue={l.name}
                maxLength={24}
                aria-label="Watchlist name"
                className="h-6 w-24 px-1.5 text-xs"
                onBlur={(e) => {
                  store.rename(l.id, e.target.value);
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setRenaming(null);
                }}
              />
            ) : (
              <button
                key={l.id}
                type="button"
                onClick={() => store.setActive(l.id)}
                onDoubleClick={() => setRenaming(l.id)}
                className={cn(
                  "h-6 shrink-0 rounded px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
                  l.id === active.id && "bg-accent font-medium text-foreground",
                )}
              >
                {l.name}
              </button>
            ),
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="New watchlist"
          title={lists.length >= MAX_WATCHLISTS ? `Up to ${MAX_WATCHLISTS} watchlists` : "New watchlist"}
          disabled={lists.length >= MAX_WATCHLISTS}
          onClick={() => store.create()}
        >
          <Plus />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Watchlist options">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="text-xs" onSelect={() => setRenaming(active.id)}>
              <Pencil /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-xs"
              variant="destructive"
              disabled={lists.length <= 1}
              onSelect={() => store.remove(active.id)}
            >
              <Trash2 /> Delete list
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddSymbol listId={active.id} existing={active.symbols} />

      <div className="grid shrink-0 grid-cols-[1fr_auto_auto] gap-x-3 border-b px-2.5 py-1 text-[10px] tracking-wider text-muted-foreground uppercase">
        <SortHeader label="Symbol" k="symbol" />
        <SortHeader label="LTP" k="ltp" className="w-20 justify-end" />
        <SortHeader label="Chg%" k="changePct" className="w-14 justify-end" />
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            This watchlist is empty. Search above to add instruments.
          </p>
        )}
        {rows.map((symbol) => (
          <WatchlistRow
            key={symbol}
            symbol={symbol}
            quote={quotes[symbol]}
            selected={symbol === chartSymbol}
            onRemove={() => store.removeSymbol(active.id, symbol)}
          />
        ))}
      </div>
      <div className="flex h-6 shrink-0 items-center justify-between border-t px-2.5 text-[10px] text-muted-foreground">
        <span>
          {active.symbols.length} / {MAX_SYMBOLS_PER_WATCHLIST}
        </span>
        <span>
          Sort:{" "}
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => sort.key && store.toggleSort(sort.key)}
          >
            {sort.key ? `${sort.key === "changePct" ? "Chg%" : sort.key.toUpperCase()} ${sort.dir}` : "manual"}
          </button>
        </span>
      </div>
    </section>
  );
}

function SortHeader({ label, k, className }: { label: string; k: WatchlistSortKey; className?: string }) {
  const sort = useWatchlistStore((s) => s.sort);
  const active = sort.key === k;
  return (
    <button
      type="button"
      onClick={() => useWatchlistStore.getState().toggleSort(k)}
      className={cn("flex items-center gap-0.5 hover:text-foreground", active && "text-foreground", className)}
    >
      {label}
      {active && (sort.dir === "asc" ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />)}
    </button>
  );
}

function WatchlistRow({
  symbol,
  quote,
  selected,
  onRemove,
}: {
  symbol: string;
  quote: Quote | undefined;
  selected: boolean;
  onRemove: () => void;
}) {
  const { bySymbol } = useInstruments();
  const inst = bySymbol(symbol);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => useChartStore.getState().setSymbol(symbol)}
      onKeyDown={(e) => e.key === "Enter" && useChartStore.getState().setSymbol(symbol)}
      className={cn(
        "group relative grid cursor-pointer grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-px border-b border-border/60 px-2.5 py-1 outline-none hover:bg-row-hover focus-visible:bg-row-hover",
        selected && "bg-row-hover shadow-[inset_2px_0_0_var(--primary)]",
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate text-xs font-medium">{inst?.type === "INDEX" ? inst.name : symbol}</span>
        {inst?.type === "INDEX" && <span className="text-[9px] text-muted-foreground">IDX</span>}
      </div>
      <LivePrice symbol={symbol} className="w-20 text-right text-xs" />
      <ChangePct value={quote?.changePct} className="w-14 text-right text-xs" />
      <div className="num col-span-3 flex gap-2 truncate text-[10px] text-muted-foreground">
        {quote ? (
          <>
            <span>H {formatPrice(quote.high)}</span>
            <span>L {formatPrice(quote.low)}</span>
            {quote.volume > 0 && <span className="ml-auto">Vol {formatVolume(quote.volume)}</span>}
          </>
        ) : (
          <span>…</span>
        )}
      </div>

      <div className="absolute inset-y-0 right-1 hidden items-center gap-0.5 bg-gradient-to-l from-row-hover from-70% pl-6 group-hover:flex group-focus-visible:flex">
        <Button
          variant="secondary"
          size="icon-xs"
          aria-label={`Chart ${symbol}`}
          onClick={(e) => {
            e.stopPropagation();
            useChartStore.getState().setSymbol(symbol);
          }}
        >
          <CandlestickChart />
        </Button>
        <Button
          variant="secondary"
          size="icon-xs"
          aria-label={`Remove ${symbol}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X />
        </Button>
      </div>
    </div>
  );
}

function AddSymbol({ listId, existing }: { listId: string; existing: string[] }) {
  const { instruments } = useInstruments();
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => (query.trim() ? searchInstruments(instruments, query, 8) : []), [instruments, query]);
  const full = existing.length >= MAX_SYMBOLS_PER_WATCHLIST;

  const add = (symbol: string) => {
    useWatchlistStore.getState().addSymbol(listId, symbol);
    setQuery("");
    setHighlight(0);
  };

  return (
    <div className="relative shrink-0 border-b p-1.5">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        disabled={full}
        onChange={(e) => {
          setQuery(e.target.value);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setHighlight((h) => Math.min(h + 1, results.length - 1));
          else if (e.key === "ArrowUp") setHighlight((h) => Math.max(h - 1, 0));
          else if (e.key === "Enter" && results[highlight]) add(results[highlight]!.symbol);
          else if (e.key === "Escape") setQuery("");
        }}
        placeholder={full ? "Watchlist is full" : "Search & add (e.g. infy, bank)"}
        aria-label="Add instrument to watchlist"
        className="h-7 pl-7 text-xs"
      />
      {results.length > 0 && (
        <div className="absolute inset-x-1.5 top-full z-30 mt-0.5 overflow-hidden rounded-md border bg-popover shadow-lg">
          {results.map((inst, i) => {
            const added = existing.includes(inst.symbol);
            return (
              <button
                key={inst.symbol}
                type="button"
                disabled={added}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(inst.symbol)}
                className={cn(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs disabled:opacity-50",
                  i === highlight && "bg-accent",
                )}
              >
                <span className="w-20 shrink-0 font-medium">{inst.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{inst.name}</span>
                <span className="text-[10px] text-muted-foreground">{added ? "Added" : inst.exchange}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function sortSymbols(
  symbols: string[],
  quotes: Record<string, Quote | undefined>,
  key: WatchlistSortKey | null,
  dir: "asc" | "desc",
): string[] {
  if (!key) return symbols;
  const sign = dir === "asc" ? 1 : -1;
  return [...symbols].sort((a, b) => {
    if (key === "symbol") return a.localeCompare(b) * sign;
    const qa = quotes[a]?.[key];
    const qb = quotes[b]?.[key];
    if (qa === undefined) return 1;
    if (qb === undefined) return -1;
    return (qa - qb) * sign;
  });
}
