import type { PaymentStatus, ShiftTransportMode, TaxRegime } from "./store";
import { logger } from "./logger";

export type WhatsAppActionType = "AI_EXTRACTED_SHIFT" | "BUTTON_CLICK";

export interface WhatsAppKnownWorkplace {
  id: string;
  name: string;
  hourlyRate?: number;
}

export interface WhatsAppExtractedShiftData {
  workplaceId?: string;
  hospital?: string;
  value?: number;
  gross?: number;
  date?: string;
  hours?: number;
  durationHours?: number;
  procedure?: string;
  transportMode?: ShiftTransportMode;
  privateTransportCost?: number;
  taxRegimeOverride?: TaxRegime;
}

export interface WhatsAppAiExtractedShiftPayload {
  type: "AI_EXTRACTED_SHIFT";
  requestId?: string;
  phone?: string;
  extracted: WhatsAppExtractedShiftData;
  knownWorkplaces?: WhatsAppKnownWorkplace[];
  recentHospitals?: WhatsAppKnownWorkplace[];
}

export interface WhatsAppButtonClickPayload {
  type: "BUTTON_CLICK";
  requestId?: string;
  phone?: string;
  shiftId: string;
  field: "status" | "hospital";
  value: string;
  knownWorkplaces?: WhatsAppKnownWorkplace[];
}

export type WhatsAppWebhookPayload = WhatsAppAiExtractedShiftPayload | WhatsAppButtonClickPayload;

export interface WhatsAppMutationAddShiftDraft {
  type: "ADD_SHIFT_DRAFT";
  payload: {
    date: string;
    workplaceId: string;
    originId: "home";
    hours: number;
    gross: number;
    procedure?: string;
    extraCost: 0;
    recordStatus: "draft";
    agentNotified: false;
    paymentStatus: "PENDING";
    transportMode?: ShiftTransportMode;
    privateTransportCost?: number;
    taxRegimeOverride?: TaxRegime;
  };
}

export interface WhatsAppMutationUpdateShift {
  type: "UPDATE_SHIFT";
  shiftId: string;
  patch: {
    workplaceId?: string;
    paymentStatus?: PaymentStatus;
    actualPaymentDate?: string;
  };
}

export type WhatsAppStoreMutation = WhatsAppMutationAddShiftDraft | WhatsAppMutationUpdateShift;

export interface WhatsAppQuickReply {
  id: string;
  title: string;
  payload: Record<string, string>;
}

export interface WhatsAppReplyTemplate {
  kind: "SUCCESS" | "CHOOSE_HOSPITAL" | "ASK_CUSTOM_HOSPITAL" | "CONFIRM_PAYMENT" | "ERROR";
  text: string;
  quickReplies?: WhatsAppQuickReply[];
}

export interface WhatsAppWebhookResult {
  ok: boolean;
  action: WhatsAppActionType;
  mutations: WhatsAppStoreMutation[];
  replyTemplate: WhatsAppReplyTemplate;
  warnings?: string[];
}

const LIMITE_BOTOES_HOSPITAIS = 3;

function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function numeroSeguro(valor: unknown, padrao: number): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : padrao;
}

function hospitaisParaBotoes(hospitais: WhatsAppKnownWorkplace[] = []): WhatsAppQuickReply[] {
  const unicos = new Map<string, WhatsAppKnownWorkplace>();
  hospitais.forEach((hospital) => {
    if (hospital.id && hospital.name && !unicos.has(hospital.id)) unicos.set(hospital.id, hospital);
  });

  const botoes = Array.from(unicos.values()).slice(0, LIMITE_BOTOES_HOSPITAIS).map((hospital) => ({
    id: `hospital:${hospital.id}`,
    title: hospital.name,
    payload: {
      type: "BUTTON_CLICK",
      field: "hospital",
      value: hospital.name,
      workplaceId: hospital.id,
    },
  }));

  return [
    ...botoes,
    {
      id: "hospital:outro",
      title: "Outro",
      payload: {
        type: "BUTTON_CLICK",
        field: "hospital",
        value: "OUTRO",
      },
    },
  ];
}

function resolverHospital(
  dados: WhatsAppExtractedShiftData,
  hospitais: WhatsAppKnownWorkplace[] = [],
): WhatsAppKnownWorkplace | undefined {
  if (dados.workplaceId) {
    const porId = hospitais.find((hospital) => hospital.id === dados.workplaceId);
    if (porId) return porId;
  }

  if (!dados.hospital) return undefined;

  const alvo = normalizarTexto(dados.hospital);
  return hospitais.find((hospital) => {
    const candidato = normalizarTexto(hospital.name);
    return candidato === alvo || candidato.includes(alvo) || alvo.includes(candidato);
  });
}

function respostaEscolherHospital(hospitais: WhatsAppKnownWorkplace[] = []): WhatsAppReplyTemplate {
  return {
    kind: "CHOOSE_HOSPITAL",
    text: "Não consegui confirmar o hospital desse plantão. Toque em uma opção abaixo ou escolha Outro para informar manualmente.",
    quickReplies: hospitaisParaBotoes(hospitais),
  };
}

