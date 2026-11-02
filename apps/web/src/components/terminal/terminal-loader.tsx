"use client";

import dynamic from "next/dynamic";

/**
 * The terminal is a realtime, client-only app (live feed, canvas chart, localStorage
 * preferences), so it is not prerendered. The server ships this lightweight shell.
 */
export const TerminalLoader = dynamic(() => import("./terminal").then((m) => m.Terminal), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh flex-col bg-app">
      <div className="h-11 border-b bg-panel" />
      <div className="grid flex-1 grid-cols-1 gap-1 p-1 lg:grid-cols-[272px_1fr] xl:grid-cols-[288px_1fr_312px]">
        <div className="rounded-md border bg-panel" />
        <div className="flex items-center justify-center rounded-md border bg-panel text-xs text-muted-foreground">
          Loading terminal…
        </div>
        <div className="hidden rounded-md border bg-panel xl:block" />
      </div>
    </div>
  ),
});
