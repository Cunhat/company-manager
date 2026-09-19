import { getIvaQuery } from "@/features/iva/server/functions";
import { IconCalendarWeekFilled, IconClockFilled } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { getNextIvaDeadline } from "../lib/next-iva-payment";

const money = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});
export default function NextIvaPayment() {
  const { data: ledger } = useSuspenseQuery(getIvaQuery);

  const now = dayjs.utc().toDate();
  const deadline = now ? getNextIvaDeadline(now) : null;

  const period = ledger.find(
    (q) => q.year === deadline?.taxYear && `Q${q.quarter}` === deadline.quarter,
  );
  const amount = period ? period.payableCents / 100 : 0;

  return (
    <section
      aria-labelledby="next-payment"
      className="grid overflow-hidden rounded-xl border border-amber-300 bg-amber-50 text-stone-950 lg:grid-cols-[1.5fr_1fr]"
    >
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
          <Clock3 size={16} aria-hidden="true" /> Next scheduled IVA obligation{" "}
          <span className="rounded-full bg-amber-200/60 px-2 py-1 tracking-normal">
            {deadline
              ? deadline.daysToPay === 0
                ? "Payment deadline today"
                : `${deadline.daysToPay} days to payment deadline`
              : "Loading deadline…"}
          </span>
        </div>
        <h2 id="next-payment" className="mt-4 text-xl font-medium">
          {deadline
            ? `${deadline.quarter} ${deadline.taxYear} · ${deadline.start.format("MMMM")} to ${deadline.end.subtract(1, "day").format("MMMM")}`
            : "Quarterly IVA"}
        </h2>
        <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">
          {amount === null ? "—" : money.format(Math.max(0, amount))}
        </p>
        <p className="mt-3 text-sm text-stone-700">
          {period?.status === "closed"
            ? period.payableCents > 0
              ? "Quarter closed. Payment recorded."
              : "Quarter closed. No payment due."
            : "Includes unused deductions from the previous quarter."}{" "}
          <a href="/iva" className="font-medium underline underline-offset-4">
            View IVA
          </a>
        </p>
      </div>
      <div className="flex flex-col justify-center gap-5 border-t border-amber-200 p-6 lg:border-t-0 lg:border-l">
        <div className="flex gap-3">
          <IconCalendarWeekFilled size={20} aria-hidden="true" />
          <div>
            <p className="text-xs text-stone-600">
              Declaration deadline
              {deadline?.declarationDatePassed ? " · date passed, verify submission" : ""}
            </p>
            <p className="mt-1 font-semibold">
              {deadline ? deadline.declaration.format("D MMMM YYYY") : "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <IconClockFilled size={20} aria-hidden="true" />
          <div>
            <p className="text-xs text-stone-600">Payment deadline</p>
            <p className="mt-1 font-semibold">
              {deadline ? deadline.payment.format("D MMMM YYYY") : "—"}
            </p>
          </div>
        </div>

        <a
          href="https://www.portaldasfinancas.gov.pt/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-md bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          Open Portal das Finanças <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
