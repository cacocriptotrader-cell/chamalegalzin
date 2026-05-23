import { createFileRoute } from "@tanstack/react-router";
import { DocumentsCard, DocumentsCriticalAlerts } from "@/components/ManagementCards";

export const Route = createFileRoute("/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos — Docfin" },
      { name: "description", content: "Cofre de compliance fiscal, documentos profissionais e alertas de validade." },
    ],
  }),
  component: DocumentosPage,
});

function DocumentosPage() {
  return (
    <div className="space-y-2">
      <header className="px-5 pt-5 pb-1">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Backoffice PJ</p>
        <h1 className="font-display text-2xl mt-1">Documentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cofre de compliance para CRM, certificado digital, vencimentos e pendências do contador.
        </p>
      </header>
      <DocumentsCriticalAlerts />
      <DocumentsCard />
    </div>
  );
}
