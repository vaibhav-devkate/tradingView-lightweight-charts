import {
  computeIndicator,
  formatPrice,
  INDICATOR_DEFINITIONS,
  type Candle,
  type ChartType,
  type IndicatorConfig,
  type Series,
} from "@td/shared";
import {
  AreaSeries,
  BarSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  PriceScaleMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type MouseEventParams,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { ChartPalette } from "./chart-theme";
import { crosshairTimeFormatter, tickMarkFormatter } from "./time-format";

export interface LegendInfo {
  candle: Candle;
  prevClose: number | null;
  /** indicator id -> output key -> value at the hovered bar */
  values: Record<string, Record<string, number | null>>;
  hovering: boolean;
}

export interface ChartControllerCallbacks {
  onLegend: (info: LegendInfo | null) => void;
  /** Fired when the user scrolls close to the oldest loaded bar. */
  onNeedOlder: () => void;
}

interface IndicatorRuntime {
  config: IndicatorConfig;
  series: Map<string, ISeriesApi<SeriesType>>;
  values: Record<string, Series>;
}

const VOLUME_SCALE = "volume";
/** How many bars to show when a new symbol/timeframe loads. */
const INITIAL_VISIBLE_BARS = 140;
const LOAD_OLDER_THRESHOLD = 15;

const t = (sec: number) => sec as UTCTimestamp;

/**
 * Imperative wrapper around a Lightweight Charts instance.
 *
 * React owns *what* is shown (symbol, type, indicators, theme); this class owns *how*:
 * series lifecycle, panes, incremental updates and legend data. Keeping it outside React
 * means live ticks update the canvas directly without re-rendering components.
 */
export class ChartController {
  private readonly chart: IChartApi;
  private main: ISeriesApi<SeriesType>;
  private candles: Candle[] = [];
  private indicators: IndicatorRuntime[] = [];
  private configs: IndicatorConfig[] = [];
  private chartType: ChartType;
  private palette: ChartPalette;
  private hoverIndex: number | null = null;

  constructor(
    container: HTMLElement,
    opts: { palette: ChartPalette; chartType: ChartType; intraday: boolean },
    private readonly callbacks: ChartControllerCallbacks,
  ) {
    this.palette = opts.palette;
    this.chartType = opts.chartType;
    this.chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: opts.palette.background },
        textColor: opts.palette.text,
        fontSize: 11,
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
        panes: { separatorColor: opts.palette.border, separatorHoverColor: opts.palette.grid },
      },
      grid: { vertLines: { color: opts.palette.grid }, horzLines: { color: opts.palette.grid } },
      rightPriceScale: { borderColor: opts.palette.border },
      timeScale: {
        borderColor: opts.palette.border,
        rightOffset: 6,
        barSpacing: 7,
        timeVisible: opts.intraday,
        secondsVisible: false,
        tickMarkFormatter,
      },
      localization: {
        locale: "en-IN",
        timeFormatter: crosshairTimeFormatter(opts.intraday),
        priceFormatter: formatPrice,
      },
      crosshair: { mode: CrosshairMode.Normal },
    });
    this.main = this.createMainSeries();
    this.chart.subscribeCrosshairMove(this.handleCrosshair);
    this.chart.timeScale().subscribeVisibleLogicalRangeChange(this.handleRange);
  }

  destroy(): void {
    this.chart.unsubscribeCrosshairMove(this.handleCrosshair);
    this.chart.timeScale().unsubscribeVisibleLogicalRangeChange(this.handleRange);
    this.chart.remove();
  }

  // ---- configuration ------------------------------------------------------------------

  setPalette(palette: ChartPalette): void {
    this.palette = palette;
    this.chart.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: palette.background },
        textColor: palette.text,
        panes: { separatorColor: palette.border, separatorHoverColor: palette.grid },
      },
      grid: { vertLines: { color: palette.grid }, horzLines: { color: palette.grid } },
      rightPriceScale: { borderColor: palette.border },
      timeScale: { borderColor: palette.border },
    });
    this.rebuildMainSeries();
    this.rebuildIndicators();
  }

  setChartType(type: ChartType): void {
    if (type === this.chartType) return;
    this.chartType = type;
    this.rebuildMainSeries();
  }

  setIntraday(intraday: boolean): void {
    this.chart.applyOptions({
      timeScale: { timeVisible: intraday },
      localization: { timeFormatter: crosshairTimeFormatter(intraday) },
    });
  }

  setCrosshairMagnet(magnet: boolean): void {
    this.chart.applyOptions({ crosshair: { mode: magnet ? CrosshairMode.MagnetOHLC : CrosshairMode.Normal } });
  }

  setLogScale(log: boolean): void {
    this.chart.priceScale("right").applyOptions({ mode: log ? PriceScaleMode.Logarithmic : PriceScaleMode.Normal });
  }

  setIndicators(configs: IndicatorConfig[]): void {
    this.configs = configs;
    this.rebuildIndicators();
  }

  // ---- data ---------------------------------------------------------------------------

  /** Replaces all data (new symbol/timeframe) and scrolls to the most recent bars. */
  setCandles(candles: Candle[]): void {
    this.candles = candles.slice();
    this.hoverIndex = null;
    this.main.setData(this.candles.map((c) => this.toMainPoint(c)));
    this.refreshIndicatorData();
    this.applyMainMargins();
    const n = this.candles.length;
    this.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - INITIAL_VISIBLE_BARS), to: n + 4 });
    this.emitLegend();
  }

  /** Prepends older history while keeping the current viewport in place. */
  prependCandles(older: Candle[]): void {
    if (older.length === 0) return;
    const firstTime = this.candles[0]?.time ?? Infinity;
    const fresh = older.filter((c) => c.time < firstTime);
    if (fresh.length === 0) return;
    const range = this.chart.timeScale().getVisibleLogicalRange();
    this.candles = [...fresh, ...this.candles];
    if (this.hoverIndex !== null) this.hoverIndex += fresh.length;
    this.main.setData(this.candles.map((c) => this.toMainPoint(c)));
    this.refreshIndicatorData();
    if (range) {
      this.chart.timeScale().setVisibleLogicalRange({ from: range.from + fresh.length, to: range.to + fresh.length });
    }
  }

  /** Applies a live bar update (same time = update, newer time = append). */
  upsertCandle(candle: Candle): void {
    const last = this.candles[this.candles.length - 1];
    if (last && candle.time < last.time) return;
    if (last && candle.time === last.time) this.candles[this.candles.length - 1] = candle;
    else this.candles.push(candle);
    this.main.update(this.toMainPoint(candle));

    for (const ind of this.indicators) {
      ind.values = computeIndicator(ind.config, this.candles);
      const i = this.candles.length - 1;
      for (const [key, series] of ind.series) {
        const point = this.toIndicatorPoint(ind.config, key, ind.values[key]!, i);
        if (point) series.update(point);
      }
    }
    if (this.hoverIndex === null) this.emitLegend();
  }

  getCandles(): readonly Candle[] {
    return this.candles;
  }

  // ---- view ---------------------------------------------------------------------------

  resetView(): void {
    const n = this.candles.length;
    this.chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - INITIAL_VISIBLE_BARS), to: n + 4 });
    this.chart.priceScale("right").applyOptions({ autoScale: true });
  }

  screenshot(): HTMLCanvasElement {
    return this.chart.takeScreenshot();
  }

  // ---- internals ----------------------------------------------------------------------

  private createMainSeries(): ISeriesApi<SeriesType> {
    const p = this.palette;
    const priceFormat = { type: "price" as const, precision: 2, minMove: 0.05 };
    switch (this.chartType) {
      case "candlestick":
        return this.chart.addSeries(CandlestickSeries, {
          upColor: p.up,
          downColor: p.down,
          borderUpColor: p.up,
          borderDownColor: p.down,
          wickUpColor: p.up,
          wickDownColor: p.down,
          priceFormat,
        });
      case "ohlc":
        return this.chart.addSeries(BarSeries, { upColor: p.up, downColor: p.down, thinBars: false, priceFormat });
      case "line":
        return this.chart.addSeries(LineSeries, { color: p.area, lineWidth: 2, priceFormat });
      case "area":
        return this.chart.addSeries(AreaSeries, {
          lineColor: p.area,
          topColor: p.areaTop,
          bottomColor: p.areaBottom,
          lineWidth: 2,
          priceFormat,
        });
    }
  }

  private rebuildMainSeries(): void {
    // Indicators are removed first so the main series stays in pane 0 and keeps its scale.
    this.removeIndicatorSeries();
    this.chart.removeSeries(this.main);
    this.main = this.createMainSeries();
    this.main.setData(this.candles.map((c) => this.toMainPoint(c)));
    this.rebuildIndicators();
  }

  private toMainPoint(c: Candle) {
    if (this.chartType === "line" || this.chartType === "area") return { time: t(c.time), value: c.close };
    return { time: t(c.time), open: c.open, high: c.high, low: c.low, close: c.close };
  }

  private removeIndicatorSeries(): void {
    for (const ind of this.indicators) for (const s of ind.series.values()) this.chart.removeSeries(s);
    this.indicators = [];
  }

  private rebuildIndicators(): void {
    this.removeIndicatorSeries();
    const visible = this.configs.filter((c) => c.visible);
    let paneIndex = 0;

    for (const config of visible) {
      const def = INDICATOR_DEFINITIONS[config.type];
      const pane = def.placement === "pane" ? ++paneIndex : 0;
      const runtime: IndicatorRuntime = { config, series: new Map(), values: {} };

      for (const out of def.outputs) {
        const color = config.colors[out.key] ?? out.defaultColor;
        let series: ISeriesApi<SeriesType>;
        if (config.type === "volume") {
          series = this.chart.addSeries(
            HistogramSeries,
            {
              priceScaleId: VOLUME_SCALE,
              priceFormat: { type: "volume" },
              lastValueVisible: false,
              priceLineVisible: false,
            },
            0,
          );
          series.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        } else if (out.style === "histogram") {
          series = this.chart.addSeries(
            HistogramSeries,
            {
              color,
              priceLineVisible: false,
              lastValueVisible: false,
              priceFormat: { type: "price", precision: 2, minMove: 0.01 },
            },
            pane,
          );
        } else {
          series = this.chart.addSeries(
            LineSeries,
            {
              color,
              lineWidth: 1,
              priceLineVisible: false,
              lastValueVisible: pane > 0,
              crosshairMarkerVisible: false,
              priceFormat: { type: "price", precision: 2, minMove: 0.01 },
              ...(config.type === "rsi"
                ? { autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) }
                : {}),
            },
            pane,
          );
        }
        for (const level of def.levels ?? []) {
          series.createPriceLine({
            price: level,
            color: this.palette.level,
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: false,
            title: "",
          });
        }
        runtime.series.set(out.key, series);
      }
      this.indicators.push(runtime);
    }

    this.applyMainMargins();

    const panes = this.chart.panes();
    panes.forEach((p, i) => p.setStretchFactor(i === 0 ? 3 : 1));
    this.refreshIndicatorData();
  }

  /** Leaves room under the price series only when a volume histogram is actually drawn. */
  private applyMainMargins(): void {
    const showsVolume = this.configs.some((c) => c.type === "volume" && c.visible) && this.hasVolumeData();
    this.main.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: showsVolume ? 0.22 : 0.06 } });
  }

  /** Indices carry no traded volume. */
  private hasVolumeData(): boolean {
    return this.candles.some((c) => c.volume > 0);
  }

  private refreshIndicatorData(): void {
    for (const ind of this.indicators) {
      ind.values = computeIndicator(ind.config, this.candles);
      for (const [key, series] of ind.series) {
        const values = ind.values[key]!;
        const points = [];
        for (let i = 0; i < values.length; i++) {
          const p = this.toIndicatorPoint(ind.config, key, values, i);
          if (p) points.push(p);
        }
        series.setData(points);
      }
    }
  }

  private toIndicatorPoint(config: IndicatorConfig, key: string, values: Series, i: number) {
    const value = values[i];
    const candle = this.candles[i];
    if (value === null || value === undefined || !candle) return null;
    if (config.type === "volume") {
      if (value === 0) return null;
      return {
        time: t(candle.time),
        value,
        color: candle.close >= candle.open ? this.palette.volumeUp : this.palette.volumeDown,
      };
    }
    if (config.type === "macd" && key === "histogram") {
      const base = config.colors.histogram ?? this.palette.up;
      return { time: t(candle.time), value, color: value >= 0 ? base : this.palette.down };
    }
    return { time: t(candle.time), value };
  }

  private readonly handleCrosshair = (param: MouseEventParams<Time>) => {
    if (param.time === undefined || param.logical === undefined) {
      this.hoverIndex = null;
    } else {
      const idx = lowerBound(this.candles, param.time as number);
      this.hoverIndex = this.candles[idx]?.time === param.time ? idx : null;
    }
    this.emitLegend();
  };

  private readonly handleRange = (range: LogicalRange | null) => {
    if (range && range.from < LOAD_OLDER_THRESHOLD && this.candles.length > 0) this.callbacks.onNeedOlder();
  };

  private emitLegend(): void {
    const i = this.hoverIndex ?? this.candles.length - 1;
    const candle = this.candles[i];
    if (!candle) {
      this.callbacks.onLegend(null);
      return;
    }
    const values: LegendInfo["values"] = {};
    for (const ind of this.indicators) {
      values[ind.config.id] = Object.fromEntries(Object.entries(ind.values).map(([k, v]) => [k, v[i] ?? null]));
    }
    this.callbacks.onLegend({
      candle,
      prevClose: this.candles[i - 1]?.close ?? null,
      values,
      hovering: this.hoverIndex !== null,
    });
  }
}

function lowerBound(candles: readonly Candle[], time: number): number {
  let lo = 0;
  let hi = candles.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid]!.time < time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
