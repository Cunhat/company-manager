import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export type BalanceMovement = { month: string; changeCents: number };

export function buildBalanceTrend(
  currentBalanceCents: number,
  movements: BalanceMovement[],
  now = new Date(),
) {
  const firstMonth = dayjs
    .utc(`${dayjs(now).tz("Europe/Lisbon").format("YYYY-MM")}-01`)
    .subtract(5, "month");
  const months = Array.from({ length: 6 }, (_, index) => firstMonth.add(index, "month"));
  const changes = new Map(movements.map(({ month, changeCents }) => [month, changeCents]));
  const totalChange = months.reduce(
    (total, month) => total + (changes.get(month.format("YYYY-MM")) ?? 0),
    0,
  );
  let balanceCents = currentBalanceCents - totalChange;
  const points = [{ month: firstMonth.subtract(1, "month").format("YYYY-MM"), balanceCents }];

  for (const month of months) {
    balanceCents += changes.get(month.format("YYYY-MM")) ?? 0;
    points.push({ month: month.format("YYYY-MM"), balanceCents });
  }

  return {
    points,
    changeCents: totalChange,
    hasMovement: months.some((month) => (changes.get(month.format("YYYY-MM")) ?? 0) !== 0),
  };
}
