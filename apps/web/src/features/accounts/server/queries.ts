import type { createDb } from "@company-manager/db";
import { and, eq } from "@company-manager/db/operators";
import { financialAccount } from "@company-manager/db/schema/account";

type Db = Pick<ReturnType<typeof createDb>, "select">;

export async function requireOwnedAccount(db: Db, userId: string, accountId: string) {
  const [account] = await db
    .select({ id: financialAccount.id })
    .from(financialAccount)
    .where(and(eq(financialAccount.id, accountId), eq(financialAccount.userId, userId)));
  if (!account) throw new Error("Account not found. Choose one of your accounts.");
}

// Historical records may stay unassigned. Once assigned, an edit must select an account.
export async function validateRecordAccount(
  db: Db,
  userId: string,
  accountId: string | null,
  previousAccountId: string | null,
) {
  if (accountId) return requireOwnedAccount(db, userId, accountId);
  if (previousAccountId) throw new Error("Choose an account for this record.");
}
