import type { PaymentStatus, Shift, Workplace } from "./store";
import { logger } from "./logger";

export type AgentTriggerPhase = "PLANTAO_FIXO" | "RASCUNHO_PARADO" | "PAGAMENTO_ATRASADO";

export interface OutboundRoutineConfig {
  enabled?: boolean;
  dayOfWeek?: number;
}

export type OutboundWorkplace = Workplace & {
  isFixedSchedule?: boolean;
  fixedDayOfWeek?: number;
  routineDayOfWeek?: number;
  routineSchedule?: OutboundRoutineConfig;
  fixedSchedule?: OutboundRoutineConfig;
};

export type OutboundShift = Shift & {
  createdAt?: string;
};

export interface AgentCheckTriggersPayload {
  shifts: OutboundShift[];
  workplaces: OutboundWorkplace[];
  now?: string;
}

export interface WhatsAppOutboundQuickReply {
  id: string;
  title: string;
  payload: Record<string, string>;
}

export interface WhatsAppOutboundNotification {
  id: string;
  phase: AgentTriggerPhase;
  shiftId?: string;
  workplaceId?: string;
  text: string;
  quickReplies: WhatsAppOutboundQuickReply[];
}

export interface WhatsAppOutboundMutation {
  type: "UPDATE_SHIFT";
  shiftId: string;
  patch: {
    agentNotified: true;
  };
}

export interface AgentCheckTriggersResult {
  ok: boolean;
  notificationsToSend: WhatsAppOutboundNotification[];
  mutations: WhatsAppOutboundMutation[];
  warnings?: string[];
}

const LIMITE_RASCUNHO_PARADO_MS = 48 * 60 * 60 * 1000;

function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function adicionarDias(data: Date, dias: number): Date {
  const copia = new Date(data);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function paraISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function parseData(valor: string | undefined): Date | undefined {
  if (!valor) return undefined;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? undefined : data;
}

function formatarData(valor: string): string {
  const data = parseData(`${valor}T12:00:00`);
  if (!data) return valor;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor || 0);
}

function nomeHospital(workplaces: OutboundWorkplace[], workplaceId: string): string {
  return workplaces.find((workplace) => workplace.id === workplaceId)?.name ?? "hospital informado";
}

function rotinaAtiva(workplace: OutboundWorkplace): boolean {
  return Boolean(
    workplace.isFixedSchedule ||
    workplace.fixedSchedule?.enabled ||
    workplace.routineSchedule?.enabled,
  );
}

function diaRotina(workplace: OutboundWorkplace): number | undefined {
  const dia = workplace.fixedDayOfWeek
    ?? workplace.routineDayOfWeek
    ?? workplace.fixedSchedule?.dayOfWeek
    ?? workplace.routineSchedule?.dayOfWeek;

  return typeof dia === "number" && dia >= 0 && dia <= 6 ? dia : undefined;
}

function existePlantaoNaData(shifts: OutboundShift[], workplaceId: string, date: string): boolean {
  return shifts.some((shift) => shift.workplaceId === workplaceId && shift.date === date);
}

function criarNotificacaoPlantaoFixo(workplace: OutboundWorkplace, ontemISO: string): WhatsAppOutboundNotification {
  return {
    id: `plantao-fixo:${workplace.id}:${ontemISO}`,
    phase: "PLANTAO_FIXO",
    workplaceId: workplace.id,
    text: `Detectei seu plantão fixo de ontem no ${workplace.name}. Posso consolidar com o valor padrão de ${formatarMoeda(workplace.hourlyRate)}?`,
    quickReplies: [
      {
        id: `plantao-fixo:${workplace.id}:sim`,
        title: "Sim, Consolidar",
        payload: {
          type: "BUTTON_CLICK",
          field: "fixedShift",
          value: "SIM_CONSOLIDAR",
          workplaceId: workplace.id,
          date: ontemISO,
        },
      },
      {
        id: `plantao-fixo:${workplace.id}:nao`,
        title: "Não, Alterar",
        payload: {
          type: "BUTTON_CLICK",
          field: "fixedShift",
          value: "NAO_ALTERAR",
          workplaceId: workplace.id,
          date: ontemISO,
        },
      },
    ],
  };
}

