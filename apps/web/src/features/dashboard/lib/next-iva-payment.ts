import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { QUARTERLY_DECLARATION_DEADLINES } from "../../../lib/consts";

dayjs.extend(utc);
dayjs.extend(timezone);

export function resolveDeadline(template: string, taxYear: number) {
  const [day, month, year] = template.split("/");
  const deadline = dayjs
    .utc(`${taxYear + (year!.includes("+ 1") ? 1 : 0)}-01-01`)
    .month(Number(month) - 1)
    .date(Number(day));

  // Standard deadlines falling on a weekend move to Monday.
  return deadline.add(deadline.day() === 6 ? 2 : deadline.day() === 0 ? 1 : 0, "day");
}

export function getNextIvaDeadline(now = new Date()) {
  // Treat deadlines as calendar dates, using today's date in Portugal.
  const today = dayjs.utc(dayjs(now).tz("Europe/Lisbon").format("YYYY-MM-DD"));
  const deadlines = [today.year() - 1, today.year()].flatMap((taxYear) =>
    Object.entries(QUARTERLY_DECLARATION_DEADLINES).map(([quarter, dates], index) => {
      const start = dayjs.utc(`${taxYear}-01-01`).add(index * 3, "month");
      return {
        quarter: quarter.toUpperCase(),
        taxYear,
        start,
        end: start.add(3, "month"),
        declaration: resolveDeadline(dates.declaration, taxYear),
        payment: resolveDeadline(dates.payment, taxYear),
      };
    }),
  );
  // Entries are already chronological. Including last year covers Q4's February payment.
  const next = deadlines.find(({ payment }) => !payment.isBefore(today, "day"))!;
  return {
    ...next,
    daysToPay: next.payment.diff(today, "day"),
    declarationDatePassed: next.declaration.isBefore(today, "day"),
  };
}
