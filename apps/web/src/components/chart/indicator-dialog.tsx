"use client";

import { INDICATOR_DEFINITIONS, indicatorLabel, type IndicatorConfig, type IndicatorType } from "@td/shared";
import { Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useChartStore } from "@/lib/stores/chart-store";

const ORDER: IndicatorType[] = ["sma", "ema", "bb", "vwap", "volume", "rsi", "macd"];

export function IndicatorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const indicators = useChartStore((s) => s.indicators);
  const addIndicator = useChartStore((s) => s.addIndicator);
  const resetIndicators = useChartStore((s) => s.resetIndicators);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] gap-3 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-sm">Indicators</DialogTitle>
          <DialogDescription className="text-xs">
            Add studies and tune their inputs. Settings are saved with your chart preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 grid-cols-1 border-t sm:grid-cols-[200px_1fr]">
          <div className="border-b p-2 sm:border-r sm:border-b-0">
            <div className="px-2 pb-1 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">Add</div>
            {ORDER.map((type) => {
              const def = INDICATOR_DEFINITIONS[type];
              const disabled = !def.allowMultiple && indicators.some((i) => i.type === type);
              return (
                <button
                  key={type}
                  type="button"
                  disabled={disabled}
                  onClick={() => addIndicator(type)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span>
                    <span className="font-medium">{def.shortName}</span>{" "}
                    <span className="text-muted-foreground">{def.name !== def.shortName ? def.name : ""}</span>
                  </span>
                  {!disabled && <Plus className="size-3.5 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
          <div className="thin-scroll max-h-[60vh] overflow-y-auto p-2">
            <div className="flex items-center justify-between px-2 pb-1">
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">On chart</span>
              <Button variant="ghost" size="xs" onClick={resetIndicators}>
                <RotateCcw /> Defaults
              </Button>
            </div>
            {indicators.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">No indicators on the chart.</p>
            )}
            <div className="flex flex-col gap-1.5">
              {indicators.map((ind) => (
                <IndicatorRow key={ind.id} config={ind} />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IndicatorRow({ config }: { config: IndicatorConfig }) {
  const def = INDICATOR_DEFINITIONS[config.type];
  const update = useChartStore((s) => s.updateIndicator);
  const remove = useChartStore((s) => s.removeIndicator);
  // Local drafts so typing "2" on the way to "20" isn't clamped mid-edit.
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(config.params).map(([k, v]) => [k, String(v)])),
  );

  const commit = () => {
    const params = Object.fromEntries(def.params.map((p) => [p.key, Number(draft[p.key])]));
    update(config.id, { params });
    // Reflect clamped values back into the inputs.
    const next = useChartStore.getState().indicators.find((i) => i.id === config.id);
    if (next) setDraft(Object.fromEntries(Object.entries(next.params).map(([k, v]) => [k, String(v)])));
  };

  return (
    <div className="rounded-md border bg-panel-header/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{indicatorLabel(config)}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={config.visible ? "Hide" : "Show"}
            onClick={() => update(config.id, { visible: !config.visible })}
          >
            {config.visible ? <Eye /> : <EyeOff />}
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Remove" onClick={() => remove(config.id)}>
            <Trash2 />
          </Button>
        </div>
      </div>
      {(def.params.length > 0 || def.outputs.length > 0) && (
        <div className="mt-1.5 flex flex-wrap items-end gap-x-3 gap-y-2">
          {def.params.map((p) => (
            <label key={p.key} className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              {p.label}
              <Input
                type="number"
                inputMode="decimal"
                min={p.min}
                max={p.max}
                step={p.step}
                value={draft[p.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [p.key]: e.target.value }))}
                onBlur={commit}
                onKeyDown={(e) => e.key === "Enter" && commit()}
                className="num h-7 w-20 px-2 text-xs"
              />
            </label>
          ))}
          {config.type !== "volume" &&
            def.outputs.map((o) => (
              <label key={o.key} className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
                {o.label}
                <input
                  type="color"
                  value={config.colors[o.key] ?? o.defaultColor}
                  onChange={(e) => update(config.id, { colors: { [o.key]: e.target.value } })}
                  className="h-7 w-10 cursor-pointer rounded border bg-transparent p-0.5"
                />
              </label>
            ))}
        </div>
      )}
    </div>
  );
}