function criarNotificacaoRascunho(shift: OutboundShift, hospital: string): WhatsAppOutboundNotification {
  return {
    id: `rascunho-parado:${shift.id}`,
    phase: "RASCUNHO_PARADO",
    shiftId: shift.id,
    workplaceId: shift.workplaceId,
    text: `Você tem rascunhos pendentes na sua caixa de pendências. Vamos fechar o do ${hospital} de ${formatarData(shift.date)}?`,
    quickReplies: [
      {
        id: `rascunho-parado:${shift.id}:abrir`,
        title: "Sim, Abrir App",
        payload: {
          type: "BUTTON_CLICK",
          field: "draft",
          value: "ABRIR_APP",
          shiftId: shift.id,
        },
      },
      {
        id: `rascunho-parado:${shift.id}:ignorar`,
        title: "Ignorar",
        payload: {
          type: "BUTTON_CLICK",
          field: "draft",
          value: "IGNORAR",
          shiftId: shift.id,
        },
      },
    ],
  };
}

function criarNotificacaoPagamento(shift: OutboundShift, hospital: string): WhatsAppOutboundNotification {
  return {
    id: `pagamento-atrasado:${shift.id}`,
    phase: "PAGAMENTO_ATRASADO",
    shiftId: shift.id,
    workplaceId: shift.workplaceId,
    text: `O plantão do dia ${formatarData(shift.date)} no ${hospital} deveria ter sido pago. O dinheiro caiu na conta?`,
    quickReplies: [
      {
        id: `pagamento-atrasado:${shift.id}:recebido`,
        title: "Sim, Recebido",
        payload: {
          type: "BUTTON_CLICK",
          field: "status",
          value: "PAID",
          shiftId: shift.id,
        },
      },
      {
        id: `pagamento-atrasado:${shift.id}:cobrar`,
        title: "Não, Cobrar Hospital",
        payload: {
          type: "BUTTON_CLICK",
          field: "status",
          value: "COBRAR_HOSPITAL",
          shiftId: shift.id,
        },
      },
    ],
  };
}

function mutacaoNotificado(shiftId: string): WhatsAppOutboundMutation {
  return {
    type: "UPDATE_SHIFT",
    shiftId,
    patch: {
      agentNotified: true,
    },
  };
}

function statusPagamento(shift: OutboundShift): PaymentStatus {
  return shift.paymentStatus ?? "PENDING";
}

export function checkWhatsAppAgentTriggers(payload: AgentCheckTriggersPayload): AgentCheckTriggersResult {
  const agora = parseData(payload.now) ?? new Date();
  const hoje = inicioDoDia(agora);
  const ontem = adicionarDias(hoje, -1);
  const ontemISO = paraISO(ontem);
  const notificacoes: WhatsAppOutboundNotification[] = [];
  const mutacoes: WhatsAppOutboundMutation[] = [];
  const avisos: string[] = [];

  payload.workplaces.forEach((workplace) => {
    const dia = diaRotina(workplace);
    if (!rotinaAtiva(workplace) || dia === undefined) return;
    if (ontem.getDay() !== dia) return;
    if (existePlantaoNaData(payload.shifts, workplace.id, ontemISO)) return;
    notificacoes.push(criarNotificacaoPlantaoFixo(workplace, ontemISO));
  });

  payload.shifts.forEach((shift) => {
    if (shift.agentNotified) return;

    const hospital = nomeHospital(payload.workplaces, shift.workplaceId);

    if (shift.recordStatus === "draft") {
      const criadoEm = parseData(shift.createdAt) ?? parseData(`${shift.date}T12:00:00`);
      if (!criadoEm) {
        avisos.push(`Não foi possível avaliar a idade do rascunho ${shift.id}.`);
        return;
      }

      if (agora.getTime() - criadoEm.getTime() > LIMITE_RASCUNHO_PARADO_MS) {
        notificacoes.push(criarNotificacaoRascunho(shift, hospital));
        mutacoes.push(mutacaoNotificado(shift.id));
      }

      return;
    }

    const dataPagamento = parseData(`${shift.expectedPaymentDate ?? shift.projectedPaymentDate ?? ""}T12:00:00`);
    if (!dataPagamento) return;

    const pagamentoVenceu = hoje.getTime() >= inicioDoDia(dataPagamento).getTime();
    if (statusPagamento(shift) === "PENDING" && pagamentoVenceu) {
      notificacoes.push(criarNotificacaoPagamento(shift, hospital));
      mutacoes.push(mutacaoNotificado(shift.id));
    }
  });

  logger.info(`Motor WhatsApp: ${notificacoes.length} notificações e ${mutacoes.length} mutações preparadas.`);

  return {
    ok: true,
    notificationsToSend: notificacoes,
    mutations: mutacoes,
    warnings: avisos.length ? avisos : undefined,
  };
}
