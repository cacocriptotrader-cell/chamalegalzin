import { createFileRoute } from "@tanstack/react-router";
import {
  FixedIncomeCard,
  InssMonitorCard,
  ProLaboreAutoCard,
  WorkplacesCard,
} from "@/components/ManagementCards";

export const Route = createFileRoute("/empresa")({
  head: () => ({
    meta: [
      { title: "Empresa & Hospitais — Docfin" },
      { name: "description", content: "Cadastros operacionais da empresa médica, hospitais, vínculos e parâmetros fiscais." },
    ],
  }),
  component: EmpresaPage,
});

function EmpresaPage() {
  return (
    <div className="space-y-2">
      <header className="px-5 pt-5 pb-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Backoffice PJ</p>
        <h1 className="font-display text-2xl mt-1">Empresa & Hospitais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastros que sustentam operação médica, regras de pagamento, INSS e Fator R.
        </p>
      </header>
      <InssMonitorCard />
      <ProLaboreAutoCard />
      <WorkplacesCard />
      <FixedIncomeCard />
    </div>
  );
}
