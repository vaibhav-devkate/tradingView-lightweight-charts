"use client";

import { formatPct, formatPrice } from "@td/shared";
import { useQuotesStore } from "@/lib/stores/quotes-store";
import { cn } from "@/lib/utils";

/** Frame for every dashboard widget: compact header, optional actions, scrollable body. */
export function Panel({
  title,
  badge,
  actions,
  className,
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-md border bg-panel", className)}>
      <header className="flex h-8 shrink-0 items-center gap-2 border-b bg-panel-header px-2.5">
        <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>
        {badge}
        {actions && <div className="ml-auto flex items-center gap-0.5">{actions}</div>}
      </header>
      <div className={cn("thin-scroll min-h-0 flex-1 overflow-auto", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Marks data that is simulated or fictional. Shown wherever such data is rendered. */
export function DemoBadge({ label = "Demo", title }: { label?: string; title?: string }) {
  return (
    <span
      title={title ?? "Demo data — not real market or account data"}
      className="rounded-sm border border-warn/40 bg-warn/10 px-1 py-px text-[9px] font-semibold tracking-wider text-warn uppercase"
    >
      {label}
    </span>
  );
}

export function toneClass(value: number | null | undefined): string {
  if (value == null || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-up" : "text-down";
}

/** Live last-traded price that briefly flashes green/red when it ticks. */
export function LivePrice({ symbol, className }: { symbol: string; className?: string }) {
  const ltp = useQuotesStore((s) => s.quotes[symbol]?.ltp);
  const dir = useQuotesStore((s) => s.direction[symbol] ?? 0);
  const seq = useQuotesStore((s) => s.seq[symbol] ?? 0);
  return (
    <span
      key={seq}
      className={cn(
        "num rounded-sm px-0.5",
        seq > 0 && (dir > 0 ? "flash-up" : dir < 0 ? "flash-down" : ""),
        dir > 0 ? "text-up" : dir < 0 ? "text-down" : "text-foreground",
        className,
      )}
    >
      {ltp === undefined ? "—" : formatPrice(ltp)}
    </span>
  );
}

export function ChangePct({ value, className }: { value: number | undefined; className?: string }) {
  return <span className={cn("num", toneClass(value), className)}>{value === undefined ? "—" : formatPct(value)}</span>;
}