function processarPlantaoExtraido(payload: WhatsAppAiExtractedShiftPayload): WhatsAppWebhookResult {
  const hospitais = payload.knownWorkplaces ?? payload.recentHospitals ?? [];
  const hospital = resolverHospital(payload.extracted, hospitais);

  if (!hospital) {
    logger.info("Webhook WhatsApp: hospital não resolvido para plantão extraído.");
    return {
      ok: true,
      action: payload.type,
      mutations: [],
      replyTemplate: respostaEscolherHospital(hospitais),
      warnings: ["Hospital não encontrado nos cadastros enviados."],
    };
  }

  const horas = numeroSeguro(payload.extracted.hours ?? payload.extracted.durationHours, 1);
  const brutoExtraido = payload.extracted.gross ?? payload.extracted.value;
  const bruto = numeroSeguro(brutoExtraido, numeroSeguro(hospital.hourlyRate, 0) * horas);

  return {
    ok: true,
    action: payload.type,
    mutations: [
      {
        type: "ADD_SHIFT_DRAFT",
        payload: {
          date: payload.extracted.date || hojeISO(),
          workplaceId: hospital.id,
          originId: "home",
          hours: horas,
          gross: bruto,
          procedure: payload.extracted.procedure,
          extraCost: 0,
          recordStatus: "draft",
          agentNotified: false,
          paymentStatus: "PENDING",
          transportMode: payload.extracted.transportMode,
          privateTransportCost: payload.extracted.privateTransportCost,
          taxRegimeOverride: payload.extracted.taxRegimeOverride,
        },
      },
    ],
    replyTemplate: {
      kind: "SUCCESS",
      text: `Rascunho criado para ${hospital.name}. Ele ficará na caixa de pendências para conferência antes de entrar nos cálculos financeiros.`,
    },
  };
}

function processarCliqueBotao(payload: WhatsAppButtonClickPayload): WhatsAppWebhookResult {
  const valor = payload.value.trim();
  const valorNormalizado = normalizarTexto(valor);

  if (valorNormalizado === "paid" || valorNormalizado === "pago") {
    logger.info("Webhook WhatsApp: confirmação de pagamento recebida.");
    return {
      ok: true,
      action: payload.type,
      mutations: [
        {
          type: "UPDATE_SHIFT",
          shiftId: payload.shiftId,
          patch: {
            paymentStatus: "PAID",
            actualPaymentDate: hojeISO(),
          },
        },
      ],
      replyTemplate: {
        kind: "CONFIRM_PAYMENT",
        text: "Pagamento marcado como recebido. A data de conciliação foi registrada automaticamente.",
      },
    };
  }

  if (valorNormalizado === "outro") {
    logger.info("Webhook WhatsApp: usuário solicitou informar hospital manualmente.");
    return {
      ok: true,
      action: payload.type,
      mutations: [],
      replyTemplate: {
        kind: "ASK_CUSTOM_HOSPITAL",
        text: "Perfeito. Digite ou envie por áudio o nome do hospital para eu completar o rascunho.",
      },
    };
  }

  if (payload.field === "hospital") {
    const hospital = (payload.knownWorkplaces ?? []).find((item) => normalizarTexto(item.name) === valorNormalizado);

    if (!hospital) {
      logger.info("Webhook WhatsApp: botão de hospital não encontrado nos cadastros enviados.");
      return {
        ok: true,
        action: payload.type,
        mutations: [],
        replyTemplate: respostaEscolherHospital(payload.knownWorkplaces ?? []),
        warnings: ["Hospital do botão não encontrado nos cadastros enviados."],
      };
    }

    return {
      ok: true,
      action: payload.type,
      mutations: [
        {
          type: "UPDATE_SHIFT",
          shiftId: payload.shiftId,
          patch: {
            workplaceId: hospital.id,
          },
        },
      ],
      replyTemplate: {
        kind: "SUCCESS",
        text: `Hospital atualizado para ${hospital.name}. O rascunho continua na caixa de pendências para conferência final.`,
      },
    };
  }

  logger.info("Webhook WhatsApp: clique de botão sem regra aplicável.");
  return {
    ok: false,
    action: payload.type,
    mutations: [],
    replyTemplate: {
      kind: "ERROR",
      text: "Não consegui interpretar esse botão. Tente novamente ou envie uma mensagem com mais detalhes.",
    },
    warnings: ["Campo do botão não suportado para o valor recebido."],
  };
}

export function processWhatsAppWebhookPayload(payload: WhatsAppWebhookPayload): WhatsAppWebhookResult {
  if (payload.type === "AI_EXTRACTED_SHIFT") return processarPlantaoExtraido(payload);
  if (payload.type === "BUTTON_CLICK") return processarCliqueBotao(payload);

  logger.info("Webhook WhatsApp: tipo de payload não suportado.");
  return {
    ok: false,
    action: (payload as { type?: WhatsAppActionType }).type ?? "BUTTON_CLICK",
    mutations: [],
    replyTemplate: {
      kind: "ERROR",
      text: "Não consegui processar esta ação do WhatsApp. O tipo de payload não é suportado.",
    },
    warnings: ["Tipo de payload não suportado."],
  };
}
