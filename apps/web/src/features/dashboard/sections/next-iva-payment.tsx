import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import { euro } from "../data/dashboard-demo";

export default function NextIvaPayment() {
  return (
    <section
      aria-labelledby="next-payment"
      className="grid overflow-hidden rounded-xl border border-amber-300 bg-amber-50 text-stone-950 lg:grid-cols-[1.5fr_1fr]"
    >
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
          <Clock3 size={16} aria-hidden="true" /> Next unpaid IVA obligation{" "}
          <span className="rounded-full bg-amber-200/60 px-2 py-1 tracking-normal">
            20 days to pay · demo
          </span>
        </div>
        <h2 id="next-payment" className="mt-4 text-xl font-medium">
          Q2 2026 · April to June
        </h2>
        <p className="mt-2 text-5xl font-semibold tracking-tight tabular-nums">{euro(5520)}</p>
        <p className="mt-3 text-sm text-stone-600">
          Set aside for the government. Payment has not been recorded.
        </p>
      </div>
      <div className="flex flex-col justify-center gap-5 border-t border-amber-200 p-6 lg:border-t-0 lg:border-l">
        <div className="flex gap-3">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <p className="text-xs text-stone-600">Declaration deadline · not filed in demo</p>
            <p className="mt-1 font-semibold">21 September 2026</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Clock3 size={20} aria-hidden="true" />
          <div>
            <p className="text-xs text-stone-600">Payment deadline · unpaid in demo</p>
            <p className="mt-1 font-semibold">25 September 2026</p>
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
