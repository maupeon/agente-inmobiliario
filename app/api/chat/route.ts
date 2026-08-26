import { NextRequest } from "next/server";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { executeAgentLoop } from "@/lib/agent/loop";
import { handleError, RateLimitError, ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { trackEvent } from "@/lib/analytics";
import { persistTurn } from "@/lib/supabase/conversations";
import type { Message, StreamEvent, UserProfile } from "@/types";
import { uid } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequestBody {
  messages?: Message[];
  conversationId?: string;
  userId?: string;
  profile?: UserProfile | null;
}

function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anon";
}

function toAnthropicMessages(messages: Message[]): MessageParam[] {
  return messages
    .filter((m) => m.content && m.content.trim().length > 0)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const limit = rateLimit(ip);
  if (!limit.ok) {
    const err = new RateLimitError(limit.retryAfter);
    return Response.json(
      { code: err.code, error: err.userMessage },
      { status: err.status, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    const err = new ValidationError("body inválido", "No he entendido la petición.");
    return Response.json({ code: err.code, error: err.userMessage }, { status: 400 });
  }

  if (!body.messages || body.messages.length === 0) {
    const err = new ValidationError("messages vacío", "Falta el mensaje del usuario.");
    return Response.json({ code: err.code, error: err.userMessage }, { status: 400 });
  }

  const userId = body.userId ?? null;
  let conversationId = body.conversationId;
  const isFirstTurn = !conversationId;

  const userMessages = body.messages;
  const lastUserMessage = [...userMessages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    const err = new ValidationError("no user message", "Falta tu mensaje.");
    return Response.json({ code: err.code, error: err.userMessage }, { status: 400 });
  }

  const anthropicMessages = toAnthropicMessages(userMessages);

  // Acumulamos la respuesta del assistant para persistir al final.
  let assistantText = "";
  const assistantToolCalls: Message["toolCalls"] = [];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Si no había conversación previa, generamos un id local provisional
      // (Supabase confirmará el suyo en background).
      if (isFirstTurn) {
        conversationId = conversationId ?? uid();
        send({ type: "conversation", id: conversationId });
      }

      try {
        await executeAgentLoop(anthropicMessages, (e) => {
          if (e.type === "text") assistantText += e.text;
          if (e.type === "tool_start") {
            assistantToolCalls!.push({
              id: e.id,
              name: e.name,
              input: e.input,
              status: "running",
            });
          }
          if (e.type === "tool_end") {
            const tc = assistantToolCalls!.find((c) => c.id === e.id);
            if (tc) {
              tc.result = e.result;
              tc.isError = e.isError;
              tc.status = e.isError ? "error" : "done";
            }
          }
          send(e);
        }, body.profile ?? null);
      } catch (err) {
        const handled = handleError(err, { route: "POST /api/chat" });
        send({ type: "error", message: handled.userMessage });
      } finally {
        send({ type: "done" });
        controller.close();
      }

      // Persistencia y analytics fuera del flujo crítico.
      void (async () => {
        try {
          if (assistantText.trim().length > 0) {
            const persisted = await persistTurn({
              conversationId: isFirstTurn ? undefined : conversationId,
              userId,
              userMessage: lastUserMessage,
              assistantMessage: {
                id: uid(),
                role: "assistant",
                content: assistantText,
                toolCalls: assistantToolCalls,
                createdAt: new Date().toISOString(),
              },
            });
            if (persisted) conversationId = persisted.conversationId;
          }
          if (isFirstTurn) {
            await trackEvent({ name: "conversation_started", data: {} }, userId);
          }
          for (const tc of assistantToolCalls ?? []) {
            if (tc.name === "buscar_propiedades" && !tc.isError) {
              const r = tc.result as { count?: number; filters?: { zona?: string; operacion?: string } } | undefined;
              await trackEvent({
                name: "search_performed",
                data: {
                  zona: r?.filters?.zona ?? "",
                  operacion: r?.filters?.operacion ?? "",
                  resultCount: r?.count ?? 0,
                },
              }, userId);
            } else if (tc.name === "calcular_hipoteca" && !tc.isError) {
              const r = tc.result as { propertyPrice?: number; monthlyPayment?: number } | undefined;
              await trackEvent({
                name: "mortgage_calculated",
                data: {
                  price: r?.propertyPrice ?? 0,
                  monthlyPayment: r?.monthlyPayment ?? 0,
                },
              }, userId);
            } else if (tc.isError) {
              await trackEvent({
                name: "tool_error",
                data: { tool: tc.name, reason: "tool_failure" },
              }, userId);
            }
          }
        } catch (err) {
          console.warn("[chat ] post-stream persistence failed.", err);
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
