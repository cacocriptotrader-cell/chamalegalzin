import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Calculator, FileText, ShieldCheck, Table2, WalletCards } from "lucide-react";
import { useMemo } from "react";
import { brl2, useStore, type Shift, type TaxRegime } from "@/lib/store";
import { simulateProLabore } from "@/lib/payrollEngine";

export const Route = createFileRoute("/auditoria-2026")({
  head: () => ({
    meta: [
      { title: "Auditoria 2026 — Docfin" },
      { name: "description", content: "Relatório read-only da seed E2E 2026 com segregação por regime e validação de pró-labore." },
    ],
  }),
  component: Audit2026Page,
});

const SEED_MARKER = "E2E_2026_FULL_REGIMES";
const PRO_LABORE_TARGET = 4_872;
const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

type RegimeBucket = "PJ_SIMPLES" | "PIX_PF" | "BOLSA_CLT";

type MonthlyAuditRow = {
  month: number;
  label: string;
  totalRecords: number;
  pjGross: number;
  pixGross: number;
  cltGross: number;
  totalGross: number;
  fatorR: number;
  payrollGross: number;
  inss: number;
  irrf: number;
  additionalReducer: number;
  netPayroll: number;
};

function Audit2026Page() {
  const store = useStore();
  const report = useMemo(() => buildAuditReport(store.shifts), [store.shifts]);
  const firstRow = report.rows[0];

  return (
    <div className="w-full max-w-full min-w-0 space-y-5 overflow-x-hidden px-4 py-5 sm:px-5 md:py-7">
      <header className="premium-card rounded-3xl p-5 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Link
              to="/gestao"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para Configurações
            </Link>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Relatório de auditoria E2E 2026
            </p>
            <h1 className="mt-4 font-display text-2xl text-foreground sm:text-3xl">
              Segregação de receitas e Lei 15.270/2025
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Visualização read-only dos registros gerados pela seed <span className="font-mono text-foreground">{SEED_MARKER}</span>,
              agrupando os 15 lançamentos mensais por regime e simulando o pró-labore usado para manter Fator R em 28%.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Status da amostra</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-foreground tabular-nums">{report.totalRecords}</p>
            <p className="text-xs text-muted-foreground">registros encontrados</p>
          </div>
        </div>
      </header>

      {report.totalRecords === 0 ? (
        <section className="premium-card rounded-2xl p-6 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 font-display text-xl text-foreground">Nenhuma seed 2026 encontrada</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Execute primeiro o botão "Run E2E Seed (2026) - Full Regimes" em Configurações para gerar os dados de auditoria.
          </p>
          <Link
            to="/gestao"
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Ir para Configurações
          </Link>
        </section>
      ) : (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <AuditKpi icon={WalletCards} label="Receita PJ mensal" value={brl2(firstRow?.pjGross ?? 0)} detail="12 plantões PJ_SIMPLES" tone="success" />
            <AuditKpi icon={Table2} label="Receita PIX/PF mensal" value={brl2(firstRow?.pixGross ?? 0)} detail="2 plantões particulares" tone="warning" />
            <AuditKpi icon={BadgeCheck} label="Bolsa/CLT mensal" value={brl2(firstRow?.cltGross ?? 0)} detail="1 registro fixo" />
            <AuditKpi icon={Calculator} label="Fator R projetado" value={formatPercent(firstRow?.fatorR ?? 0)} detail={`Pró-labore ${brl2(PRO_LABORE_TARGET)}`} tone="success" />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.8fr)]">
            <div className="premium-card overflow-hidden rounded-2xl">
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Matriz mensal por regime</p>
                <h2 className="mt-1 font-display text-lg text-foreground">Separação da base operacional 2026</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="border-b border-border bg-surface-elevated/60 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Mês</th>
                      <th className="px-4 py-3 text-right font-semibold">PJ_SIMPLES</th>
                      <th className="px-4 py-3 text-right font-semibold">PIX/PF</th>
                      <th className="px-4 py-3 text-right font-semibold">BOLSA/CLT</th>
                      <th className="px-4 py-3 text-right font-semibold">Total bruto</th>
                      <th className="px-4 py-3 text-right font-semibold">Fator R</th>
                      <th className="px-4 py-3 text-right font-semibold">Registros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.rows.map((row) => (
                      <tr key={row.month} className="transition hover:bg-surface-elevated/40">
                        <td className="px-4 py-3 font-medium text-foreground">{row.label}</td>
                        <td className="px-4 py-3 text-right font-mono text-success tabular-nums">{brl2(row.pjGross)}</td>
                        <td className="px-4 py-3 text-right font-mono text-warning tabular-nums">{brl2(row.pixGross)}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground tabular-nums">{brl2(row.cltGross)}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground tabular-nums">{brl2(row.totalGross)}</td>
                        <td className="px-4 py-3 text-right font-mono text-success tabular-nums">{formatPercent(row.fatorR)}</td>
                        <td className="px-4 py-3 text-right font-mono text-muted-foreground tabular-nums">{row.totalRecords}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <section className="premium-card rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Matriz final de cálculo</p>
                <h2 className="mt-1 font-display text-lg text-foreground">Pró-labore shadow mode</h2>
                <div className="mt-4 space-y-3">
                  <MatrixRow label="Pró-labore bruto" value={brl2(report.payroll.grossAmount)} />
                  <MatrixRow label="INSS retido" value={brl2(report.payroll.inssAmount)} />
                  <MatrixRow label="Base IRRF" value={brl2(report.payroll.irrfTaxableBase)} />
                  <MatrixRow label="Redutor adicional 2026" value={`+ ${brl2(report.payroll.additionalReducer)}`} tone="success" />
                  <MatrixRow label="IRRF final" value={brl2(report.payroll.irrfAmount)} />
                  <MatrixRow label="Líquido pró-labore" value={brl2(report.payroll.netAmount)} emphasis />
                </div>
                <p className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs leading-relaxed text-muted-foreground">
                  O Fator R usa somente a receita PJ_SIMPLES mensal da seed: {brl2(firstRow?.pjGross ?? 0)}. A segregação PIX/PF e BOLSA/CLT permanece fora da base PJ.
                </p>
              </section>

              <section className="premium-card rounded-2xl p-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Resumo anual</p>
                <div className="mt-4 grid gap-3">
                  <MatrixRow label="PJ_SIMPLES anual" value={brl2(report.annual.pjGross)} />
                  <MatrixRow label="PIX/PF anual" value={brl2(report.annual.pixGross)} />
                  <MatrixRow label="BOLSA/CLT anual" value={brl2(report.annual.cltGross)} />
                  <MatrixRow label="Total bruto anual" value={brl2(report.annual.totalGross)} emphasis />
                </div>
              </section>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function buildAuditReport(shifts: Shift[]) {
  const seeded = shifts.filter((shift) => shift.procedure?.includes(SEED_MARKER));
  const payroll = simulateProLabore(PRO_LABORE_TARGET, 0);

  const rows: MonthlyAuditRow[] = MONTHS.map((month) => {
    const monthShifts = seeded.filter((shift) => shift.date.startsWith(`2026-${String(month).padStart(2, "0")}`));
    const grouped = groupByRegime(monthShifts);
    const pjGross = grouped.PJ_SIMPLES;
    const pixGross = grouped.PIX_PF;
    const cltGross = grouped.BOLSA_CLT;
    const totalGross = pjGross + pixGross + cltGross;
    const fatorR = pjGross > 0 ? payroll.grossAmount / pjGross : 0;

    return {
      month,
      label: monthLabel(month),
      totalRecords: monthShifts.length,
      pjGross,
      pixGross,
      cltGross,
      totalGross,
      fatorR,
      payrollGross: payroll.grossAmount,
      inss: payroll.inssAmount,
      irrf: payroll.irrfAmount,
      additionalReducer: payroll.additionalReducer,
      netPayroll: payroll.netAmount,
    };
  });

  const annual = rows.reduce(
    (acc, row) => ({
      pjGross: acc.pjGross + row.pjGross,
      pixGross: acc.pixGross + row.pixGross,
      cltGross: acc.cltGross + row.cltGross,
      totalGross: acc.totalGross + row.totalGross,
    }),
    { pjGross: 0, pixGross: 0, cltGross: 0, totalGross: 0 },
  );

  return {
    totalRecords: seeded.length,
    rows,
    annual,
    payroll,
  };
}

function groupByRegime(shifts: Shift[]) {
  return shifts.reduce<Record<RegimeBucket, number>>(
    (acc, shift) => {
      acc[toBucket(shift.taxRegimeOverride)] += shift.gross;
      return acc;
    },
    { PJ_SIMPLES: 0, PIX_PF: 0, BOLSA_CLT: 0 },
  );
}

function toBucket(regime?: TaxRegime): RegimeBucket {
  if (regime === "PJ_SIMPLES") return "PJ_SIMPLES";
  if (regime === "PARTICULAR_PIX" || regime === "PF" || regime === "RPA") return "PIX_PF";
  return "BOLSA_CLT";
}

function AuditKpi({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-foreground";

  return (
    <section className="premium-card rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}

function MatrixRow({
  label,
  value,
  tone = "default",
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "success";
  emphasis?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${emphasis ? "border-t border-border pt-3" : ""}`}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${tone === "success" ? "text-success" : "text-foreground"} ${emphasis ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function monthLabel(month: number) {
  return new Date(2026, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function formatPercent(value: number) {
  return `${(value * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}
