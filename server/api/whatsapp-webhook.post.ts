import { defineEventHandler, readBody, setResponseStatus } from "h3";
import {
  processWhatsAppWebhookPayload,
  type WhatsAppWebhookPayload,
} from "../../src/lib/whatsappWebhookProcessor";

function payloadValido(payload: unknown): payload is WhatsAppWebhookPayload {
  if (!payload || typeof payload !== "object") return false;
  const tipo = (payload as { type?: unknown }).type;
  return tipo === "AI_EXTRACTED_SHIFT" || tipo === "BUTTON_CLICK";
}

export default defineEventHandler(async (event) => {
  console.log("Webhook WhatsApp: requisição recebida.");

  try {
    const body = await readBody(event);

    if (!payloadValido(body)) {
      console.log("Webhook WhatsApp: payload inválido ou tipo ausente.");
      setResponseStatus(event, 400);
      return {
        ok: false,
        error: "Payload inválido. Envie type AI_EXTRACTED_SHIFT ou BUTTON_CLICK.",
        replyTemplate: {
          kind: "ERROR",
          text: "Não consegui processar esta mensagem. O payload recebido está incompleto.",
        },
      };
    }

    const resultado = processWhatsAppWebhookPayload(body);

    if (!resultado.ok) {
      setResponseStatus(event, 422);
      console.log("Webhook WhatsApp: payload processado com alerta de negócio.");
      return resultado;
    }

    console.log("Webhook WhatsApp: payload processado com sucesso.");
    return resultado;
  } catch (erro) {
    console.log("Webhook WhatsApp: falha inesperada ao processar requisição.", erro);
    setResponseStatus(event, 500);
    return {
      ok: false,
      error: "Erro interno ao processar o webhook do WhatsApp.",
      replyTemplate: {
        kind: "ERROR",
        text: "Tive uma falha interna ao processar sua mensagem. Tente novamente em alguns instantes.",
      },
    };
  }
});
