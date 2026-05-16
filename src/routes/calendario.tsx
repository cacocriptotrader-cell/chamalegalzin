import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventContentArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import {
  useStore,
  computeShift,
  calculateExpectedPaymentDate,
  brl,
  brl2,
  fmtISO,
  hospitalColorAt,
  type Shift,
  type SurgeryRecord,
  type Workplace,
} from "@/lib/store";
import { Section } from "@/components/Section";
import { CalendarDays, ChevronLeft, ChevronRight, Scissors, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário Financeiro — Docfin" },
      { name: "description", content: "Calendário operacional de fluxo de caixa para plantões, cirurgias e recebíveis." },
    ],
  }),
  component: CalendarioFinanceiro,
});

type CalendarMode = "EXECUTION_DATE" | "PAYMENT_DATE";
type FinancialStatus = "SCHEDULED" | "AWAITING_PAYMENT" | "PAID" | "OVERDUE";
type CalendarItemType = "SHIFT" | "SURGERY";

interface CashflowCalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: true;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    type: CalendarItemType;
    hospitalName: string;
    hospitalColor: string;
    amount: number;
    status: FinancialStatus;
    statusLabel: string;
    sub: string;
    executionDate: string;
    paymentDate: string;
  };
}

const NEUTRAL_HOSPITAL_COLOR = "#8E949B";
const MODE_LABEL: Record<CalendarMode, string> = {
  EXECUTION_DATE: "Data de Execução",
  PAYMENT_DATE: "Data Prevista de Recebimento",
};

