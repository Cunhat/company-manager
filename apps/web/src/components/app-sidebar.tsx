"use client";

import * as React from "react";

import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  IconArrowsExchange,
  IconBuildingBank,
  IconCarFilled,
  IconCashBanknoteFilled,
  IconCirclePercentageFilled,
  IconCreditCardFilled,
  IconFileInvoiceFilled,
  IconLayoutDashboardFilled,
  IconLayoutRows,
  IconReceiptEuroFilled,
  IconRoute,
} from "@tabler/icons-react";
import { NavDocuments } from "./nav-documents";

const data = {
  team: {
    name: "TMC Lda",
    logo: <IconLayoutRows />,
  },
  // navMain: [
  //   {
  //     title: "Playground",
  //     url: "#",
  //     icon: <IconTerminal2 />,
  //     isActive: true,
  //     items: [
  //       {
  //         title: "History",
  //         url: "#",
  //       },
  //       {
  //         title: "Starred",
  //         url: "#",
  //       },
  //       {
  //         title: "Settings",
  //         url: "#",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Models",
  //     url: "#",
  //     icon: <IconRobot />,
  //     items: [
  //       {
  //         title: "Genesis",
  //         url: "#",
  //       },
  //       {
  //         title: "Explorer",
  //         url: "#",
  //       },
  //       {
  //         title: "Quantum",
  //         url: "#",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Documentation",
  //     url: "#",
  //     icon: <IconBook />,
  //     items: [
  //       {
  //         title: "Introduction",
  //         url: "#",
  //       },
  //       {
  //         title: "Get Started",
  //         url: "#",
  //       },
  //       {
  //         title: "Tutorials",
  //         url: "#",
  //       },
  //       {
  //         title: "Changelog",
  //         url: "#",
  //       },
  //     ],
  //   },
  //   {
  //     title: "Settings",
  //     url: "#",
  //     icon: <IconSettings />,
  //     items: [
  //       {
  //         title: "General",
  //         url: "#",
  //       },
  //       {
  //         title: "Team",
  //         url: "#",
  //       },
  //       {
  //         title: "Billing",
  //         url: "#",
  //       },
  //       {
  //         title: "Limits",
  //         url: "#",
  //       },
  //     ],
  //   },
  // ],
  projects: [
    {
      name: "Dashboard",
      url: "/",
      icon: <IconLayoutDashboardFilled />,
    },
  ],
  finance: [
    {
      name: "Accounts",
      url: "/accounts",
      icon: IconBuildingBank,
    },
    {
      name: "Transactions",
      url: "/transactions",
      icon: IconArrowsExchange,
    },
    {
      name: "Invoices",
      url: "/invoices",
      icon: IconFileInvoiceFilled,
    },
    {
      name: "Expenses",
      url: "/expenses",
      icon: IconReceiptEuroFilled,
    },
  ],
  employee: [
    {
      name: "Salary",
      url: "/salary",
      icon: IconCashBanknoteFilled,
    },
    {
      name: "Mileage",
      url: "/kms",
      icon: IconCarFilled,
    },
    {
      name: "Per diems",
      url: "/per-diems",
      icon: IconCreditCardFilled,
    },
  ],
  taxes: [
    {
      name: "IVA",
      url: "/iva",
      icon: IconCirclePercentageFilled,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher name={data.team.name} logo={data.team.logo} />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <NavProjects projects={data.projects} />
        <NavDocuments name="Finance" items={data.finance} />
        <NavDocuments name="Employee" items={data.employee} />
        <NavDocuments name="Taxes" items={data.taxes} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
