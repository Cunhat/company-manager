import { createDb } from "@company-manager/db";
import { sql } from "@company-manager/db/operators";
import { financialAccount } from "@company-manager/db/schema/account";
import { expense } from "@company-manager/db/schema/expense";
import { invoice } from "@company-manager/db/schema/invoice";
import { transaction } from "@company-manager/db/schema/transactions";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { IVA_RATE } from "@/lib/consts";
import { authMiddleware } from "@/middleware/auth";

dayjs.extend(utc);
dayjs.extend(timezone);

const currentMonth = () => dayjs().tz("Europe/Lisbon").format("YYYY-MM");

export const getBalanceMovements = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to view balance history");

    const month = dayjs.utc(`${currentMonth()}-01`);
    const start = month.subtract(5, "month").toDate();
    const end = month.add(1, "month").toDate();
    const result = await createDb().execute(sql`
      select to_char(date_trunc('month', movements.occurred_at), 'YYYY-MM') as month,
        round(sum(movements.amount) * 100)::bigint as change_cents
      from (
        select ${financialAccount.createdAt} as occurred_at,
          ${financialAccount.openingBalance} as amount,
          ${financialAccount.id} as account_id,
          ${financialAccount.userId} as user_id
        from ${financialAccount}
        union all
        select ${invoice.createdAt},
          round(${invoice.value} * (1 + ${String(IVA_RATE)}::numeric), 2),
          ${invoice.accountId}, ${invoice.userId}
        from ${invoice}
        where ${invoice.status} = 'paid'
        union all
        select ${expense.createdAt}, -${expense.value},
          ${expense.accountId}, ${expense.userId}
        from ${expense}
        union all
        select ${transaction.createdAt},
          case when ${transaction.type} = 'income' then ${transaction.value}
            else -${transaction.value} end,
          ${transaction.accountId}, ${transaction.userId}
        from ${transaction}
      ) movements
      inner join ${financialAccount} owned_account
        on owned_account.id = movements.account_id and owned_account.user_id = ${userId}
      where movements.user_id = ${userId}
        and movements.occurred_at >= ${start}
        and movements.occurred_at < ${end}
      group by date_trunc('month', movements.occurred_at)
      order by month
    `);

    return result.rows.map((row) => ({
      month: String(row.month),
      changeCents: Number(row.change_cents),
    }));
  });

export const getBalanceMovementsQuery = () =>
  queryOptions({
    queryKey: ["accounts", "balance-movements", currentMonth()],
    queryFn: getBalanceMovements,
  });
