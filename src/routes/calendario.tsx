import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  brl,
  brl2,
  calculateExpectedPaymentDate,
  computeShift,
  fmtISO,
  getRecordPaymentStatus,
  isConsolidatedRecord,
  type PaymentStatus,
  useStore,
} from "@/lib/store";
import { Section } from "@/components/Section";
import { PaymentStatusBadge, PAYMENT_STATUS_LABELS } from "@/components/PaymentStatusBadge";
import { QuickCaptureModal, type QuickCapturePrefill } from "@/components/QuickCaptureModal";
import { AlertCircle, ArrowDownCircle, CalendarDays, ChevronLeft, ChevronRight, Repeat, Scissors, Stethoscope } from "lucide-react";

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
type FinancialStatus = PaymentStatus | "SCHEDULED" | "DRAFT";
type CalendarFilter = "ALL" | "DRAFTS" | "RECEIVABLES";
type MobileCalendarView = "WEEK" | "MONTH";

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
  isDraft: boolean;
  isResolvedPast: boolean;
  isActionable: boolean;
  isReceivable: boolean;
  repeatPrefill?: QuickCapturePrefill;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const NEUTRAL_EVENT_COLOR = "#64748b";
const DRAFT_EVENT_COLOR = "#2563eb";

const FILTERS: Array<{ id: CalendarFilter; label: string }> = [
  { id: "ALL", label: "Todos" },
  { id: "DRAFTS", label: "Pendências / Rascunhos" },
  { id: "RECEIVABLES", label: "A Receber" },
];

