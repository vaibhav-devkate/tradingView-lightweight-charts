"use client";

import { isIntraday, TIMEFRAME_LABELS, TIMEFRAMES, type ChartType } from "@td/shared";
import {
  AlertTriangle,
  CandlestickChart,
  Camera,
  ChartArea,
  ChartLine,
  ChevronDown,
  Crosshair,
  Expand,
  FunctionSquare,
  Loader2,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useInstruments } from "@/hooks/use-market-data";
import { useChartStore } from "@/lib/stores/chart-store";
import { useThemeStore } from "@/lib/stores/theme-store";
import { useUiStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";
import { ChartController, type LegendInfo } from "./chart-controller";
import { ChartLegend } from "./chart-legend";
import { CHART_PALETTES } from "./chart-theme";
import { IndicatorDialog } from "./indicator-dialog";
import { useChartData } from "./use-chart-data";

const CHART_TYPES: { type: ChartType; label: string; icon: typeof CandlestickChart }[] = [
  { type: "candlestick", label: "Candles", icon: CandlestickChart },
  { type: "ohlc", label: "OHLC bars", icon: CandlestickChart },
  { type: "line", label: "Line", icon: ChartLine },
  { type: "area", label: "Area", icon: ChartArea },
];

export function ChartWidget() {
  const symbol = useChartStore((s) => s.symbol);
  const timeframe = useChartStore((s) => s.timeframe);
  const chartType = useChartStore((s) => s.chartType);
  const indicators = useChartStore((s) => s.indicators);
  const live = useChartStore((s) => s.live);
  const magnet = useChartStore((s) => s.crosshairMagnet);
  const logScale = useChartStore((s) => s.logScale);
  const actions = useChartStore.getState();
  const theme = useThemeStore((s) => s.theme);
  const { bySymbol } = useInstruments();

  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<ChartController | null>(null);
  const [legend, setLegend] = useState<LegendInfo | null>(null);
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const loadOlderRef = useRef<() => void>(() => {});

  // Create the chart once; configuration effects below keep it in sync with the store.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const s = useChartStore.getState();
    const ctrl = new ChartController(
      el,
      {
        palette: CHART_PALETTES[useThemeStore.getState().theme],
        chartType: s.chartType,
        intraday: isIntraday(s.timeframe),
      },
      { onLegend: setLegend, onNeedOlder: () => loadOlderRef.current() },
    );
    setController(ctrl);
    return () => {
      ctrl.destroy();
      setController(null);
    };
  }, []);

  useEffect(() => controller?.setPalette(CHART_PALETTES[theme]), [controller, theme]);
  useEffect(() => controller?.setChartType(chartType), [controller, chartType]);
  useEffect(() => controller?.setIntraday(isIntraday(timeframe)), [controller, timeframe]);
  useEffect(() => controller?.setCrosshairMagnet(magnet), [controller, magnet]);
  useEffect(() => controller?.setLogScale(logScale), [controller, logScale]);
  useEffect(() => controller?.setIndicators(indicators), [controller, indicators]);

  const { state, loadOlder, reload } = useChartData(controller, symbol, timeframe, live);
  useEffect(() => {
    loadOlderRef.current = loadOlder;
  });

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frameRef.current?.requestFullscreen();
  }, []);

  const screenshot = useCallback(() => {
    const canvas = controller?.screenshot();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${symbol}-${timeframe}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.png`;
    a.click();
  }, [controller, symbol, timeframe]);

  const typeMeta = CHART_TYPES.find((c) => c.type === chartType) ?? CHART_TYPES[0]!;
  const instrument = bySymbol(symbol);

  return (
    <div ref={frameRef} className="flex h-full min-h-0 flex-col bg-panel">
      <div className="flex h-9 shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-panel-header px-1.5 thin-scroll">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2 font-semibold"
          onClick={() => useUiStore.getState().setSearchOpen(true)}
        >
          <Search className="text-muted-foreground" />
          {instrument?.name && instrument.type === "INDEX" ? instrument.name : symbol}
        </Button>
        <Divider />
        <div role="radiogroup" aria-label="Timeframe" className="flex items-center">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              role="radio"
              aria-checked={tf === timeframe}
              onClick={() => actions.setTimeframe(tf)}
              className={cn(
                "num h-7 rounded px-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground",
                tf === timeframe && "bg-accent font-semibold text-primary hover:text-primary",
              )}
            >
              {TIMEFRAME_LABELS[tf]}
            </button>
          ))}
        </div>
        <Divider />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 px-1.5" aria-label="Chart type">
              <typeMeta.icon />
              <ChevronDown className="size-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuRadioGroup value={chartType} onValueChange={(v) => actions.setChartType(v as ChartType)}>
              {CHART_TYPES.map((c) => (
                <DropdownMenuRadioItem key={c.type} value={c.type} className="text-xs">
                  {c.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={() => setIndicatorsOpen(true)}>
          <FunctionSquare />
          <span className="hidden sm:inline">Indicators</span>
        </Button>

        <div className="ml-auto flex items-center gap-0.5">
          {state.status === "loading" && <Loader2 className="mr-1 size-3.5 animate-spin text-muted-foreground" />}
          <ToolbarIcon
            label={live ? "Pause live updates" : "Resume live updates"}
            onClick={() => actions.setLive(!live)}
          >
            {live ? <Pause /> : <Play />}
          </ToolbarIcon>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Chart settings">
                    <Settings />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Chart settings</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-[10px] tracking-wider text-muted-foreground uppercase">
                Chart
              </DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                className="text-xs"
                checked={magnet}
                onCheckedChange={(v) => actions.setCrosshairMagnet(!!v)}
              >
                <Crosshair className="size-3.5" /> Magnet crosshair
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="text-xs"
                checked={logScale}
                onCheckedChange={(v) => actions.setLogScale(!!v)}
              >
                Logarithmic scale
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                className="text-xs"
                checked={live}
                onCheckedChange={(v) => actions.setLive(!!v)}
              >
                Auto-refresh (live)
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs" onSelect={() => actions.resetIndicators()}>
                Reset indicators
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ToolbarIcon label="Reset view" onClick={() => controller?.resetView()}>
            <RotateCcw />
          </ToolbarIcon>
          <ToolbarIcon label="Download snapshot" onClick={screenshot}>
            <Camera />
          </ToolbarIcon>
          <ToolbarIcon label={fullscreen ? "Exit full screen" : "Full screen"} onClick={toggleFullscreen}>
            {fullscreen ? <Minimize /> : <Expand />}
          </ToolbarIcon>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={canvasRef} className="absolute inset-0" />
        <ChartLegend
          symbol={symbol}
          name={instrument?.name}
          exchange={instrument?.exchange}
          timeframe={TIMEFRAME_LABELS[timeframe]}
          info={legend}
          indicators={indicators}
          onToggle={(id) => {
            const ind = indicators.find((i) => i.id === id);
            if (ind) actions.updateIndicator(id, { visible: !ind.visible });
          }}
          onRemove={actions.removeIndicator}
          onEdit={() => setIndicatorsOpen(true)}
        />
        {!live && (
          <div className="absolute top-1.5 right-20 z-10 rounded border border-warn/40 bg-panel/90 px-1.5 py-0.5 text-[10px] font-medium text-warn">
            Live updates paused
          </div>
        )}
        {state.status === "error" && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-panel/80 text-xs">
            <AlertTriangle className="size-5 text-warn" />
            <span className="text-muted-foreground">{state.message}</span>
            <Button size="xs" variant="outline" onClick={reload}>
              Retry
            </Button>
          </div>
        )}
      </div>

      <IndicatorDialog open={indicatorsOpen} onOpenChange={setIndicatorsOpen} />
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-border" />;
}

function ToolbarIcon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
