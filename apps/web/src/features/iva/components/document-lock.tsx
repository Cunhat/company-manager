import { useQuery } from "@tanstack/react-query";
import { getIvaQuery } from "../server/functions";
import { periodOf } from "../lib/quarters";

export function useDocumentLock(date: Date | string) {
  const query = useQuery(getIvaQuery);
  const period = periodOf(date);
  const closed =
    query.data?.some(
      (q) => q.year === period.year && q.quarter === period.quarter && q.status === "closed",
    ) ?? false;
  return {
    closed,
    unavailable: !query.data || query.isError,
    isError: query.isError,
    refetch: query.refetch,
  };
}

export function DocumentLockNotice({ date }: { date: Date | string }) {
  const { closed, unavailable, isError, refetch } = useDocumentLock(date);
  if (isError)
    return (
      <p role="alert" className="text-sm text-destructive">
        Could not load the quarter status.{" "}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Try again
        </button>
      </p>
    );
  if (unavailable)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Checking quarter status. Saving will be available once the status is loaded.
      </p>
    );
  if (!closed) return null;
  return (
    <p
      role="status"
      className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300"
    >
      This quarter is closed. Reopen it on the{" "}
      <a href="/iva" className="underline">
        IVA page
      </a>{" "}
      to change its invoices or expenses.
    </p>
  );
}
