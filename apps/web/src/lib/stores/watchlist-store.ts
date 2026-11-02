import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

export type WatchlistSortKey = "symbol" | "ltp" | "changePct" | "volume";

export interface WatchlistSort {
  key: WatchlistSortKey | null;
  dir: "asc" | "desc";
}

export const MAX_WATCHLISTS = 7;
export const MAX_SYMBOLS_PER_WATCHLIST = 50;

interface WatchlistState {
  lists: Watchlist[];
  activeId: string;
  sort: WatchlistSort;
  setActive: (id: string) => void;
  create: (name?: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  addSymbol: (id: string, symbol: string) => void;
  removeSymbol: (id: string, symbol: string) => void;
  toggleSort: (key: WatchlistSortKey) => void;
}

const DEFAULT_LISTS: Watchlist[] = [
  { id: "wl-1", name: "Core", symbols: ["NIFTY50", "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN"] },
  { id: "wl-2", name: "Banks", symbols: ["BANKNIFTY", "HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK"] },
  { id: "wl-3", name: "IT", symbols: ["NIFTYIT", "TCS", "INFY", "WIPRO", "HCLTECH"] },
];

function newId(): string {
  return `wl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Watchlists persisted in localStorage for now; Phase 4 moves persistence to the API
 * (per-user, in PostgreSQL) behind the same actions.
 */
export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      lists: DEFAULT_LISTS,
      activeId: DEFAULT_LISTS[0]!.id,
      sort: { key: null, dir: "desc" },
      setActive: (id) => set({ activeId: id }),
      create: (name) => {
        const { lists } = get();
        if (lists.length >= MAX_WATCHLISTS) return;
        const list: Watchlist = { id: newId(), name: name?.trim() || `List ${lists.length + 1}`, symbols: [] };
        set({ lists: [...lists, list], activeId: list.id });
      },
      rename: (id, name) =>
        set(({ lists }) => ({
          lists: lists.map((l) => (l.id === id ? { ...l, name: name.trim().slice(0, 24) || l.name } : l)),
        })),
      remove: (id) =>
        set(({ lists, activeId }) => {
          if (lists.length <= 1) return {};
          const next = lists.filter((l) => l.id !== id);
          return { lists: next, activeId: activeId === id ? next[0]!.id : activeId };
        }),
      addSymbol: (id, symbol) =>
        set(({ lists }) => ({
          lists: lists.map((l) =>
            l.id === id && !l.symbols.includes(symbol) && l.symbols.length < MAX_SYMBOLS_PER_WATCHLIST
              ? { ...l, symbols: [...l.symbols, symbol] }
              : l,
          ),
        })),
      removeSymbol: (id, symbol) =>
        set(({ lists }) => ({
          lists: lists.map((l) => (l.id === id ? { ...l, symbols: l.symbols.filter((s) => s !== symbol) } : l)),
        })),
      toggleSort: (key) =>
        set(({ sort }) => {
          if (sort.key !== key) return { sort: { key, dir: key === "symbol" ? "asc" : "desc" } };
          // Cycle: first direction -> opposite -> unsorted (manual order).
          const first = key === "symbol" ? "asc" : "desc";
          if (sort.dir === first) return { sort: { key, dir: first === "asc" ? "desc" : "asc" } };
          return { sort: { key: null, dir: "desc" } };
        }),
    }),
    { name: "td.watchlists", version: 1 },
  ),
);
