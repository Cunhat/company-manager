import { IconWallet } from "@tabler/icons-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { moneyFormatter } from "@/features/accounts/lib/format";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import { getIvaQuery } from "@/features/iva/server/functions";
import { NO_TRAVEL } from "@/features/salary/lib/calculations";
import { getSalaryQuery, getSalaryTravelQuery } from "@/features/salary/server/functions";
import { availableAfterNextPayments, getNextPayrollReserve } from "../lib/available-balance";
import { getNextIvaPayment } from "../lib/next-iva-payment";

const authedRoute = getRouteApi("/_authed");
const money = (cents: number) => moneyFormatter.format(cents / 100);

export default function AvailableBalanceCard() {
  const { session } = authedRoute.useRouteContext();
  const [accounts, iva, salary] = useQueries({
    queries: [getAccountsQuery, getIvaQuery, getSalaryQuery(session.user.id)],
  });
  const now = new Date();
  const nextPayroll = salary.data ? getNextPayrollReserve(salary.data, now) : null;
  const travel = useQuery({
    ...getSalaryTravelQuery(session.user.id, nextPayroll?.month ?? ""),
    enabled: nextPayroll?.estimated === true,
  });

  if (
    accounts.isError ||
    iva.isError ||
    salary.isError ||
    (nextPayroll?.estimated && travel.isError)
  ) {
    return (
      <section role="alert" className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Available after next payments</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Could not load the balance, IVA, salary or travel needed for this estimate.
        </p>
        <button
          type="button"
          className="mt-3 min-h-11 text-sm font-medium underline underline-offset-4"
          onClick={() =>
            void Promise.all([
              accounts.refetch(),
              iva.refetch(),
              salary.refetch(),
              ...(nextPayroll?.estimated ? [travel.refetch()] : []),
            ])
          }
        >
          Try again
        </button>
      </section>
    );
  }

  if (!accounts.data || !iva.data || !salary.data || (nextPayroll?.estimated && !travel.data)) {
    return (
      <section role="status" className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Available after next payments</h2>
        <p className="mt-3 text-sm text-muted-foreground">Loading upcoming payments…</p>
      </section>
    );
  }

  const balanceCents = accounts.data.reduce(
    (total, account) => total + Math.round(Number(account.balance) * 100),
    0,
  );
  const { payableCents: ivaCents } = getNextIvaPayment(iva.data);
  const payroll = getNextPayrollReserve(salary.data, now, travel.data ?? NO_TRAVEL);
  const availableCents = payroll
    ? availableAfterNextPayments(balanceCents, ivaCents, payroll.totalCents)
    : null;

  return (
    <section
      aria-labelledby="available-balance-heading"
      className="h-full overflow-hidden rounded-xl border bg-card"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 id="available-balance-heading" className="text-sm text-muted-foreground">
            Available after next payments
          </h2>
          <IconWallet size={17} aria-hidden="true" className="text-muted-foreground" />
        </div>
        <p
          className={`mt-4 break-words text-3xl font-semibold tracking-tight tabular-nums ${availableCents !== null && availableCents < 0 ? "text-destructive" : "text-primary"}`}
        >
          {availableCents === null ? "—" : money(availableCents)}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Current balance minus the next IVA payment, salary, allowances and payroll taxes.
        </p>
      </div>
      <dl className="space-y-3 border-t bg-muted/20 p-5 text-sm sm:p-6">
        <div className="flex justify-between gap-3">
          <dt>Current balance</dt>
          <dd className="font-medium tabular-nums">{money(balanceCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Next IVA</dt>
          <dd className="tabular-nums">−{money(ivaCents)}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Net salary</dt>
          <dd className="tabular-nums">{payroll ? `−${money(payroll.netSalaryCents)}` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Meal allowance</dt>
          <dd className="tabular-nums">{payroll ? `−${money(payroll.mealCents)}` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Per diems</dt>
          <dd className="tabular-nums">{payroll ? `−${money(payroll.perDiemCents)}` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Mileage</dt>
          <dd className="tabular-nums">{payroll ? `−${money(payroll.mileageCents)}` : "—"}</dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Social Security + TSU</dt>
          <dd className="tabular-nums">
            {payroll ? `−${money(payroll.socialSecurityCents)}` : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3 text-muted-foreground">
          <dt>Payroll IRS</dt>
          <dd className="tabular-nums">{payroll ? `−${money(payroll.irsCents)}` : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
