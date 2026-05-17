import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  brl,
  brl2,
  calculateExpectedPaymentDate,
  computeShift,
  fmtISO,
  useStore,
} from "@/lib/store";
import { Section } from "@/components/Section";
import { ArrowDownCircle, CalendarDays, ChevronLeft, ChevronRight, Scissors, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário Financeiro — Docfin" },
      { name: "description", content: "Visão de calendário com plantões, cirurgias e datas de recebimento projetadas." },
    ],
  }),
  component: CalendarioFinanceiro,
});

type DayEventType = "SHIFT" | "SURGERY" | "PAYMENT";
type FinancialStatus = "PAID" | "AWAITING" | "SCHEDULED";

interface DayEvent {
  id: string;
  type: DayEventType;
  date: string;
  label: string;
  amount: number;
  sub?: string;
  hours?: number;
  color: string;
  status: FinancialStatus;
  statusLabel: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NEUTRAL_EVENT_COLOR = "#64748b";

function CalendarioFinanceiro() {
  const store = useStore();
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => fmtISO(today));

  const calendarEvents = useMemo(() => {
    const events: DayEvent[] = [];
    const todayIso = fmtISO(today);

    for (const shift of store.shifts) {
      const wp = store.workplaces.find((w) => w.id === shift.workplaceId);
      const math = computeShift(store, shift);
      const color = workplaceColor(wp);
      const paymentIso = shift.expectedPaymentDate
        ?? (wp ? fmtISO(calculateExpectedPaymentDate(shift.date, wp)) : shift.date);

      events.push({
        id: `shift-${shift.id}`,
        type: "SHIFT",
        date: shift.date,
        label: wp?.name ?? "Plantão",
        amount: math.net,
        sub: `${shift.hours}h · líquido projetado`,
        hours: shift.hours,
        color,
        status: shift.date > todayIso ? "SCHEDULED" : "AWAITING",
        statusLabel: shift.date > todayIso ? "Previsto" : "Aguardando",
      });

      events.push({
        id: `payment-shift-${shift.id}`,
        type: "PAYMENT",
        date: paymentIso,
        label: wp?.name ?? "Recebimento",
        amount: math.net,
        sub: `Recebimento do plantão de ${formatShortDate(shift.date)}`,
        color,
        status: paymentIso > todayIso ? "SCHEDULED" : "AWAITING",
        statusLabel: paymentIso > todayIso ? "Previsto" : "Aguardando",
      });
    }

    for (const surgery of store.surgeries) {
      if (surgery.myRole === "TITULAR") {
        const wp = store.workplaces.find((w) => w.id === surgery.hospitalId);
        const color = workplaceColor(wp);
        const paymentIso = wp ? fmtISO(calculateExpectedPaymentDate(surgery.date, wp)) : surgery.date;
        const status: FinancialStatus = surgery.receivedFromHospital ? "PAID" : surgery.date > todayIso ? "SCHEDULED" : "AWAITING";
        const paymentStatus: FinancialStatus = surgery.receivedFromHospital ? "PAID" : paymentIso > todayIso ? "SCHEDULED" : "AWAITING";

        events.push({
          id: `surgery-${surgery.id}`,
          type: "SURGERY",
          date: surgery.date,
          label: wp?.name ?? "Cirurgia",
          amount: surgery.totalGross,
          sub: surgery.procedure || "Procedimento",
          color,
          status,
          statusLabel: status === "PAID" ? "Pago" : status === "SCHEDULED" ? "Previsto" : "Aguardando",
        });

        events.push({
          id: `payment-surgery-${surgery.id}`,
          type: "PAYMENT",
          date: paymentIso,
          label: wp?.name ?? "Recebimento",
          amount: surgery.totalGross,
          sub: `Recebimento de ${surgery.procedure || "cirurgia"}`,
          color,
          status: paymentStatus,
          statusLabel: paymentStatus === "PAID" ? "Pago" : paymentStatus === "SCHEDULED" ? "Previsto" : "Aguardando",
        });
      } else {
        const status: FinancialStatus = surgery.isReceived ? "PAID" : surgery.date > todayIso ? "SCHEDULED" : "AWAITING";
        events.push({
          id: `surgery-member-${surgery.id}`,
          type: "SURGERY",
          date: surgery.date,
          label: surgery.payingSurgeonName || "Cirurgia (membro)",
          amount: surgery.myExpectedShare,
          sub: surgery.procedure || "Procedimento",
          color: NEUTRAL_EVENT_COLOR,
          status,
          statusLabel: status === "PAID" ? "Pago" : status === "SCHEDULED" ? "Previsto" : "Aguardando",
        });
      }
    }

    return events;
  }, [store, today]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    for (const event of calendarEvents) {
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => eventPriority(a) - eventPriority(b) || b.amount - a.amount);
    }
    return map;
  }, [calendarEvents]);

  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const monthRange = useMemo(() => ({
    start: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
  }), [currentMonth]);

  const monthExecutionEvents = useMemo(
    () => calendarEvents.filter((event) => event.type !== "PAYMENT" && isIsoInRange(event.date, monthRange.start, monthRange.end)),
    [calendarEvents, monthRange],
  );
  const totalProjected = monthExecutionEvents.reduce((sum, event) => sum + event.amount, 0);
  const totalHours = monthExecutionEvents.reduce((sum, event) => sum + (event.hours ?? 0), 0);
  const selectedEvents = eventsByDay.get(selectedDate) ?? [];
  const selectedPaymentTotal = selectedEvents
    .filter((event) => event.type === "PAYMENT")
    .reduce((sum, event) => sum + event.amount, 0);

  function moveMonth(direction: -1 | 1) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  function goToday() {
    const next = new Date(today.getFullYear(), today.getMonth(), 1);
    setCurrentMonth(next);
    setSelectedDate(fmtISO(today));
  }

  return (
    <>
      <Section title="Calendário Financeiro" subtitle="Dashboard de vitórias: plantões, cirurgias e recebíveis por hospital">
        <div className="glass-card rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mês em visão</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="h-8 w-8 rounded-lg border border-border/70 inline-flex items-center justify-center hover:bg-muted/30 transition"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="font-display text-2xl capitalize min-w-[180px]">{monthTitle(currentMonth)}</h3>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="h-8 w-8 rounded-lg border border-border/70 inline-flex items-center justify-center hover:bg-muted/30 transition"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  className="h-8 px-3 rounded-lg border border-border/70 text-xs font-medium hover:bg-muted/30 transition"
                >
                  Hoje
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/5 bg-black/25 px-4 py-3 min-w-[170px]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Projetado</p>
                <p className="font-display text-2xl text-success mt-0.5">{brl(totalProjected)}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/25 px-4 py-3 min-w-[130px]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Horas Totais</p>
                <p className="font-display text-2xl text-foreground mt-0.5">{totalHours.toFixed(0)}h</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-black/20 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-white/[0.06]">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day) => {
                const iso = fmtISO(day.date);
                const dayEvents = eventsByDay.get(iso) ?? [];
                const visibleEvents = dayEvents.slice(0, 3);
                const isSelected = iso === selectedDate;
                const isToday = iso === fmtISO(today);

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    className={`min-h-[112px] border-r border-b border-white/[0.06] p-2 text-left align-top transition hover:bg-white/[0.035] ${
                      day.inMonth ? "bg-transparent" : "bg-black/20 opacity-45"
                    } ${isSelected ? "ring-1 ring-inset ring-white/60 bg-white/[0.04]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs tabular-nums ${isToday ? "text-success font-semibold" : "text-muted-foreground"}`}>
                        {day.date.getDate()}
                      </span>
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>

                    <div className="mt-1.5 space-y-1">
                      {visibleEvents.map((event) => (
                        <MiniEvent key={event.id} event={event} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 px-1 text-[11px] text-muted-foreground">
            <LegendDot className="bg-success" label="Pago" />
            <LegendDot className="bg-warning" label="Aguardando" />
            <LegendDot className="bg-muted-foreground" label="Previsto" />
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-1 rounded-full" style={{ background: NEUTRAL_EVENT_COLOR }} />
              Cor do hospital
            </span>
          </div>
        </div>
      </Section>

      <Section
        title={formatSelectedDate(selectedDate)}
        subtitle={
          selectedEvents.length === 0
            ? "Sem eventos neste dia"
            : selectedPaymentTotal > 0
              ? `Recebimento total esperado: ${brl(selectedPaymentTotal)}`
              : `${selectedEvents.length} evento(s)`
        }
      >
        <div className="glass-card rounded-2xl divide-y divide-border overflow-hidden">
          {selectedEvents.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
              <CalendarDays className="h-4 w-4" /> Nenhum plantão, cirurgia ou recebimento neste dia.
            </div>
          )}
          {selectedEvents.map((event) => (
            <SelectedEventRow key={event.id} event={event} />
          ))}
        </div>
      </Section>
    </>
  );
}

function MiniEvent({ event }: { event: DayEvent }) {
  return (
    <div
      className="min-w-0 rounded-md border border-white/[0.06] bg-white/[0.045] px-1.5 py-1"
      style={{
        boxShadow: `inset 3px 0 0 ${event.color}`,
      }}
    >
      <div className="flex items-center gap-1 min-w-0">
        <StatusPin status={event.status} />
        <span className="truncate text-[10px] leading-tight text-foreground/90">{event.label}</span>
      </div>
      <p className="mt-0.5 truncate text-[9px] leading-tight text-muted-foreground tabular-nums">
        {brl2(event.amount)}
      </p>
    </div>
  );
}

function SelectedEventRow({ event }: { event: DayEvent }) {
  const Icon = event.type === "PAYMENT" ? ArrowDownCircle : event.type === "SURGERY" ? Scissors : Stethoscope;
  return (
    <div className="p-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div
          className="h-9 w-9 rounded-xl bg-surface-elevated flex items-center justify-center shrink-0 border border-white/[0.06]"
          style={{ boxShadow: `inset 4px 0 0 ${event.color}` }}
        >
          <Icon className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <StatusPin status={event.status} />
            <p className="text-sm font-medium truncate">{event.label}</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {event.statusLabel}
            {event.sub ? ` · ${event.sub}` : ""}
          </p>
        </div>
      </div>
      <p className={`font-mono text-sm tabular-nums ${event.type === "PAYMENT" ? "text-success" : "text-muted-foreground"}`}>
        {brl2(event.amount)}
      </p>
    </div>
  );
}

function StatusPin({ status }: { status: FinancialStatus }) {
  const className = status === "PAID"
    ? "bg-success"
    : status === "AWAITING"
      ? "bg-warning"
      : "bg-muted-foreground";
  return <span className={`h-2 w-2 rounded-full shrink-0 ${className}`} aria-hidden="true" />;
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function workplaceColor(workplace: unknown) {
  const color = typeof (workplace as any)?.color === "string" ? (workplace as any).color.trim() : "";
  return color || NEUTRAL_EVENT_COLOR;
}

function eventPriority(event: DayEvent) {
  if (event.type === "SHIFT") return 1;
  if (event.type === "SURGERY") return 2;
  return 3;
}

function buildCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const start = new Date(year, monthIndex, 1 - first.getDay());
  const days: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days.push({ date, inMonth: date.getMonth() === monthIndex });
  }
  return days;
}

function isIsoInRange(iso: string, start: Date, end: Date) {
  const value = new Date(`${iso}T12:00:00`).getTime();
  return value >= start.getTime() && value < end.getTime();
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function monthTitle(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatSelectedDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(iso: string) {
  return iso.split("-").reverse().join("/");
}
