import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useStore, computeShift, calculateExpectedPaymentDate,
  brl, brl2, fmtISO,
} from "@/lib/store";
import { Section } from "@/components/Section";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, ArrowDownCircle, Stethoscope, Scissors } from "lucide-react";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário Financeiro — Docfin" },
      { name: "description", content: "Visão de calendário com plantões, cirurgias e datas de recebimento projetadas." },
    ],
  }),
  component: CalendarioFinanceiro,
});

interface DayEvent {
  type: "SHIFT" | "SURGERY" | "PAYMENT";
  label: string;
  amount?: number;
  sub?: string;
}

function CalendarioFinanceiro() {
  const store = useStore();
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    const push = (key: string, ev: DayEvent) => {
      const arr = map.get(key) ?? [];
      arr.push(ev);
      map.set(key, arr);
    };

    for (const s of store.shifts) {
      const wp = store.workplaces.find((w) => w.id === s.workplaceId);
      const math = computeShift(store, s);
      // dia do plantão
      push(s.date, {
        type: "SHIFT",
        label: `Plantão · ${wp?.name ?? "—"}`,
        amount: math.net,
        sub: `${s.hours}h · líquido projetado`,
      });
      // dia de pagamento esperado
      const payIso = s.expectedPaymentDate
        ?? (wp ? fmtISO(calculateExpectedPaymentDate(s.date, wp)) : null);
      if (payIso) {
        push(payIso, {
          type: "PAYMENT",
          label: `Recebimento · ${wp?.name ?? "—"}`,
          amount: math.net,
          sub: `Plantão de ${s.date.split("-").reverse().join("/")}`,
        });
      }
    }

    for (const sg of store.surgeries) {
      if (sg.myRole === "TITULAR") {
        const wp = store.workplaces.find((w) => w.id === sg.hospitalId);
        push(sg.date, {
          type: "SURGERY",
          label: `Cirurgia · ${wp?.name ?? "—"}`,
          amount: sg.totalGross,
          sub: sg.procedure || "Procedimento",
        });
        const payIso = wp ? fmtISO(calculateExpectedPaymentDate(sg.date, wp)) : null;
        if (payIso) {
          push(payIso, {
            type: "PAYMENT",
            label: `Recebimento · ${wp?.name ?? "—"}`,
            amount: sg.totalGross,
            sub: `Cirurgia ${sg.procedure || ""}`.trim(),
          });
        }
      } else {
        push(sg.date, {
          type: "SURGERY",
          label: `Cirurgia (membro) · ${sg.payingSurgeonName}`,
          amount: sg.myExpectedShare,
          sub: sg.procedure || "Procedimento",
        });
      }
    }

    return map;
  }, [store]);

  const eventDates = useMemo(() => {
    const eventDays: Date[] = [];
    const paymentDays: Date[] = [];
    for (const [iso, evs] of eventsByDay.entries()) {
      const d = new Date(iso + "T12:00:00");
      const hasPayment = evs.some((e) => e.type === "PAYMENT");
      const hasOther = evs.some((e) => e.type !== "PAYMENT");
      if (hasPayment) paymentDays.push(d);
      if (hasOther) eventDays.push(d);
    }
    return { eventDays, paymentDays };
  }, [eventsByDay]);

  const selectedKey = selected ? fmtISO(selected) : "";
  const selectedEvents = selected ? eventsByDay.get(selectedKey) ?? [] : [];
  const selectedPaymentTotal = selectedEvents
    .filter((e) => e.type === "PAYMENT")
    .reduce((a, e) => a + (e.amount ?? 0), 0);

  return (
    <>
      <Section title="Calendário Financeiro" subtitle="Plantões, cirurgias e datas de recebimento projetadas">
        <div className="glass-card rounded-2xl p-3 md:p-5">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            modifiers={{
              hasEvent: eventDates.eventDays,
              hasPayment: eventDates.paymentDays,
            }}
            modifiersClassNames={{
              hasEvent: "rdp-has-event",
              hasPayment: "rdp-has-payment",
            }}
          />
          <div className="flex items-center gap-4 mt-3 px-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" /> Plantão / Cirurgia
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md border border-emerald-500" /> Recebimento esperado
            </span>
          </div>
        </div>

        {/* CSS escopado para o day-picker v9 — mantém o grid nativo intacto */}
        <style>{`
          .rdp-docfin {
            --rdp-accent-color: #fafafa;
            --rdp-accent-background-color: #fafafa;
            --rdp-background-color: transparent;
            --rdp-today-color: #fafafa;
            --rdp-day-height: 2.5rem;
            --rdp-day-width: 2.5rem;
            color: #fafafa;
            font-family: inherit;
          }
          .rdp-docfin .rdp-month_caption,
          .rdp-docfin .rdp-caption_label { color: #fafafa; font-size: 0.875rem; font-weight: 500; }
          .rdp-docfin .rdp-weekday {
            color: #71717a; font-weight: 400; font-size: 10px;
            text-transform: uppercase; letter-spacing: 0.08em;
          }
          .rdp-docfin .rdp-day { font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }
          .rdp-docfin .rdp-day_button {
            border-radius: 0.5rem;
            color: #e4e4e7;
            transition: background 120ms ease;
          }
          .rdp-docfin .rdp-day_button:hover { background: #27272a; }
          .rdp-docfin .rdp-outside .rdp-day_button { color: #52525b; }
          .rdp-docfin .rdp-today .rdp-day_button { box-shadow: inset 0 0 0 1px #52525b; }
          .rdp-docfin .rdp-selected .rdp-day_button {
            background: #fafafa !important; color: #09090b !important;
          }
          .rdp-docfin .rdp-chevron { fill: #a1a1aa; }
          .rdp-docfin .rdp-button_previous,
          .rdp-docfin .rdp-button_next {
            border: 1px solid #27272a; border-radius: 0.5rem;
          }
          .rdp-docfin .rdp-button_previous:hover,
          .rdp-docfin .rdp-button_next:hover { background: #27272a; }

          .rdp-docfin .rdp-has-event .rdp-day_button { position: relative; }
          .rdp-docfin .rdp-has-event .rdp-day_button::after {
            content: ""; position: absolute; left: 50%; bottom: 4px;
            transform: translateX(-50%);
            width: 4px; height: 4px; border-radius: 9999px;
            background: #a1a1aa;
          }
          .rdp-docfin .rdp-has-payment .rdp-day_button {
            box-shadow: inset 0 0 0 1px #10b981;
            background: rgba(16,185,129,0.08);
            color: #fafafa;
          }
        `}</style>
      </Section>

      <Section
        title={selected ? selected.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "Selecione um dia"}
        subtitle={
          selectedEvents.length === 0
            ? "Sem eventos neste dia"
            : selectedPaymentTotal > 0
            ? `Recebimento total esperado: ${brl(selectedPaymentTotal)}`
            : `${selectedEvents.length} evento(s)`
        }
      >
        <div className="glass-card rounded-2xl divide-y divide-border">
          {selectedEvents.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
              <CalendarDays className="h-4 w-4" /> Nenhum plantão, cirurgia ou recebimento neste dia.
            </div>
          )}
          {selectedEvents.map((e, i) => {
            const Icon = e.type === "PAYMENT" ? ArrowDownCircle : e.type === "SURGERY" ? Scissors : Stethoscope;
            const tone =
              e.type === "PAYMENT" ? "text-emerald-400" :
              e.type === "SURGERY" ? "text-foreground" : "text-foreground";
            return (
              <div key={i} className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-surface-elevated flex items-center justify-center shrink-0">
                    <Icon className={`h-4 w-4 ${tone}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.label}</p>
                    {e.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{e.sub}</p>}
                  </div>
                </div>
                {typeof e.amount === "number" && (
                  <p className={`font-mono text-sm tabular-nums ${e.type === "PAYMENT" ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {brl2(e.amount)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}
