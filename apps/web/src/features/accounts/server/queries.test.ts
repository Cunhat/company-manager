import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTestDb } from "@company-manager/db/testing";
import { requireOwnedAccount, validateRecordAccount } from "./queries";

const db = createTestDb();

describe("account queries", () => {
  it("allows unassigned history but prevents clearing an assigned account", async () => {
    await validateRecordAccount(db, "alice", null, null);
    await assert.rejects(
      validateRecordAccount(db, "alice", null, "existing-account"),
      /Choose an account/,
    );
  });

  it("rejects missing or foreign accounts before a record is saved", async () => {
    let captured: unknown;
    const emptyDb = {
      select: () => ({
        from: () => ({
          where: (condition: unknown) => {
            captured = condition;
            return Promise.resolve([]);
          },
        }),
      }),
    } as unknown as typeof db;
    await assert.rejects(
      requireOwnedAccount(emptyDb, "alice", "foreign-account"),
      /Account not found/,
    );
    assert.ok(captured, "ownership lookup must include a condition");
  });
});
