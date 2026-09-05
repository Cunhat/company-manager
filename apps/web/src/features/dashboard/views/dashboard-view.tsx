import WidgetsSection from "../sections/widgets-section";

export default function DashboardView() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-1 sm:px-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your year, in view.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Income, expenses and the taxes to set aside.
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <span className="rounded-md border px-3 py-1.5 font-medium">2026 · Year to date</span>
        </div>
      </header>
      <WidgetsSection />
    </div>
  );
}
