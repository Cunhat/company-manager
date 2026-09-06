import { euro } from "@/lib/utils";

type IrcAssumptionsProps = { pme: boolean; profit: number; onPmeChange: (value: boolean) => void };

export default function IrcAssumptions({ pme, profit, onPmeChange }: IrcAssumptionsProps) {
  return (
    <div id="irc-assumptions" className="mt-5 grid gap-5 border-t pt-5 text-sm md:grid-cols-2">
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pme}
            onChange={(e) => onPmeChange(e.target.checked)}
            className="size-4 accent-teal-700"
          />{" "}
          Assume qualifying PME rates
        </label>
        <p className="mt-3 text-muted-foreground">
          {pme
            ? "15% on the first €50,000, then 19% on the excess."
            : "19% standard mainland rate for 2026."}
        </p>
        <p className="mt-2">Assumed taxable base: {euro(profit)}</p>
      </div>
      <p className="leading-relaxed text-muted-foreground">
        Illustration assumes recorded profit equals the taxable base. Excludes derramas, autonomous
        taxation, tax losses, benefits and advance payments. Ordinary IRC treatment assumed;
        eligibility and final settlement need accountant confirmation.
      </p>
    </div>
  );
}
