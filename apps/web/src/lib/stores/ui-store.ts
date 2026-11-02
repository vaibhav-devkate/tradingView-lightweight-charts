import { create } from "zustand";

interface UiState {
  /** Global symbol search (Ctrl/⌘+K). */
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
}));
