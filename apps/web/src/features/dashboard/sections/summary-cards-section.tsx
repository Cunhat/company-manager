import AvailableBalanceCard from "../components/available-balance-card";
import CurrentBalanceCard from "../components/current-balance-card";

export default function SummaryCardsSection() {
  return (
    <section
      aria-label="Company balance after upcoming payments"
      className="grid gap-4 lg:grid-cols-2"
    >
      <CurrentBalanceCard />
      <AvailableBalanceCard />
    </section>
  );
}