function CalendarioFinanceiro() {
  const store = useStore();
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const [currentMonth, setCurrentMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => fmtISO(today));
  const [activeFilter, setActiveFilter] = useState<CalendarFilter>("ALL");
  const [mobileView, setMobileView] = useState<MobileCalendarView>("WEEK");
  const [repeatPrefill, setRepeatPrefill] = useState<QuickCapturePrefill | null>(null);

  const calendarEvents = useMemo(() => {
    const events: DayEvent[] = [];
    const todayIso = fmtISO(today);

    for (const shift of store.shifts) {
      const wp = store.workplaces.find((w) => w.id === shift.workplaceId);
      const color = workplaceColor(wp);
      const isDraft = shift.recordStatus === "draft";
      if (isDraft) {
        events.push({
          id: `draft-shift-${shift.id}`,
          type: "SHIFT",
          date: shift.date,
          label: wp?.name ?? "Pendência",
          amount: shift.gross,
          sub: `${shift.hours}h · aguardando consolidação`,
          hours: shift.hours,
          color: DRAFT_EVENT_COLOR,
          status: "DRAFT",
          statusLabel: "Rascunho",
          isDraft: true,
          isResolvedPast: false,
          isActionable: true,
          isReceivable: false,
        });
        continue;
      }

      if (!isConsolidatedRecord(shift)) continue;

      const math = computeShift(store, shift);
      const paymentIso = shift.expectedPaymentDate
        ?? (wp ? fmtISO(calculateExpectedPaymentDate(shift.date, wp)) : shift.date);
      const paymentStatus = displayPaymentStatus(shift, paymentIso, todayIso);
      const shiftPast = shift.date < todayIso;

      events.push({
        id: `shift-${shift.id}`,
        type: "SHIFT",
        date: shift.date,
        label: wp?.name ?? "Plantão",
        amount: math.net,
        sub: `${shift.hours}h · líquido projetado`,
        hours: shift.hours,
        color,
        status: paymentStatus,
        statusLabel: paymentStatusLabel(paymentStatus),
        isDraft: false,
        isResolvedPast: shiftPast && paymentStatus === "PAID",
        isActionable: shift.date >= todayIso,
        isReceivable: false,
        repeatPrefill: {
          workplaceId: shift.workplaceId,
          hours: shift.hours,
          procedure: shift.procedure,
          transportMode: shift.transportMode,
          privateTransportCost: shift.privateTransportCost,
          extraCost: shift.extraCost,
        },
      });

      events.push({
        id: `payment-shift-${shift.id}`,
        type: "PAYMENT",
        date: paymentIso,
        label: wp?.name ?? "Recebimento",
        amount: math.net,
        sub: `Recebimento do plantão de ${formatShortDate(shift.date)}`,
        color,
        status: paymentStatus,
        statusLabel: paymentStatusLabel(paymentStatus),
        isDraft: false,
        isResolvedPast: paymentStatus === "PAID" || paymentStatus === "DEFAULTED",
        isActionable: paymentStatus === "PENDING" || paymentStatus === "OVERDUE",
        isReceivable: paymentStatus === "PENDING" || paymentStatus === "OVERDUE",
      });
    }

    for (const surgery of store.surgeries.filter(isConsolidatedRecord)) {
      if (surgery.myRole === "TITULAR") {
        const wp = store.workplaces.find((w) => w.id === surgery.hospitalId);
        const color = workplaceColor(wp);
        const paymentIso = wp ? fmtISO(calculateExpectedPaymentDate(surgery.date, wp)) : surgery.date;
        const paymentStatus = displayPaymentStatus(surgery, paymentIso, todayIso);

        events.push({
          id: `surgery-${surgery.id}`,
          type: "SURGERY",
          date: surgery.date,
          label: wp?.name ?? "Cirurgia",
          amount: surgery.totalGross,
          sub: surgery.procedure || "Procedimento",
          color,
          status: paymentStatus,
          statusLabel: paymentStatusLabel(paymentStatus),
          isDraft: false,
          isResolvedPast: paymentStatus === "PAID" && surgery.date < todayIso,
          isActionable: paymentStatus === "PENDING" || paymentStatus === "OVERDUE",
          isReceivable: false,
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
          statusLabel: paymentStatusLabel(paymentStatus),
          isDraft: false,
          isResolvedPast: paymentStatus === "PAID" || paymentStatus === "DEFAULTED",
          isActionable: paymentStatus === "PENDING" || paymentStatus === "OVERDUE",
          isReceivable: paymentStatus === "PENDING" || paymentStatus === "OVERDUE",
        });
      } else {
        const status = displayPaymentStatus(surgery, surgery.date, todayIso);
        events.push({
          id: `surgery-member-${surgery.id}`,
          type: "SURGERY",
          date: surgery.date,
          label: surgery.payingSurgeonName || "Cirurgia (membro)",
          amount: surgery.myExpectedShare,
          sub: surgery.procedure || "Procedimento",
          color: NEUTRAL_EVENT_COLOR,
          status,
          statusLabel: paymentStatusLabel(status),
          isDraft: false,
          isResolvedPast: status === "PAID" && surgery.date < todayIso,
          isActionable: status === "PENDING" || status === "OVERDUE",
          isReceivable: status === "PENDING" || status === "OVERDUE",
        });
      }
    }

    return events;
  }, [store, today]);

  const filteredEvents = useMemo(
    () => calendarEvents.filter((event) => eventMatchesFilter(event, activeFilter)),
    [calendarEvents, activeFilter],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    for (const event of filteredEvents) {
      const bucket = map.get(event.date) ?? [];
      bucket.push(event);
      map.set(event.date, bucket);
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => eventPriority(a) - eventPriority(b) || b.amount - a.amount);
    }
    return map;
  }, [filteredEvents]);

  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const monthRange = useMemo(() => ({
    start: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    end: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
  }), [currentMonth]);

  const monthMetricEvents = useMemo(
    () => getMetricEventsForFilter(filteredEvents, activeFilter, monthRange.start, monthRange.end),
    [activeFilter, filteredEvents, monthRange],
  );
  const mobileWeekEvents = useMemo(() => getNextSevenDaysEvents(filteredEvents, today), [filteredEvents, today]);
  const weekFocus = useMemo(
    () => getWeekFocus(calendarEvents, today),
    [calendarEvents, today],
  );
  const totalProjected = monthMetricEvents.reduce((sum, event) => sum + event.amount, 0);
  const totalHours = monthMetricEvents.reduce((sum, event) => sum + (event.hours ?? 0), 0);
  const metricLabels = metricLabelsForFilter(activeFilter);
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
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Mês em visão</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => moveMonth(-1)}
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white inline-flex items-center justify-center text-slate-600 transition hover:bg-slate-100"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h3 className="font-display text-2xl capitalize min-w-[180px] text-slate-900">{monthTitle(currentMonth)}</h3>
                <button
                  type="button"
                  onClick={() => moveMonth(1)}
                  className="h-8 w-8 rounded-lg border border-slate-200 bg-white inline-flex items-center justify-center text-slate-600 transition hover:bg-slate-100"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Hoje
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{metricLabels.total}</p>
                <p className="font-display text-2xl text-teal-600 mt-0.5">{brl(totalProjected)}</p>
              </div>
              <div className="min-w-[130px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{metricLabels.hours}</p>
                <p className="font-display text-2xl text-slate-900 mt-0.5">{totalHours.toFixed(0)}h</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                  activeFilter === filter.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-slate-900"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Foco da semana</p>
                <h4 className="font-display text-lg mt-1 text-slate-900">Ações financeiras dos próximos 7 dias</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <FocusMetric label="Pendências" value={String(weekFocus.drafts)} tone={weekFocus.drafts > 0 ? "warning" : "neutral"} />
                <FocusMetric label="A receber" value={String(weekFocus.receivables)} tone={weekFocus.receivables > 0 ? "success" : "neutral"} />
                <FocusMetric label="Fluxo" value={brl2(weekFocus.amount)} tone="success" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 md:hidden">
            <button
              type="button"
              onClick={() => setMobileView("WEEK")}
              className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition ${
                mobileView === "WEEK" ? "bg-slate-900 text-white border border-slate-900" : "text-slate-600"
              }`}
            >
              Próximos 7 dias
            </button>
            <button
              type="button"
              onClick={() => setMobileView("MONTH")}
              className={`min-h-11 rounded-lg px-3 text-xs font-semibold transition ${
                mobileView === "MONTH" ? "bg-slate-900 text-white border border-slate-900" : "text-slate-600"
              }`}
            >
              Grade mensal
            </button>
          </div>

          <div className={`${mobileView === "WEEK" ? "block" : "hidden"} md:hidden`}>
            <MobileNextSevenDaysTimeline events={mobileWeekEvents} activeFilter={activeFilter} onRepeat={setRepeatPrefill} />
          </div>

          <div className={`${mobileView === "MONTH" ? "block" : "hidden"} overflow-hidden rounded-xl border border-slate-200 bg-white md:block`}>
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAYS.map((day) => (
                <div key={day} className="px-2 py-2 text-center text-[10px] uppercase tracking-wider text-slate-500">
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
                const isCurrentWeek = isDateInCurrentWeek(day.date, today);

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    className={`min-h-[112px] border-r border-b border-slate-200 p-2 text-left align-top transition hover:bg-sky-50/60 ${
                      day.inMonth ? "bg-white" : "bg-slate-50 opacity-60"
                    } ${isCurrentWeek ? "bg-sky-50/45" : ""} ${isSelected ? "ring-1 ring-inset ring-sky-500 bg-sky-50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs tabular-nums ${isToday ? "text-sky-700 font-semibold" : "text-slate-500"}`}>
                        {day.date.getDate()}
                      </span>
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] text-slate-400">+{dayEvents.length - 3}</span>
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

          <div className="flex flex-wrap items-center gap-4 px-1 text-[11px] text-slate-500">
            <LegendDot className="bg-sky-600" label="Rascunho" />
            <LegendDot className="bg-amber-500" label="A receber" />
            <LegendDot className="bg-rose-500" label="Atrasado" />
            <LegendDot className="bg-slate-400" label="Previsto" />
            <LegendDot className="bg-teal-500" label="Recebido" />
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
            ? activeFilter === "DRAFTS"
              ? "Sem pendências neste dia"
              : activeFilter === "RECEIVABLES"
                ? "Sem recebíveis acionáveis neste dia"
                : "Sem eventos neste dia"
            : selectedPaymentTotal > 0
              ? `Recebimento total esperado: ${brl(selectedPaymentTotal)}`
              : `${selectedEvents.length} evento(s)`
        }
      >
        <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selectedEvents.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500 inline-flex items-center justify-center gap-2 w-full">
              <CalendarDays className="h-4 w-4" /> {emptyStateForFilter(activeFilter)}
            </div>
          )}
          {selectedEvents.map((event) => (
            <SelectedEventRow key={event.id} event={event} onRepeat={setRepeatPrefill} />
          ))}
        </div>
      </Section>
      <QuickCaptureModal
        open={Boolean(repeatPrefill)}
        onOpenChange={(open) => {
          if (!open) setRepeatPrefill(null);
        }}
        prefill={repeatPrefill}
      />
    </>
  );
}

