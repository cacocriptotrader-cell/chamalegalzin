import { defineEventHandler, readBody, setResponseStatus } from "h3";
import {
  checkWhatsAppAgentTriggers,
  type AgentCheckTriggersPayload,
} from "../../src/lib/whatsappOutboundEngine";

function payloadValido(payload: unknown): payload is AgentCheckTriggersPayload {
  if (!payload || typeof payload !== "object") return false;
  const candidato = payload as Partial<AgentCheckTriggersPayload>;
  return Array.isArray(candidato.shifts) && Array.isArray(candidato.workplaces);
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    if (!payloadValido(body)) {
      setResponseStatus(event, 400);
      return {
        ok: false,
        error: "Payload inválido. Envie arrays shifts e workplaces.",
        notificationsToSend: [],
        mutations: [],
      };
    }

    const resultado = checkWhatsAppAgentTriggers(body);
    return resultado;
  } catch {
    setResponseStatus(event, 500);
    return {
      ok: false,
      error: "Erro interno ao verificar gatilhos do agente WhatsApp.",
      notificationsToSend: [],
      mutations: [],
    };
  }
});
