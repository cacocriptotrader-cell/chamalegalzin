import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/routes/landing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Docfin — Cockpit Financeiro para Médicos" },
      {
        name: "description",
        content:
          "Wealth Management para médicos plantonistas: separe PF de PJ, automatize o Dossiê Fiscal e monitore o Fator R.",
      },
    ],
  }),
  component: LandingPage,
});
