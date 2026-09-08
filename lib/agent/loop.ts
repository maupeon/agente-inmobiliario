import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlock,
  MessageParam,
  TextBlock,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { AnthropicError, handleError } from "@/lib/errors";
import type { StreamEvent, UserProfile } from "@/types";
import { buildSystemPrompt } from "./system-prompt";
import { runTool, TOOL_DEFINITIONS } from "./tools";

// Modelo solicitado por el usuario en el brief del proyecto.
// Si el SDK aún no lo conoce a runtime, basta con cambiar ANTHROPIC_MODEL.
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-6";
const MAX_TOOL_TURNS = 3;
const MAX_TOOL_CALLS = 4;

interface PartialToolUse {
  id: string;
  name: string;
  jsonBuffer: string;
}

/**
 * Ejecuta una conversación con Claude usando tool-use multi-turn y streaming.
 *
 * `messages` viene del cliente como historial user/assistant en texto plano.
 * El loop interno mantiene el formato richer de Anthropic (con bloques
 * tool_use y tool_result) durante los rebotes con el modelo dentro de la
 * misma petición.
 */
export async function executeAgentLoop(
  messages: MessageParam[],
  onEvent: (e: StreamEvent) => void,
  profile?: UserProfile | null,
  signal?: AbortSignal
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    onEvent({
      type: "error",
      message:
        "Falta ANTHROPIC_API_KEY en el entorno. Añádela en `.env.local` o en Vercel.",
    });
    return;
  }

  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 45_000 });
  const system = buildSystemPrompt(profile);
  const conversation: MessageParam[] = [...messages];

  let toolCount = 0;
  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    if (signal?.aborted) return;
    const collected: ContentBlock[] = [];
    const partialTools: Map<number, PartialToolUse> = new Map();
    let stopReason: string | null = null;

    let stream;
    try {
      stream = client.messages.stream({
        model: MODEL,
        max_tokens: 1600,
        system,
        tools: TOOL_DEFINITIONS as unknown as Anthropic.Tool[],
        messages: conversation,
      }, { signal });
    } catch (err) {
      const handled = handleError(err, { phase: "stream_init" });
      onEvent({ type: "error", message: handled.userMessage });
      return;
    }

    try {
      for await (const event of stream) {
        switch (event.type) {
          case "content_block_start": {
            if (event.content_block.type === "text") {
              collected[event.index] = {
                type: "text",
                text: "",
                citations: null,
              } as unknown as TextBlock;
            } else if (event.content_block.type === "tool_use") {
              const tu = event.content_block;
              partialTools.set(event.index, {
                id: tu.id,
                name: tu.name,
                jsonBuffer: "",
              });
            }
            break;
          }
          case "content_block_delta": {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              const block = collected[event.index] as TextBlock | undefined;
              if (block) block.text += delta.text;
              onEvent({ type: "text", text: delta.text });
            } else if (delta.type === "input_json_delta") {
              const partial = partialTools.get(event.index);
              if (partial) partial.jsonBuffer += delta.partial_json;
            }
            break;
          }
          case "content_block_stop": {
            const partial = partialTools.get(event.index);
            if (partial) {
              let parsed: Record<string, unknown> = {};
              try {
                parsed = partial.jsonBuffer ? JSON.parse(partial.jsonBuffer) : {};
              } catch {
                parsed = {};
              }
              const toolUseBlock = {
                type: "tool_use" as const,
                id: partial.id,
                name: partial.name,
                input: parsed,
              };
              collected[event.index] = toolUseBlock as unknown as ToolUseBlock;
              onEvent({
                type: "tool_start",
                id: partial.id,
                name: partial.name,
                input: parsed,
              });
              partialTools.delete(event.index);
            }
            break;
          }
          case "message_delta": {
            if (event.delta.stop_reason) stopReason = event.delta.stop_reason;
            break;
          }
        }
      }

      // Asegurar el stop_reason final.
      const finalMessage = await stream.finalMessage();
      console.info("[chat usage]", { model: MODEL, input_tokens: finalMessage.usage.input_tokens, output_tokens: finalMessage.usage.output_tokens });
      if (finalMessage.stop_reason) stopReason = finalMessage.stop_reason;

      // Si por algún motivo no recibimos bloques (p.e. la API no se los pasó al
      // stream listener todavía), reconstruimos desde finalMessage.
      const assistantContent: ContentBlock[] =
        collected.filter(Boolean).length > 0
          ? collected.filter(Boolean)
          : (finalMessage.content as ContentBlock[]);

      conversation.push({ role: "assistant", content: assistantContent });

      if (stopReason !== "tool_use") {
        return;
      }

      // Ejecutar las tools y empujar tool_result.
      const toolUses = assistantContent.filter(
        (b): b is ToolUseBlock => b.type === "tool_use"
      );
      if (toolUses.length === 0) return;

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const tu of toolUses) {
        try {
          if (signal?.aborted) return;
          if (++toolCount > MAX_TOOL_CALLS) throw new Error("Límite de cuatro herramientas por turno alcanzado.");
          const result = await runTool(tu.name, tu.input);
          if (result.forClient) {
            if (result.forClient.kind === "purchase_valuation") {
              onEvent({ type: "purchase_valuation", data: result.forClient.data });
            } else if (result.forClient.kind === "properties") {
              onEvent({
                type: "properties",
                items: result.forClient.data.properties,
              });
            } else if (result.forClient.kind === "mortgage") {
              onEvent({ type: "mortgage", data: result.forClient.data });
            } else if (result.forClient.kind === "market") {
              onEvent({ type: "market", data: result.forClient.data });
            } else if (result.forClient.kind === "rent") {
              onEvent({ type: "rent", data: result.forClient.data });
            } else if (result.forClient.kind === "commute") {
              onEvent({ type: "commute", data: result.forClient.data });
            } else if (result.forClient.kind === "neighborhood") {
              onEvent({ type: "neighborhood", data: result.forClient.data });
            }
          }
          onEvent({
            type: "tool_end",
            id: tu.id,
            result: result.forModel,
            isError: false,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(result.forModel),
          });
        } catch (err) {
          const handled = handleError(err, { tool: tu.name });
          onEvent({
            type: "tool_end",
            id: tu.id,
            result: { error: handled.userMessage },
            isError: true,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: handled.userMessage,
            is_error: true,
          });
        }
      }

      conversation.push({ role: "user", content: toolResults });
      // Loop continúa: enviamos los tool_result y dejamos que Claude responda.
    } catch (err) {
      const handled = handleError(err, { phase: "stream_iter" });
      onEvent({
        type: "error",
        message:
          err instanceof AnthropicError ? err.userMessage : handled.userMessage,
      });
      return;
    }
  }

  onEvent({
    type: "error",
    message:
      "Demasiadas llamadas seguidas a herramientas en este turno. Vuelve a preguntar de forma más concreta.",
  });
}
