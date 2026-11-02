import { TickMarkType, type Time } from "lightweight-charts";

/**
 * Lightweight Charts renders timestamps as UTC. Indian markets are read in IST, so all
 * axis and crosshair labels are formatted in Asia/Kolkata regardless of the viewer's
 * own time zone.
 */
const TZ = "Asia/Kolkata";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...opts });

const timeFmt = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const dayFmt = fmt({ day: "numeric" });
const dayMonthFmt = fmt({ day: "numeric", month: "short" });
const monthFmt = fmt({ month: "short" });
const yearFmt = fmt({ year: "numeric" });
const fullDateFmt = fmt({ weekday: "short", day: "2-digit", month: "short", year: "2-digit" });
const fullDateTimeFmt = fmt({
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toDate(time: Time): Date {
  return new Date((time as number) * 1000);
}

export function tickMarkFormatter(time: Time, type: TickMarkType): string {
  const d = toDate(time);
  switch (type) {
    case TickMarkType.Year:
      return yearFmt.format(d);
    case TickMarkType.Month:
      return monthFmt.format(d);
    case TickMarkType.DayOfMonth:
      return dayFmt.format(d);
    default:
      return timeFmt.format(d);
  }
}

export function crosshairTimeFormatter(intraday: boolean) {
  return (time: Time) => (intraday ? fullDateTimeFmt : fullDateFmt).format(toDate(time));
}

export function formatIstTime(epochMs: number): string {
  return timeFmt.format(new Date(epochMs));
}

export function formatIstDayMonth(epochMs: number): string {
  return dayMonthFmt.format(new Date(epochMs));
}
