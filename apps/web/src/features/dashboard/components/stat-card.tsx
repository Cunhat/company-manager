import type { ComponentType } from "react";

type StatCardProps = {
  label: string;
  value: string;
  note: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
};

export default function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        {label}
        <Icon size={17} aria-hidden />
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {note}
      </p>
    </div>
  );
}
