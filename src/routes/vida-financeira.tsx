import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import {
  DebtsCard,
  GoalsCard,
  VehicleCard,
} from "@/components/ManagementCards";

export const Route = createFileRoute("/vida-financeira")({
  head: () => ({
    meta: [
      { title: "Vida Financeira — Docfin" },
      { name: "description", content: "Finanças pessoais, veículo, dívidas e metas do médico." },
    ],
  }),
  component: VidaFinanceiraPage,
});

function VidaFinanceiraPage() {
  return (
    <div className="space-y-4">
      <header className="px-5 pt-5 pb-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Vida PF</p>
        <h1 className="font-display text-2xl mt-1">Vida Financeira</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organização da vida privada: logística, dívidas e metas pessoais.
        </p>
      </header>

      <section className="px-5">
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-400/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/80">Modo Vida Privada</p>
              <p className="text-sm text-emerald-50/90 mt-1">
                Modo Vida Privada: Os dados desta seção são para seu planejamento pessoal e não integram o dossiê contábil da sua Empresa (PJ).
              </p>
            </div>
          </div>
        </div>
      </section>

      <ExpenseDashboard />
      <VehicleCard />
      <DebtsCard />
      <GoalsCard />
    </div>
  );
}
