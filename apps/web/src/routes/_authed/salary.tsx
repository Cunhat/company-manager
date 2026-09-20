import { createFileRoute } from "@tanstack/react-router";
import SalaryView from "@/features/salary/views/salary-view";

export const Route = createFileRoute("/_authed/salary")({ component: SalaryView });
