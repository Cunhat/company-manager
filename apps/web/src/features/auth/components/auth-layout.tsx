import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

function BrandMark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "overflow-hidden rounded-xl",
          size === "sm" ? "size-8" : "size-10",
        )}
      >
        <img src="/icon-192.png" alt="" className="size-full object-cover" />
      </span>
      <span className="text-sm font-medium tracking-tight">
        Company Manager
      </span>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-card lg:flex lg:flex-col lg:border-r lg:border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--primary)_0%,transparent_55%)] opacity-25"
      />
      <div className="relative px-12 py-12">
        <BrandMark />
      </div>
      <div className="relative flex flex-1 items-center px-12 pb-12">
        <div className="max-w-md">
          <p className="text-4xl font-semibold leading-[1.15] tracking-tight">
            Invoices and expenses in one place.
          </p>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-foreground">
            Manage your company's books from one workspace.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <BrandPanel />
      <main className="flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="mb-10 lg:hidden">
          <BrandMark size="sm" />
        </div>
        <div className="mx-auto w-full max-w-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
