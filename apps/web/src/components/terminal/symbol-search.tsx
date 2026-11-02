"use client";

import { searchInstruments } from "@td/shared";
import { CandlestickChart, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useInstruments } from "@/hooks/use-market-data";
import { useChartStore } from "@/lib/stores/chart-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { useWatchlistStore } from "@/lib/stores/watchlist-store";

/** Global instrument search (Ctrl/⌘+K or "/"). Enter opens the chart; "+" adds to the active watchlist. */
export function SymbolSearch() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const { instruments } = useInstruments();
  const [query, setQuery] = useState("");
  const activeList = useWatchlistStore((s) => s.lists.find((l) => l.id === s.activeId));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        useUiStore.getState().setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => searchInstruments(instruments, query, 30), [instruments, query]);

  const openChart = (symbol: string) => {
    useChartStore.getState().setSymbol(symbol);
    setOpen(false);
    setQuery("");
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
      title="Search instruments"
      description="Search by symbol or company name"
      className="sm:max-w-lg"
    >
      {/* Results are ranked by our own search, so cmdk's filtering is disabled. */}
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search symbol or company, e.g. RELIANCE, Infosys…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="thin-scroll max-h-[min(60vh,420px)]">
          <CommandEmpty>No instruments match “{query}”.</CommandEmpty>
          <CommandGroup heading="Instruments">
            {results.map((inst) => {
              const inList = activeList?.symbols.includes(inst.symbol);
              return (
                <CommandItem
                  key={inst.symbol}
                  value={inst.symbol}
                  onSelect={() => openChart(inst.symbol)}
                  className="flex items-center gap-2 py-1.5 text-xs"
                >
                  <span className="w-24 shrink-0 font-semibold">{inst.symbol}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{inst.name}</span>
                  <span className="rounded-sm bg-muted px-1 text-[9px] text-muted-foreground">
                    {inst.exchange}
                    {inst.type === "INDEX" ? " · IDX" : ""}
                  </span>
                  <CandlestickChart className="size-3.5 text-muted-foreground" />
                  <button
                    type="button"
                    aria-label={
                      inList ? `${inst.symbol} is in ${activeList?.name}` : `Add ${inst.symbol} to ${activeList?.name}`
                    }
                    title={inList ? `In ${activeList?.name}` : `Add to ${activeList?.name}`}
                    disabled={inList}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeList) useWatchlistStore.getState().addSymbol(activeList.id, inst.symbol);
                    }}
                    className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-30"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
