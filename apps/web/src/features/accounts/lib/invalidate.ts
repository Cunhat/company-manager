import type { QueryClient } from "@tanstack/react-query";

// Account changes can rename or remove associations on every financial page.
export async function invalidateAccountData(client: QueryClient) {
  await Promise.all(
    [
      "iva",
      "quarterly-metrics",
      "accounts",
      "transactions",
      "salary",
      "invoices",
      "expenses",
      "yearly-invoices-and-expenses",
    ].map((key) => client.invalidateQueries({ queryKey: [key] })),
  );
}