function MiniEvent({ event }: { event: DayEvent }) {
  return (
    <div
      className={`min-w-0 rounded-md border px-1.5 py-1 transition-opacity ${
        event.isResolvedPast
          ? "border-slate-200 bg-slate-50 opacity-50"
          : event.isActionable
            ? "border-sky-200 bg-sky-50"
            : "border-slate-200 bg-white"
      }`}
      style={{
        boxShadow: `inset 3px 0 0 ${event.color}`,
      }}
    >
      <div className="flex items-center gap-1 min-w-0">
        <StatusPin status={event.status} />
        <span className="truncate text-[10px] leading-tight text-slate-800">{event.label}</span>
      </div>
      <p className="mt-0.5 truncate text-[9px] leading-tight text-slate-500 tabular-nums">
        {brl2(event.amount)}
      </p>
    </div>
  );
}

function SelectedEventRow({ event, onRepeat }: { event: DayEvent; onRepeat: (prefill: QuickCapturePrefill) => void }) {
  const Icon = event.isDraft ? AlertCircle : event.type === "PAYMENT" ? ArrowDownCircle : event.type === "SURGERY" ? Scissors : Stethoscope;
  return (
    <div className={`p-4 flex items-start justify-between gap-3 transition-opacity ${event.isResolvedPast ? "opacity-55" : ""}`}>
      <div className="flex items-start gap-3 min-w-0">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
          style={{ boxShadow: `inset 4px 0 0 ${event.color}` }}
        >
          <Icon className="h-4 w-4 text-slate-700" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <StatusPin status={event.status} />
            <p className="text-sm font-medium truncate text-slate-900">{event.label}</p>
            {isPaymentStatus(event.status) && <PaymentStatusBadge status={event.status} />}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {event.statusLabel}
            {event.sub ? ` · ${event.sub}` : ""}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <p className={`font-mono text-sm tabular-nums ${event.type === "PAYMENT" ? "text-teal-600" : "text-slate-500"}`}>
          {brl2(event.amount)}
        </p>
        {event.repeatPrefill && (
          <button
            type="button"
            onClick={() => onRepeat(event.repeatPrefill!)}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-slate-900 sm:min-h-0 sm:px-2 sm:py-1 sm:text-[10px]"
          >
            <Repeat className="h-3 w-3" />
            Repetir plantão
          </button>
        )}
      </div>
    </div>
  );
}

