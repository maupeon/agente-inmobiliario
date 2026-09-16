import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { executeAgentLoop } from "@/lib/agent/loop";
import { handleError, ValidationError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { isRecord, readJson, requestIp, validatedProfile } from "@/lib/api-validation";
import type { StreamEvent, UserProfile } from "@/types";
import { uid } from "@/lib/utils";
import { MAX_CHAT_HISTORY_CHARS, MAX_CHAT_MESSAGE_CHARS, MAX_CHAT_MESSAGES } from "@/lib/chat-history";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const limit = rateLimit(`chat:${requestIp(req)}`);
  if (!limit.ok) return Response.json({ error: "Espera un momento antes de continuar." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (process.env.LLM_ENABLED === "false") return Response.json({ error: "El chat está pausado para controlar el consumo. Puedes usar el panel y la calculadora." }, { status: 503 });
  let messages: MessageParam[];
  let conversationId: string;
  let profile: UserProfile | null = null;
  try {
    const body = await readJson(req, 120_000);
    if (!isRecord(body) || !Array.isArray(body.messages) || !body.messages.length || body.messages.length > MAX_CHAT_MESSAGES) throw new ValidationError("invalid messages", "Envía entre 1 y 20 mensajes de texto.");
    messages = body.messages.map((m: unknown) => {
      if (!isRecord(m) || !["user", "assistant"].includes(String(m.role)) || typeof m.content !== "string" || m.content.length > MAX_CHAT_MESSAGE_CHARS) throw new ValidationError("invalid message", "Cada mensaje debe ser texto de hasta 8.000 caracteres.");
      return { role: m.role as "user" | "assistant", content: m.content };
    }).filter((m) => (m.content as string).trim());
    if (!messages.length || messages[messages.length - 1].role !== "user" || messages.reduce((n, m) => n + (m.content as string).length, 0) > MAX_CHAT_HISTORY_CHARS) throw new ValidationError("invalid history", "Acorta el historial o inicia una conversación nueva.");
    conversationId = typeof body.conversationId === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(body.conversationId) ? body.conversationId : uid();
    profile = validatedProfile(body.profile);
  } catch (err) {
    const e = handleError(err, { route: "chat validation" });
    return Response.json({ error: e.userMessage }, { status: 400 });
  }
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const cancel = () => abort.abort();
  req.signal.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 52_000);
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (event: StreamEvent) => {
        if (closed || abort.signal.aborted) return;
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); }
        catch { closed = true; abort.abort(); }
      };
      try {
        send({ type: "conversation", id: conversationId });
        await executeAgentLoop(messages, send, profile, abort.signal);
      } catch (err) {
        if (!abort.signal.aborted) send({ type: "error", message: handleError(err).userMessage });
      } finally {
        clearTimeout(timeout); req.signal.removeEventListener("abort", cancel);
        if (!closed) { send({ type: "done" }); try { controller.close(); } catch { /* Cancelado por el visitante. */ } }
      }
    },
    cancel() { abort.abort(); clearTimeout(timeout); req.signal.removeEventListener("abort", cancel); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
