import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createAccountSchema, positiveMoneySchema } from "./validators";
import { createInvoiceSchema, updateInvoiceSchema } from "../../invoices/schemas/validators";
import { createExpenseSchema, updateExpenseSchema } from "../../expenses/schemas/validators";
import { createTransactionSchema } from "../../transactions/schemas/validators";
import { getTableConfig } from "@company-manager/db/testing";
import { financialAccount } from "@company-manager/db/schema/account";
import { invoice } from "@company-manager/db/schema/invoice";
import { expense } from "@company-manager/db/schema/expense";
import { transaction } from "@company-manager/db/schema/transactions";

const id = "af0216b0-e797-4c59-9532-cb6be8ec66ad";
const invoiceValues = {
  name: "Client",
  description: "",
  value: "1000.25",
  date: "2026-09-18",
  status: "pending",
  ivaStatus: "pending",
  accountId: id,
};
const expenseValues = {
  title: "Supplies",
  value: "123.45",
  date: "2026-09-18",
  iva: true,
  accountId: id,
};

describe("account input and preservation rules", () => {
  it("accepts zero and negative opening balances, but rejects invalid money", () => {
    for (const openingBalance of ["0", "1000.25", "-50.10"]) {
      assert.equal(
        createAccountSchema.safeParse({ name: "Bank", description: "", openingBalance }).success,
        true,
      );
    }
    for (const value of ["", "NaN", "Infinity", "1.001", "1e3", "-1", "0", "1000000000000"]) {
      assert.equal(positiveMoneySchema.safeParse(value).success, false, value);
    }
    assert.equal(positiveMoneySchema.safeParse("123.45").success, true);
  });

  it("requires accounts for new invoices, expenses, and manual transactions", () => {
    assert.equal(createInvoiceSchema.safeParse(invoiceValues).success, true);
    assert.equal(createExpenseSchema.safeParse(expenseValues).success, true);
    assert.equal(createInvoiceSchema.safeParse({ ...invoiceValues, accountId: "" }).success, false);
    assert.equal(createExpenseSchema.safeParse({ ...expenseValues, accountId: "" }).success, false);
    assert.equal(
      createTransactionSchema.safeParse({
        accountId: "",
        value: "1",
        type: "income",
        description: "",
        date: "2026-09-18",
      }).success,
      false,
    );
  });

  it("lets preserved invoice and expense records be edited while unassigned", () => {
    assert.equal(
      updateInvoiceSchema.safeParse({ ...invoiceValues, id, accountId: "" }).success,
      true,
    );
    assert.equal(
      updateExpenseSchema.safeParse({ ...expenseValues, id, accountId: "" }).success,
      true,
    );
  });

  it("keeps invoice cents and defines the agreed account deletion behavior", () => {
    assert.equal(invoice.value.getSQLType(), "numeric");
    for (const table of [invoice, expense, transaction]) {
      const foreignKey = getTableConfig(table).foreignKeys.find(
        (key) => key.reference().foreignTable === financialAccount,
      );
      assert.ok(foreignKey);
      assert.equal(foreignKey.onDelete, table === transaction ? "cascade" : "set null");
      assert.equal(table.accountId.notNull, table === transaction);
    }
    assert.equal(transaction.userId.notNull, true);
  });
});