function MobileNextSevenDaysTimeline({
  events,
  activeFilter,
  onRepeat,
}: {
  events: DayEvent[];
  activeFilter: CalendarFilter;
  onRepeat: (prefill: QuickCapturePrefill) => void;
}) {
  const grouped = groupEventsByDate(events);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
        <p className="text-sm font-semibold text-slate-900">Nada urgente nos próximos 7 dias</p>
        <p className="mt-1 text-xs text-slate-500">{emptyStateForFilter(activeFilter)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Timeline móvel</p>
        <h4 className="font-display text-lg mt-1 text-slate-900">Próximos 7 dias</h4>
      </div>
      <div className="space-y-3">
        {grouped.map(({ date, events: dayEvents }) => (
          <div key={date} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-[11px] font-semibold capitalize text-slate-500">{formatSelectedDate(date)}</p>
            <div className="divide-y divide-slate-200">
              {dayEvents.map((event) => (
                <SelectedEventRow key={event.id} event={event} onRepeat={onRepeat} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPin({ status }: { status: FinancialStatus }) {
  const className = status === "DRAFT"
    ? "bg-sky-600"
    : status === "PAID"
    ? "bg-teal-500"
    : status === "PENDING"
      ? "bg-amber-500"
      : status === "OVERDUE"
        ? "bg-rose-500"
        : status === "DEFAULTED"
          ? "bg-slate-400"
      : "bg-slate-400";
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

function FocusMetric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-teal-600" : tone === "warning" ? "text-amber-600" : "text-slate-900";
  return (
    <div className="min-w-[86px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-right">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`font-mono text-sm font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function workplaceColor(workplace: unknown) {
  const color = typeof (workplace as any)?.color === "string" ? (workplace as any).color.trim() : "";
  return color || NEUTRAL_EVENT_COLOR;
}

function eventPriority(event: DayEvent) {
  if (event.isDraft) return 0;
  if (event.isReceivable && event.status === "OVERDUE") return 1;
  if (event.isReceivable && event.status === "PENDING") return 2;
  if (event.isReceivable) return 2;
  if (event.isActionable) return 3;
  if (event.isResolvedPast) return 9;
  if (event.type === "SHIFT") return 1;
  if (event.type === "SURGERY") return 2;
  return 3;
}

function eventMatchesFilter(event: DayEvent, filter: CalendarFilter) {
  if (filter === "DRAFTS") return event.isDraft;
  if (filter === "RECEIVABLES") return event.isReceivable && event.status !== "PAID" && event.status !== "DEFAULTED" && !event.isResolvedPast;
  return true;
}

function getMetricEventsForFilter(events: DayEvent[], filter: CalendarFilter, start: Date, end: Date) {
  return events.filter((event) => {
    if (!isIsoInRange(event.date, start, end)) return false;
    if (filter === "DRAFTS") return event.isDraft;
    if (filter === "RECEIVABLES") return event.isReceivable && event.status !== "PAID" && event.status !== "DEFAULTED" && !event.isResolvedPast;
    return event.type !== "PAYMENT" && !event.isDraft;
  });
}

function metricLabelsForFilter(filter: CalendarFilter) {
  if (filter === "DRAFTS") return { total: "Valor em Rascunho", hours: "Horas Pendentes" };
  if (filter === "RECEIVABLES") return { total: "Total a Receber", hours: "Horas Vinculadas" };
  return { total: "Total Projetado", hours: "Horas Totais" };
}

function getNextSevenDaysEvents(events: DayEvent[], today: Date) {
  const start = startOfLocalDay(today);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return events
    .filter((event) => isIsoInRange(event.date, start, end))
    .sort((a, b) => a.date.localeCompare(b.date) || eventPriority(a) - eventPriority(b) || b.amount - a.amount);
}

function groupEventsByDate(events: DayEvent[]) {
  const map = new Map<string, DayEvent[]>();
  events.forEach((event) => {
    const bucket = map.get(event.date) ?? [];
    bucket.push(event);
    map.set(event.date, bucket);
  });
  return Array.from(map.entries()).map(([date, dayEvents]) => ({ date, events: dayEvents }));
}

function getWeekFocus(events: DayEvent[], today: Date) {
  const start = startOfLocalDay(today);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const inFocus = events.filter((event) => isIsoInRange(event.date, start, end));
  const drafts = inFocus.filter((event) => event.isDraft).length;
  const receivableEvents = inFocus.filter((event) => event.isReceivable && event.status !== "PAID" && event.status !== "DEFAULTED" && !event.isResolvedPast);
  const amount = receivableEvents.reduce((sum, event) => sum + event.amount, 0);
  return { drafts, receivables: receivableEvents.length, amount };
}

function displayPaymentStatus(
  record: { recordStatus?: "draft" | "consolidated"; paymentStatus?: PaymentStatus },
  expectedPaymentIso: string,
  todayIso: string,
): PaymentStatus {
  const status = getRecordPaymentStatus(record);
  if (status === "PENDING" && expectedPaymentIso < todayIso) return "OVERDUE";
  return status;
}

function paymentStatusLabel(status: FinancialStatus) {
  if (isPaymentStatus(status)) return PAYMENT_STATUS_LABELS[status];
  return status === "DRAFT" ? "Rascunho" : "Previsto";
}

function isPaymentStatus(status: FinancialStatus): status is PaymentStatus {
  return status === "PENDING" || status === "PAID" || status === "OVERDUE" || status === "DEFAULTED";
}

function isDateInCurrentWeek(date: Date, today: Date) {
  const current = startOfLocalDay(today);
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() - current.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const value = startOfLocalDay(date).getTime();
  return value >= weekStart.getTime() && value < weekEnd.getTime();
}

function emptyStateForFilter(filter: CalendarFilter) {
  if (filter === "DRAFTS") return "Nenhuma pendência de triagem neste dia.";
  if (filter === "RECEIVABLES") return "Nenhum recebível acionável neste dia.";
  return "Nenhum plantão, cirurgia ou recebimento neste dia.";
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
