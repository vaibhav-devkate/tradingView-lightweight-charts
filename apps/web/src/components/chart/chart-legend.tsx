"use client";

import {
  formatChange,
  formatPct,
  formatPrice,
  formatVolume,
  indicatorLabel,
  INDICATOR_DEFINITIONS,
  type IndicatorConfig,
} from "@td/shared";
import { Eye, EyeOff, Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LegendInfo } from "./chart-controller";

interface ChartLegendProps {
  symbol: string;
  name?: string;
  exchange?: string;
  timeframe: string;
  info: LegendInfo | null;
  indicators: IndicatorConfig[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: () => void;
}

export function ChartLegend({
  symbol,
  name,
  exchange = "NSE",
  timeframe,
  info,
  indicators,
  onToggle,
  onRemove,
  onEdit,
}: ChartLegendProps) {
  const c = info?.candle;
  const change = c && info?.prevClose != null ? c.close - info.prevClose : null;
  const tone = change == null ? "" : change >= 0 ? "text-up" : "text-down";

  return (
    <div className="pointer-events-none absolute top-1.5 left-2 z-10 flex max-w-[calc(100%-5rem)] flex-col items-start gap-0.5 text-[11px] leading-4 [&>*]:rounded-sm [&>*]:bg-panel/75 [&>*]:px-1 [&>*]:-mx-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold text-foreground">{symbol}</span>
        {name && <span className="hidden text-muted-foreground sm:inline">{name}</span>}
        <span className="text-muted-foreground">
          · {timeframe} · {exchange}
        </span>
      </div>
      {c && (
        <div className="num flex flex-wrap gap-x-2 text-muted-foreground">
          <span>
            O <span className={tone}>{formatPrice(c.open)}</span>
          </span>
          <span>
            H <span className={tone}>{formatPrice(c.high)}</span>
          </span>
          <span>
            L <span className={tone}>{formatPrice(c.low)}</span>
          </span>
          <span>
            C <span className={tone}>{formatPrice(c.close)}</span>
          </span>
          {change != null && info?.prevClose ? (
            <span className={tone}>
              {formatChange(change)} ({formatPct((change / info.prevClose) * 100)})
            </span>
          ) : null}
          {c.volume > 0 && <span>Vol {formatVolume(c.volume)}</span>}
        </div>
      )}
      {indicators
        .filter((ind) => ind.type !== "volume")
        .map((ind) => {
          const def = INDICATOR_DEFINITIONS[ind.type];
          const vals = info?.values[ind.id];
          return (
            <div key={ind.id} className="group pointer-events-auto flex w-fit items-center gap-1.5 hover:bg-muted!">
              <span className={cn("text-muted-foreground", !ind.visible && "line-through opacity-60")}>
                {indicatorLabel(ind)}
              </span>
              {ind.visible &&
                def.outputs.map((o) => {
                  const v = vals?.[o.key];
                  return (
                    <span key={o.key} className="num" style={{ color: ind.colors[o.key] ?? o.defaultColor }}>
                      {v == null ? "—" : formatPrice(v)}
                    </span>
                  );
                })}
              <span className="ml-0.5 hidden items-center gap-0.5 group-hover:flex">
                <LegendButton label={ind.visible ? "Hide" : "Show"} onClick={() => onToggle(ind.id)}>
                  {ind.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                </LegendButton>
                <LegendButton label="Settings" onClick={onEdit}>
                  <Settings2 className="size-3" />
                </LegendButton>
                <LegendButton label="Remove" onClick={() => onRemove(ind.id)}>
                  <X className="size-3" />
                </LegendButton>
              </span>
            </div>
          );
        })}
    </div>
  );
}

function LegendButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}
