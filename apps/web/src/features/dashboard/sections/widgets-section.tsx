import TaxCalendarNote from "../components/tax-calendar-note";
import IrcEstimateSection from "./irc-estimate-section";
import NextIvaPayment from "./next-iva-payment";
import QuarterlyOverviewSection from "./quarterly-overview-section";
import YearToDateSection from "./year-to-date-section";

export default function WidgetsSection() {
  return (
    <div className="space-y-6">
      <YearToDateSection />
      <NextIvaPayment />
      <QuarterlyOverviewSection />
      <IrcEstimateSection />
      <TaxCalendarNote />
    </div>
  );
}
