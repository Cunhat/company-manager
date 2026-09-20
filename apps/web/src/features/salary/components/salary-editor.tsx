import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateSalary, money, percent, type TravelTotals } from "../lib/calculations";
import { salaryValuesSchema, type PayrollKind, type SalaryValues } from "../schemas/validators";

const fields = [
  ["grossCents", "Gross salary (€)"],
  ["mealCents", "Meal allowance (€)"],
  ["ssRate", "Employee SS (%)"],
  ["tsuRate", "Employer TSU (%)"],
  ["irsRate", "IRS withholding (%)"],
] as const;

export function SalaryBreakdown({
  values,
  kind,
  travel,
}: {
  values: SalaryValues;
  kind: PayrollKind;
  travel: TravelTotals;
}) {
  const result = calculateSalary(values, kind, travel);
  const rows: [string, number][] = [
    ["Gross salary", values.grossCents],
    [`Employee SS · ${percent(values.ssRate)}`, -result.ssCents],
    [
      `IRS · ${values.irsOverrideCents === null ? percent(values.irsRate) : "custom amount"}`,
      -result.irsCents,
    ],
  ];
  return (
    <div className="space-y-5">
      <dl className="space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{money(value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-t pt-3">
          <dt>Net salary</dt>
          <dd className="font-semibold tabular-nums">{money(result.netSalaryCents)}</dd>
        </div>
        {kind === "monthly" ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Meal allowance</dt>
              <dd className="tabular-nums">{money(result.mealCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                Per diems <span className="text-xs">· {travel.perDiemDays} days</span>
              </dt>
              <dd className="tabular-nums">{money(result.perDiemCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                Mileage <span className="text-xs">· {travel.kilometres} km</span>
              </dt>
              <dd className="tabular-nums">{money(result.mileageCents)}</dd>
            </div>
          </>
        ) : null}
      </dl>
      <div className="rounded-xl bg-primary/10 p-5 text-primary dark:text-teal-300">
        <p className="text-xs font-medium">Transfer to your personal account</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums" aria-live="polite">
          {money(result.netCents)}
        </p>
      </div>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Employer TSU · {percent(values.tsuRate)}</dt>
          <dd className="tabular-nums">{money(result.tsuCents)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t pt-3">
          <dt className="font-medium">Total company cost</dt>
          <dd className="font-semibold tabular-nums">{money(result.companyCents)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function SalaryEditor({
  initial,
  kind,
  travel,
  action,
  busy = false,
  disabled = false,
  allowOverride = true,
  onSave,
  children,
  secondaryAction,
}: {
  initial: SalaryValues;
  kind: PayrollKind;
  travel: TravelTotals;
  action: string;
  busy?: boolean;
  disabled?: boolean;
  allowOverride?: boolean;
  onSave: (values: SalaryValues) => Promise<void>;
  children?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => ({
    grossCents: (initial.grossCents / 100).toFixed(2),
    mealCents: (initial.mealCents / 100).toFixed(2),
    ssRate: (initial.ssRate / 100).toFixed(2),
    tsuRate: (initial.tsuRate / 100).toFixed(2),
    irsRate: (initial.irsRate / 100).toFixed(2),
    irsOverrideCents:
      initial.irsOverrideCents === null ? "" : (initial.irsOverrideCents / 100).toFixed(2),
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const decimal = (text: string) =>
    /^\d+(?:[.,]\d{1,2})?$/.test(text)
      ? Math.round(Number(text.replace(",", ".")) * 100)
      : Number.NaN;
  const parsed = salaryValuesSchema.safeParse({
    ...Object.fromEntries(
      fields.map(([name]) => [
        name,
        name === "mealCents" && kind !== "monthly" ? 0 : decimal(draft[name]),
      ]),
    ),
    irsOverrideCents:
      allowOverride && draft.irsOverrideCents !== "" ? decimal(draft.irsOverrideCents) : null,
  });
  const pending = saving || busy;
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!parsed.success || pending || disabled) return;
        setError(null);
        setSaving(true);
        try {
          await onSave(parsed.data);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not save changes.");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-6"
    >
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">Salary values</legend>
            {fields
              .filter(([name]) => name !== "mealCents" || kind === "monthly")
              .map(([name, label]) => (
                <div key={name} className={name === "grossCents" ? "sm:col-span-2" : ""}>
                  <label htmlFor={`${id}-${name}`} className="mb-2 block text-sm font-medium">
                    {label}
                  </label>
                  <Input
                    id={`${id}-${name}`}
                    inputMode="decimal"
                    value={draft[name]}
                    onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
                  />
                </div>
              ))}
            {allowOverride ? (
              <div className="sm:col-span-2">
                <label htmlFor={`${id}-irs-override`} className="mb-2 block text-sm font-medium">
                  IRS amount override (€){" "}
                  <span className="font-normal text-muted-foreground">· optional</span>
                </label>
                <Input
                  id={`${id}-irs-override`}
                  inputMode="decimal"
                  placeholder="Calculate from percentage"
                  value={draft.irsOverrideCents}
                  onChange={(e) => setDraft({ ...draft, irsOverrideCents: e.target.value })}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Use the exact withholding from your accountant when it differs from the percentage
                  calculation.
                </p>
              </div>
            ) : null}
          </fieldset>
          {children}
        </div>
        <div className="rounded-xl border bg-muted/20 p-5">
          <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Live calculation
          </p>
          {parsed.success ? (
            <SalaryBreakdown values={parsed.data} kind={kind} travel={travel} />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              Enter valid amounts and rates to see the calculation.{" "}
              {parsed.error.issues[0]?.message}
            </p>
          )}
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        <div>{secondaryAction}</div>
        <Button type="submit" disabled={!parsed.success || pending || disabled}>
          {pending ? "Saving..." : action}
        </Button>
      </div>
    </form>
  );
}
