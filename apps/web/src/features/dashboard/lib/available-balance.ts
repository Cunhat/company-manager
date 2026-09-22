import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { calculateSalary, NO_TRAVEL, type TravelTotals } from "@/features/salary/lib/calculations";

dayjs.extend(utc);
dayjs.extend(timezone);

type Payroll = {
  settings: {
    grossCents: number;
    mealCents: number;
    ssRate: number;
    tsuRate: number;
    irsRate: number;
  } | null;
  records: {
    id: string;
    month: string;
    kind: string;
    netCents: number;
    mealCents: number;
    perDiemCents: number;
    mileageCents: number;
    ssCents: number;
    tsuCents: number;
    irsCents: number;
  }[];
  payments: { recordId: string; kind: string }[];
};

export function getNextPayrollReserve(
  payroll: Payroll,
  now = new Date(),
  travel: TravelTotals = NO_TRAVEL,
) {
  const currentMonth = dayjs(now).tz("Europe/Lisbon").format("YYYY-MM");
  const paid = new Set(payroll.payments.map(({ recordId, kind }) => `${recordId}:${kind}`));
  const unpaidMonths = payroll.records
    .filter(
      (record) =>
        (record.netCents > 0 && !paid.has(`${record.id}:salary`)) ||
        (record.ssCents + record.tsuCents > 0 && !paid.has(`${record.id}:ss`)) ||
        (record.irsCents > 0 && !paid.has(`${record.id}:irs`)),
    )
    .map((record) => record.month)
    .sort();

  let forecastMonth: string | null = null;
  if (payroll.settings) {
    forecastMonth = currentMonth;
    while (
      payroll.records.some((record) => record.month === forecastMonth && record.kind === "monthly")
    ) {
      forecastMonth = dayjs.utc(`${forecastMonth}-01`).add(1, "month").format("YYYY-MM");
    }
  }

  const month = [unpaidMonths[0], forecastMonth]
    .filter((value): value is string => !!value)
    .sort()[0];
  if (!month) return null;

  const amounts = {
    netSalaryCents: 0,
    mealCents: 0,
    perDiemCents: 0,
    mileageCents: 0,
    socialSecurityCents: 0,
    irsCents: 0,
  };
  for (const record of payroll.records.filter((item) => item.month === month)) {
    if (!paid.has(`${record.id}:salary`)) {
      const mealCents = record.kind === "monthly" ? record.mealCents : 0;
      amounts.netSalaryCents +=
        record.netCents - mealCents - record.perDiemCents - record.mileageCents;
      amounts.mealCents += mealCents;
      amounts.perDiemCents += record.perDiemCents;
      amounts.mileageCents += record.mileageCents;
    }
    if (!paid.has(`${record.id}:ss`))
      amounts.socialSecurityCents += record.ssCents + record.tsuCents;
    if (!paid.has(`${record.id}:irs`)) amounts.irsCents += record.irsCents;
  }

  const estimated = month === forecastMonth;
  if (estimated && payroll.settings) {
    const salary = calculateSalary(
      { ...payroll.settings, irsOverrideCents: null },
      "monthly",
      travel,
    );
    amounts.netSalaryCents +=
      salary.netCents - salary.mealCents - salary.perDiemCents - salary.mileageCents;
    amounts.mealCents += salary.mealCents;
    amounts.perDiemCents += salary.perDiemCents;
    amounts.mileageCents += salary.mileageCents;
    amounts.socialSecurityCents += salary.socialSecurityCents;
    amounts.irsCents += salary.irsCents;
  }

  return {
    month,
    estimated,
    ...amounts,
    totalCents:
      amounts.netSalaryCents +
      amounts.mealCents +
      amounts.perDiemCents +
      amounts.mileageCents +
      amounts.socialSecurityCents +
      amounts.irsCents,
  };
}

export function availableAfterNextPayments(
  balanceCents: number,
  ivaCents: number,
  payrollCents: number,
) {
  return balanceCents - ivaCents - payrollCents;
}
