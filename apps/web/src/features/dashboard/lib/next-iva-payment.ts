import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import type { IvaQuarter } from "../../iva/lib/quarters";
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

function getToday(now: Date) {
  // Treat deadlines as calendar dates, using today's date in Portugal.
  return dayjs.utc(dayjs(now).tz("Europe/Lisbon").format("YYYY-MM-DD"));
}

function getQuarterDeadline(taxYear: number, quarter: number, today: dayjs.Dayjs) {
  const dates = Object.values(QUARTERLY_DECLARATION_DEADLINES)[quarter - 1]!;
  const start = dayjs.utc(`${taxYear}-01-01`).add((quarter - 1) * 3, "month");
  const declaration = resolveDeadline(dates.declaration, taxYear);
  const payment = resolveDeadline(dates.payment, taxYear);
  return {
    quarter: `Q${quarter}`,
    taxYear,
    start,
    end: start.add(3, "month"),
    declaration,
    payment,
    daysToPay: payment.diff(today, "day"),
    declarationDatePassed: declaration.isBefore(today, "day"),
  };
}

export function getNextIvaDeadline(now = new Date()) {
  const today = getToday(now);
  const deadlines = [today.year() - 1, today.year()].flatMap((taxYear) =>
    [1, 2, 3, 4].map((quarter) => getQuarterDeadline(taxYear, quarter, today)),
  );
  // Entries are already chronological. Including last year covers Q4's February payment.
  return deadlines.find(({ payment }) => !payment.isBefore(today, "day"))!;
}

// Leaves IVA on pending invoices out of open quarters, carrying any resulting credit
// forward the same way iva_ledger does. Closed quarters cannot have pending invoices.
export function excludePendingInvoices(ledger: IvaQuarter[]) {
  let incoming: number | null = null;
  return ledger.map((period) => {
    const carryInCents = incoming ?? period.carryInCents;
    incoming = null;
    if (
      period.status === "closed" ||
      (period.pendingSalesCents === 0 && carryInCents === period.carryInCents)
    )
      return period;

    const salesCents = period.salesCents - period.pendingSalesCents;
    const carryOutCents = Math.max(0, period.deductionsCents + carryInCents - salesCents);
    // A reopened quarter keeps feeding its confirmed carryover to later quarters.
    incoming = period.confirmedCarryOutCents ?? carryOutCents;
    return {
      ...period,
      salesCents,
      pendingSalesCents: 0,
      carryInCents,
      payableCents: Math.max(0, salesCents - period.deductionsCents - carryInCents),
      carryOutCents,
    };
  });
}

export function getNextIvaPayment(allPeriods: IvaQuarter[], now = new Date()) {
  const ledger = excludePendingInvoices(allPeriods);
  const today = getToday(now);
  let deadline = getNextIvaDeadline(now);

  while (true) {
    const period = ledger.find(
      (quarter) => quarter.year === deadline.taxYear && `Q${quarter.quarter}` === deadline.quarter,
    );
    if (period?.status !== "closed") {
      return { deadline, period, payableCents: Math.max(0, period?.payableCents ?? 0) };
    }

    const nextStart = deadline.end;
    deadline = getQuarterDeadline(nextStart.year(), Math.floor(nextStart.month() / 3) + 1, today);
  }
}
