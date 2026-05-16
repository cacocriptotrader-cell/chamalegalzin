import { createFileRoute } from "@tanstack/react-router";
import {
  DebtsCard,
  FixedCard,
  GoalsCard,
  VehicleCard,
} from "@/components/ManagementCards";

export const Route = createFileRoute("/vida-financeira")({
  head: () => ({
    meta: [
      { title: "Vida Financeira — Docfin" },
      { name: "description", content: "Finanças pessoais, veículo, custos fixos, dívidas e metas do médico." },
    ],
  }),
  component: VidaFinanceiraPage,
});

function VidaFinanceiraPage() {
  return (
    <div className="space-y-2">
      <header className="px-5 pt-5 pb-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Vida PF</p>
        <h1 className="font-display text-2xl mt-1">Vida Financeira</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organização da vida privada: logística, custos recorrentes, dívidas e metas pessoais.
        </p>
      </header>
      <VehicleCard />
      <FixedCard />
      <DebtsCard />
      <GoalsCard />
    </div>
  );
}
