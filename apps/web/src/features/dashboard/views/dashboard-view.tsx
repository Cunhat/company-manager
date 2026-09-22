import WidgetsSection from "../sections/widgets-section";

export default function DashboardView() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-1 sm:px-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Company overview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your balance after upcoming payments, next IVA and personal profit for the year.
          </p>
        </div>
      </header>
      <WidgetsSection />
    </div>
  );
}
