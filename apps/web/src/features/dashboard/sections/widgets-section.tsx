import AnnualProfitSection from "./annual-profit-section";
import NextIvaPayment from "./next-iva-payment";
import SummaryCardsSection from "./summary-cards-section";

export default function WidgetsSection() {
  return (
    <div className="space-y-6">
      <SummaryCardsSection />
      <NextIvaPayment />
      <AnnualProfitSection />
    </div>
  );
}
