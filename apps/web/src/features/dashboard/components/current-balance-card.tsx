import { IconBuildingBank } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import { moneyFormatter } from "@/features/accounts/lib/format";
import StatCard from "./stat-card";

export default function CurrentBalanceCard() {
  const { data: accounts } = useSuspenseQuery(getAccountsQuery);
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
    />
  );
}
