import { IconArrowRight, IconRoute } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { KmsPath } from "../schemas/types";

export function PathsList({
  paths,
  onUse,
  disabled,
}: {
  paths: KmsPath[];
  onUse: (pathId: string) => void;
  disabled: boolean;
}) {
  function renderPath(path: KmsPath) {
    function handleUsePath() {
      onUse(path.id);
    }

    return (
      <tr key={path.id} className="hover:bg-muted/30">
        <th scope="row" className="max-w-sm px-5 py-5 font-medium break-words">
          <span className="flex items-center gap-2">
            {path.origin}
            <IconArrowRight className="size-4 shrink-0 text-muted-foreground" aria-label="to" />
            {path.destination}
          </span>
          {path.description ? (
            <p className="mt-1 text-xs font-normal text-muted-foreground">{path.description}</p>
          ) : null}
        </th>
        <td className="max-w-xs px-5 py-5 break-words text-muted-foreground">{path.reason}</td>
        <td className="px-5 py-5 text-right tabular-nums">{path.distance}</td>
        <td className="px-5 py-5 text-right">
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={handleUsePath}
            aria-label={`Use path ${path.origin} to ${path.destination}`}
          >
            Use path
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
      aria-labelledby="paths-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <h2 id="paths-heading" className="text-sm font-semibold">
          Saved paths <span className="ml-2 text-muted-foreground">{paths.length}</span>
        </h2>
        <p className="text-xs text-muted-foreground">Distances are one-way</p>
      </div>
      {paths.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <IconRoute className="mb-4 size-8 text-primary" aria-hidden="true" />
          <h3 className="font-semibold">Create your first path</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Use New path to save an origin, destination and distance. Reuse it whenever you travel.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto" role="region" aria-label="Saved paths" tabIndex={0}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Saved one-way paths</caption>
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Path
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Business purpose
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  One-way km
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">{paths.map(renderPath)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
