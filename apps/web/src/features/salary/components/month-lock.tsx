import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { getSalaryQuery } from "../server/functions";

export function usePayrollLock(userId: string, month: string) {
  const query = useQuery(getSalaryQuery(userId));
  return {
    closed: query.data?.records.some((r) => r.kind === "monthly" && r.month === month) ?? false,
    unavailable: !query.data || query.isError,
    error: query.isError,
    retry: query.refetch,
  };
}
export function PayrollLockNotice({ userId, month }: { userId: string; month: string }) {
  const lock = usePayrollLock(userId, month);
  if (lock.error)
    return (
      <p role="alert" className="rounded-lg border p-3 text-sm">
        Could not check payroll month status.{" "}
        <button className="underline" onClick={() => void lock.retry()}>
          Try again
        </button>
      </p>
    );
  if (!lock.closed) return null;
  return (
    <p role="status" className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
      This month's travel entries are closed. You can simulate and adjust salary values on the{" "}
      <Link to="/salary" className="font-medium text-foreground underline underline-offset-4">
        Salary page
      </Link>
      .
    </p>
  );
}
