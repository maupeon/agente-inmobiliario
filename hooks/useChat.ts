"use client";
import { useCallback, useRef, useState } from "react";
import { saveLastSearch } from "@/lib/last-search";
import { uid } from "@/lib/utils";
import type {
  CommuteResult,
  MarketAnalysis,
  Message,
  MortgageCalc,
  NeighborhoodReport,
  Property,
  RentValuation,
  StreamEvent,
  ToolCall,
  UserProfile,
} from "@/types";

interface UseChatOpts {
  userId?: string;
  profile?: UserProfile | null;
}

interface UseChatReturn {
  messages: Message[];
  conversationId: string | null;
  isStreaming: boolean;
  /** "thinking" | "searching" | null — para el indicador. */
  agentState: "idle" | "thinking" | "searching";
  activeTool: string | null;
  error: string | null;
  send(text: string): Promise<void>;
  reset(): void;
  loadConversation(id: string): Promise<void>;
}

const TOOL_LABELS: Record<string, string> = {
  buscar_propiedades: "Buscando en Idealista",
  detalle_propiedad: "Cargando ficha",
  calcular_hipoteca: "Calculando hipoteca",
  analizar_mercado: "Consultando INE y Banco de España",
  valorar_alquiler: "Comparando el alquiler con la zona",
  calcular_trayecto: "Calculando el trayecto al trabajo",
  consultar_barrio: "Mirando seguridad y calidad de vida",
};

export function useChat(opts: UseChatOpts = {}): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentState, setAgentState] = useState<"idle" | "thinking" | "searching">("idle");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    setAgentState("idle");
    setActiveTool(null);
    setError(null);
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setAgentState("idle");
    setActiveTool(null);
    setError(null);

    try {
      const res = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { messages?: Message[] };
      setMessages(data.messages ?? []);
      setConversationId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      const assistantId = uid();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        toolCalls: [],
        properties: [],
        createdAt: new Date().toISOString(),
      };

      const history = [...messages, userMsg];
      setMessages([...history, assistantMsg]);
      setIsStreaming(true);
      setAgentState("thinking");

      // Resultados de búsqueda de este turno, para persistirlos al cerrar el
      // stream (los usa el panel/mapa como "última búsqueda").
      const turnProperties: Property[] = [];

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            conversationId,
            userId: opts.userId,
            profile: opts.profile ?? null,
          }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        if (!res.body) throw new Error("respuesta sin cuerpo");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Eventos SSE separados por \n\n.
          let idx;
          while ((idx = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 2);
            if (!chunk.startsWith("data:")) continue;
            const json = chunk.slice(5).trim();
            if (!json) continue;
            let event: StreamEvent;
            try {
              event = JSON.parse(json) as StreamEvent;
            } catch {
              continue;
            }
            applyEvent(event);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg !== "AbortError" && !ctrl.signal.aborted) {
          setError(msg);
        }
      } finally {
        setIsStreaming(false);
        setAgentState("idle");
        setActiveTool(null);
        abortRef.current = null;
        if (turnProperties.length) saveLastSearch(turnProperties);
      }

      function applyEvent(event: StreamEvent) {
        if (event.type === "conversation") {
          setConversationId(event.id);
          return;
        }
        if (event.type === "text") {
          setAgentState("thinking");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + event.text } : m
            )
          );
          return;
        }
        if (event.type === "tool_start") {
          setAgentState("searching");
          setActiveTool(TOOL_LABELS[event.name] ?? "Trabajando");
          const newCall: ToolCall = {
            id: event.id,
            name: event.name,
            input: event.input,
            status: "running",
          };
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, toolCalls: [...(m.toolCalls ?? []), newCall] }
                : m
            )
          );
          return;
        }
        if (event.type === "tool_end") {
          setAgentState("thinking");
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    toolCalls: (m.toolCalls ?? []).map((c) =>
                      c.id === event.id
                        ? {
                            ...c,
                            result: event.result,
                            isError: event.isError,
                            status: event.isError ? "error" : "done",
                          }
                        : c
                    ),
                  }
                : m
            )
          );
          return;
        }
        if (event.type === "properties") {
          const items = event.items as Property[];
          turnProperties.push(...items);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, properties: [...(m.properties ?? []), ...items] }
                : m
            )
          );
          return;
        }
        if (event.type === "mortgage") {
          const data = event.data as MortgageCalc;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, mortgage: data } : m))
          );
          return;
        }
        if (event.type === "market") {
          const data = event.data as MarketAnalysis;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, market: data } : m))
          );
          return;
        }
        if (event.type === "rent") {
          const data = event.data as RentValuation;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, rent: data } : m))
          );
          return;
        }
        if (event.type === "commute") {
          const data = event.data as CommuteResult;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, commute: data } : m))
          );
          return;
        }
        if (event.type === "neighborhood") {
          const data = event.data as NeighborhoodReport;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, neighborhood: data } : m))
          );
          return;
        }
        if (event.type === "error") {
          setError(event.message);
          return;
        }
      }
    },
    [messages, conversationId, isStreaming, opts.userId, opts.profile]
  );

  return {
    messages,
    conversationId,
    isStreaming,
    agentState,
    activeTool,
    error,
    send,
    reset,
    loadConversation,
  };
}
