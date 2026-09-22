import { IconBuildingBank } from "@tabler/icons-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import { moneyFormatter } from "@/features/accounts/lib/format";
import { buildBalanceTrend } from "../lib/balance-trend";
import { getBalanceMovementsQuery } from "../server/balance-movements";
import BalanceTrendChart from "./balance-trend-chart";
import StatCard from "./stat-card";

export default function CurrentBalanceCard() {
  const { data: accounts } = useSuspenseQuery(getAccountsQuery);
  const movements = useQuery(getBalanceMovementsQuery());
  const balanceCents = accounts.reduce(
    (total, account) => total + Math.round(Number(account.balance) * 100),
    0,
  );

  return (
    <StatCard
      label="Current balance"
      value={moneyFormatter.format(balanceCents / 100)}
      note={
        accounts.length === 0
          ? "No accounts yet"
          : "Across all accounts, including opening balances"
      }
      icon={IconBuildingBank}
    >
      {accounts.length === 0 ? (
        <p className="mt-auto border-t pt-5 text-sm text-muted-foreground">
          Add an account to see its balance history.
        </p>
      ) : movements.data ? (
        <BalanceTrendChart trend={buildBalanceTrend(balanceCents, movements.data)} />
      ) : (
        <div
          className="mt-auto border-t pt-5 text-sm text-muted-foreground"
          role={movements.isError ? "alert" : "status"}
        >
          {movements.isError ? (
            <>
              Balance history could not load.{" "}
              <button
                type="button"
                className="min-h-11 font-medium underline underline-offset-4"
                onClick={() => void movements.refetch()}
              >
                Try again
              </button>
            </>
          ) : (
            "Loading balance history…"
          )}
        </div>
      )}
    </StatCard>
  );
}
