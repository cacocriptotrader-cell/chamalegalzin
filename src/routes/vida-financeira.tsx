import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, TrendingUp, WalletCards } from "lucide-react";
import { ExpenseDashboard } from "@/components/ExpenseDashboard";
import {
  DebtsCard,
  GoalsCard,
  VehicleCard,
} from "@/components/ManagementCards";
import { WealthProjectionCockpit } from "@/routes/futuro";

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
  const [activeTab, setActiveTab] = useState<"vida-pf" | "projecoes">("vida-pf");

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
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("vida-pf")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
              activeTab === "vida-pf"
                ? "bg-primary text-primary-foreground shadow-[0_14px_40px_rgba(15,118,110,0.22)]"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <WalletCards className="h-4 w-4" />
            Análise de consumo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("projecoes")}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
              activeTab === "projecoes"
                ? "bg-primary text-primary-foreground shadow-[0_14px_40px_rgba(15,118,110,0.22)]"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Projeções
          </button>
        </div>
      </section>

      {activeTab === "projecoes" ? (
        <section className="px-5">
          <WealthProjectionCockpit />
        </section>
      ) : (
        <>
      <section className="px-5">
        <div className="rounded-2xl border border-success/20 bg-success/10 p-4 shadow-[0_18px_60px_rgba(2,6,23,0.20)]">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-success/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-success">Modo Vida Privada</p>
              <p className="text-sm text-success mt-1">
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
        </>
      )}
    </div>
  );
}
