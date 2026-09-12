import { createFileRoute } from "@tanstack/react-router";
import PerDiemsView from "@/features/per-diems/views/per-diems-view";

export const Route = createFileRoute("/_authed/per-diems")({ component: PerDiemsView });
