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
  console.log("Agente WhatsApp: verificação de gatilhos recebida.");

  try {
    const body = await readBody(event);

    if (!payloadValido(body)) {
      console.log("Agente WhatsApp: payload inválido para verificação de gatilhos.");
      setResponseStatus(event, 400);
      return {
        ok: false,
        error: "Payload inválido. Envie arrays shifts e workplaces.",
        notificationsToSend: [],
        mutations: [],
      };
    }

    const resultado = checkWhatsAppAgentTriggers(body);
    console.log("Agente WhatsApp: verificação de gatilhos concluída.");
    return resultado;
  } catch (erro) {
    console.log("Agente WhatsApp: falha inesperada na verificação de gatilhos.", erro);
    setResponseStatus(event, 500);
    return {
      ok: false,
      error: "Erro interno ao verificar gatilhos do agente WhatsApp.",
      notificationsToSend: [],
      mutations: [],
    };
  }
});