function CalendarioFinanceiro() {
  const store = useStore();
  const calendarRef = useRef<FullCalendar | null>(null);
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [mode, setMode] = useState<CalendarMode>("EXECUTION_DATE");
  const [selectedDate, setSelectedDate] = useState(() => fmtISO(today));
  const [viewTitle, setViewTitle] = useState(() => monthTitle(today));
  const [visibleRange, setVisibleRange] = useState(() => ({
    start: new Date(today.getFullYear(), today.getMonth(), 1),
    end: new Date(today.getFullYear(), today.getMonth() + 1, 1),
  }));

  const calendarEvents = useMemo(
    () => buildCashflowEvents(store.shifts, store.surgeries, store.workplaces, mode, today),
    [mode, store.shifts, store.surgeries, store.workplaces, today],
  );

  const visibleEvents = useMemo(
    () => calendarEvents.filter((event) => isIsoInRange(event.start, visibleRange.start, visibleRange.end)),
    [calendarEvents, visibleRange],
  );

  const selectedEvents = useMemo(
    () => calendarEvents
      .filter((event) => event.start === selectedDate)
      .sort((a, b) => b.extendedProps.amount - a.extendedProps.amount),
    [calendarEvents, selectedDate],
  );

  const viewGross = visibleEvents.reduce((sum, event) => sum + event.extendedProps.amount, 0);
  const selectedGross = selectedEvents.reduce((sum, event) => sum + event.extendedProps.amount, 0);

  function handleDatesSet(arg: DatesSetArg) {
    setViewTitle(arg.view.title || monthTitle(arg.view.currentStart));
    setVisibleRange({ start: arg.view.currentStart, end: arg.view.currentEnd });
    setSelectedDate((current) => (
      isIsoInRange(current, arg.view.currentStart, arg.view.currentEnd)
        ? current
        : fmtISO(arg.view.currentStart)
    ));
  }

  function handleDateClick(arg: DateClickArg) {
    setSelectedDate(arg.dateStr);
  }

  function handleEventClick(arg: EventClickArg) {
    setSelectedDate(arg.event.startStr.slice(0, 10));
  }

  return (
    <>
      <Section title="Calendário Financeiro" subtitle="Fluxo de caixa operacional por hospital, data de execução e recebimento">
        <div className="glass-card rounded-2xl p-4 md:p-5 space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mês em visão</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => calendarRef.current?.getApi().prev()}
                  className="h-8 w-8 rounded-lg border border-border/70 inline-flex items-center justify-center hover:bg-muted/30 transition"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="font-display text-2xl capitalize min-w-[180px]">{viewTitle}</h3>
                <button
                  type="button"
                  onClick={() => calendarRef.current?.getApi().next()}
                  className="h-8 w-8 rounded-lg border border-border/70 inline-flex items-center justify-center hover:bg-muted/30 transition"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => calendarRef.current?.getApi().today()}
                  className="h-8 px-3 rounded-lg border border-border/70 text-xs font-medium hover:bg-muted/30 transition"
                >
                  Hoje
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="rounded-xl border border-white/5 bg-black/25 px-4 py-3 min-w-[190px]">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Faturamento bruto</p>
                <p className="font-display text-2xl text-emerald-300 mt-0.5">{brl(viewGross)}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{visibleEvents.length} evento(s) na visualização</p>
              </div>

              <div className="inline-grid grid-cols-2 rounded-xl border border-border/70 bg-black/20 p-1">
                {(Object.keys(MODE_LABEL) as CalendarMode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                      mode === value ? "bg-white text-zinc-950" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {value === "EXECUTION_DATE" ? "Execução" : "Recebimento"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="docfin-calendar-shell">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={ptBrLocale}
              headerToolbar={false}
              height="auto"
              fixedWeekCount={false}
              dayMaxEvents={3}
              moreLinkText={(count) => `+${count}`}
              events={calendarEvents}
              eventContent={renderCalendarEvent}
              datesSet={handleDatesSet}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              dayCellClassNames={(arg) => (fmtISO(arg.date) === selectedDate ? ["docfin-selected-day"] : [])}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {store.workplaces.slice(0, 6).map((wp, index) => (
              <span key={wp.id} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ background: wp.color || hospitalColorAt(index) }} />
                {wp.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-white/20 bg-zinc-500" />
              Sem hospital
            </span>
          </div>
        </div>

        <style>{calendarCss}</style>
      </Section>

      <Section
        title={formatSelectedDate(selectedDate)}
        subtitle={
          selectedEvents.length === 0
            ? "Sem eventos neste dia"
            : `${MODE_LABEL[mode]} · ${selectedEvents.length} evento(s) · ${brl(selectedGross)} bruto`
        }
      >
        <div className="glass-card rounded-2xl divide-y divide-border overflow-hidden">
          {selectedEvents.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground inline-flex items-center justify-center gap-2 w-full">
              <CalendarDays className="h-4 w-4" /> Nenhum plantão ou cirurgia nesta data.
            </div>
          )}
          {selectedEvents.map((event) => {
            const Icon = event.extendedProps.type === "SURGERY" ? Scissors : Stethoscope;
            return (
              <div key={event.id} className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      background: withAlpha(event.extendedProps.hospitalColor, 0.18),
                      borderColor: withAlpha(event.extendedProps.hospitalColor, 0.42),
                    }}
                  >
                    <Icon className="h-4 w-4" style={{ color: event.extendedProps.hospitalColor }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{event.extendedProps.sub}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px] text-muted-foreground">
                      <span>Execução: {formatShortDate(event.extendedProps.executionDate)}</span>
                      <span>Recebimento: {formatShortDate(event.extendedProps.paymentDate)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm text-emerald-300 tabular-nums">{brl2(event.extendedProps.amount)}</p>
                  <StatusPill status={event.extendedProps.status} label={event.extendedProps.statusLabel} />
                </div>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

function buildCashflowEvents(
  shifts: Shift[],
  surgeries: SurgeryRecord[],
  workplaces: Workplace[],
  mode: CalendarMode,
  today: Date,
): CashflowCalendarEvent[] {
  const events: CashflowCalendarEvent[] = [];

  for (const shift of shifts) {
    const workplace = workplaces.find((w) => w.id === shift.workplaceId);
    const paymentDate = shift.expectedPaymentDate
      ?? (workplace ? fmtISO(calculateExpectedPaymentDate(shift.date, workplace)) : shift.date);
    const eventDate = mode === "EXECUTION_DATE" ? shift.date : paymentDate;
    const status = deriveFinancialStatus({
      executionDate: shift.date,
      paymentDate,
      paid: shift.paymentStatus === "PAID",
      today,
    });
    const color = workplace?.color || NEUTRAL_HOSPITAL_COLOR;

    events.push(createCalendarEvent({
      id: `shift-${shift.id}`,
      type: "SHIFT",
      title: `${shortName(workplace?.name ?? "Plantão")} · Plantão`,
      date: eventDate,
      hospitalName: workplace?.name ?? "Hospital não informado",
      hospitalColor: color,
      amount: shift.gross,
      status,
      sub: `${shift.hours}h · bruto do plantão`,
      executionDate: shift.date,
      paymentDate,
    }));
  }

  for (const surgery of surgeries) {
    if (surgery.myRole === "TITULAR") {
      const workplace = workplaces.find((w) => w.id === surgery.hospitalId);
      const paymentDate = workplace ? fmtISO(calculateExpectedPaymentDate(surgery.date, workplace)) : surgery.date;
      const eventDate = mode === "EXECUTION_DATE" ? surgery.date : paymentDate;
      const color = workplace?.color || NEUTRAL_HOSPITAL_COLOR;
      const status = deriveFinancialStatus({
        executionDate: surgery.date,
        paymentDate,
        paid: surgery.receivedFromHospital,
        today,
      });

      events.push(createCalendarEvent({
        id: `surgery-${surgery.id}`,
        type: "SURGERY",
        title: `${shortName(workplace?.name ?? "Cirurgia")} · Cirurgia`,
        date: eventDate,
        hospitalName: workplace?.name ?? "Hospital não informado",
        hospitalColor: color,
        amount: surgery.totalGross,
        status,
        sub: surgery.procedure || "Procedimento sem descrição",
        executionDate: surgery.date,
        paymentDate,
      }));
    } else {
      const eventDate = surgery.date;
      const status = deriveFinancialStatus({
        executionDate: surgery.date,
        paymentDate: surgery.date,
        paid: surgery.isReceived,
        today,
      });

      events.push(createCalendarEvent({
        id: `surgery-member-${surgery.id}`,
        type: "SURGERY",
        title: `${shortName(surgery.payingSurgeonName)} · Repasse`,
        date: eventDate,
        hospitalName: surgery.payingSurgeonName,
        hospitalColor: NEUTRAL_HOSPITAL_COLOR,
        amount: surgery.myExpectedShare,
        status,
        sub: surgery.procedure || "Cirurgia como membro da equipe",
        executionDate: surgery.date,
        paymentDate: surgery.date,
      }));
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start) || b.extendedProps.amount - a.extendedProps.amount);
}

function createCalendarEvent(params: {
  id: string;
  type: CalendarItemType;
  title: string;
  date: string;
  hospitalName: string;
  hospitalColor: string;
  amount: number;
  status: FinancialStatus;
  sub: string;
  executionDate: string;
  paymentDate: string;
}): CashflowCalendarEvent {
  return {
    id: params.id,
    title: params.title,
    start: params.date,
    allDay: true,
    backgroundColor: withAlpha(params.hospitalColor, 0.18),
    borderColor: withAlpha(params.hospitalColor, 0.55),
    textColor: "#f8fafc",
    extendedProps: {
      type: params.type,
      hospitalName: params.hospitalName,
      hospitalColor: params.hospitalColor,
      amount: params.amount,
      status: params.status,
      statusLabel: statusLabel(params.status),
      sub: params.sub,
      executionDate: params.executionDate,
      paymentDate: params.paymentDate,
    },
  };
}

function renderCalendarEvent(arg: EventContentArg) {
  const props = arg.event.extendedProps as CashflowCalendarEvent["extendedProps"];
  return (
    <div className="docfin-event">
      <div className="docfin-event-top">
        <span className={`docfin-status-dot status-${props.status.toLowerCase()}`} />
        <span className="docfin-event-title">{arg.event.title}</span>
      </div>
      <div className="docfin-event-amount">{brl2(props.amount)}</div>
    </div>
  );
}

function StatusPill({ status, label }: { status: FinancialStatus; label: string }) {
  return (
    <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] status-pill-${status.toLowerCase()}`}>
      <span className={`h-1.5 w-1.5 rounded-full status-dot-${status.toLowerCase()}`} />
      {label}
    </span>
  );
}

function deriveFinancialStatus(input: { executionDate: string; paymentDate: string; paid: boolean; today: Date }): FinancialStatus {
  if (input.paid) return "PAID";
  const execution = parseLocalIso(input.executionDate);
  const payment = parseLocalIso(input.paymentDate);
  if (execution > input.today) return "SCHEDULED";
  if (payment < input.today) return "OVERDUE";
  return "AWAITING_PAYMENT";
}

function statusLabel(status: FinancialStatus) {
  if (status === "PAID") return "Pago";
  if (status === "OVERDUE") return "Atrasado";
  if (status === "AWAITING_PAYMENT") return "Aguardando pagamento";
  return "Agendado";
}

function parseLocalIso(iso: string) {
  return startOfLocalDay(new Date(`${iso}T12:00:00`));
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isIsoInRange(iso: string, start: Date, end: Date) {
  const date = parseLocalIso(iso);
  return date >= startOfLocalDay(start) && date < startOfLocalDay(end);
}

function monthTitle(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function formatSelectedDate(iso: string) {
  return parseLocalIso(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(iso: string) {
  return parseLocalIso(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function shortName(name: string) {
  return name.replace(/^Hospital\s+/i, "").replace(/\s+$/g, "").slice(0, 28);
}

function withAlpha(hex: string, alpha: number) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : NEUTRAL_HOSPITAL_COLOR;
  const r = parseInt(safe.slice(1, 3), 16);
  const g = parseInt(safe.slice(3, 5), 16);
  const b = parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const calendarCss = `
  .docfin-calendar-shell {
    --fc-border-color: rgba(255,255,255,0.055);
    --fc-page-bg-color: transparent;
    --fc-neutral-bg-color: rgba(255,255,255,0.025);
    --fc-today-bg-color: rgba(136,166,146,0.08);
    --fc-small-font-size: 0.72rem;
  }
  .docfin-calendar-shell .fc {
    color: #f8fafc;
    font-family: inherit;
  }
  .docfin-calendar-shell .fc-scrollgrid,
  .docfin-calendar-shell .fc-theme-standard td,
  .docfin-calendar-shell .fc-theme-standard th {
    border-color: rgba(255,255,255,0.055);
  }
  .docfin-calendar-shell .fc-scrollgrid {
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.065);
    background: rgba(2,6,12,0.32);
  }
  .docfin-calendar-shell .fc-col-header-cell {
    background: rgba(255,255,255,0.025);
    padding: 10px 0;
  }
  .docfin-calendar-shell .fc-col-header-cell-cushion {
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 10px;
    font-weight: 500;
    text-decoration: none;
  }
  .docfin-calendar-shell .fc-daygrid-day {
    background: rgba(2,6,12,0.18);
  }
  .docfin-calendar-shell .fc-daygrid-day-number {
    color: #cbd5e1;
    font-size: 11px;
    padding: 8px;
    text-decoration: none;
    font-variant-numeric: tabular-nums;
  }
  .docfin-calendar-shell .fc-day-other .fc-daygrid-day-number {
    color: #475569;
  }
  .docfin-calendar-shell .docfin-selected-day {
    box-shadow: inset 0 0 0 1px rgba(248,250,252,0.35);
    background: rgba(255,255,255,0.025);
  }
  .docfin-calendar-shell .fc-daygrid-event {
    border-radius: 9px;
    padding: 2px 4px;
    margin: 1px 6px 3px;
    border-width: 1px;
    backdrop-filter: blur(8px);
  }
  .docfin-calendar-shell .fc-event-main {
    min-width: 0;
  }
  .docfin-calendar-shell .fc-daygrid-more-link {
    color: #94a3b8;
    font-size: 10px;
    margin-left: 8px;
  }
  .docfin-event {
    min-width: 0;
    display: grid;
    gap: 1px;
  }
  .docfin-event-top {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .docfin-event-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
    font-weight: 500;
  }
  .docfin-event-amount {
    color: #a7d7b5;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }
  .docfin-status-dot,
  .status-dot-scheduled,
  .status-dot-awaiting_payment,
  .status-dot-paid,
  .status-dot-overdue {
    height: 6px;
    width: 6px;
    border-radius: 9999px;
    flex: none;
  }
  .status-scheduled,
  .status-dot-scheduled { background: #94a3b8; }
  .status-awaiting_payment,
  .status-dot-awaiting_payment { background: #d6b56d; }
  .status-paid,
  .status-dot-paid { background: #8faf9a; }
  .status-overdue,
  .status-dot-overdue { background: #c47f7a; }
  .status-pill-scheduled {
    background: rgba(148,163,184,0.12);
    color: #cbd5e1;
    border: 1px solid rgba(148,163,184,0.22);
  }
  .status-pill-awaiting_payment {
    background: rgba(214,181,109,0.12);
    color: #e8cb85;
    border: 1px solid rgba(214,181,109,0.24);
  }
  .status-pill-paid {
    background: rgba(143,175,154,0.13);
    color: #b9dec4;
    border: 1px solid rgba(143,175,154,0.26);
  }
  .status-pill-overdue {
    background: rgba(196,127,122,0.13);
    color: #efb0aa;
    border: 1px solid rgba(196,127,122,0.26);
  }
`;
