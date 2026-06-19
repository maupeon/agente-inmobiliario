"use client";
import {
  CheckCircle,
  Circle,
  MagnifyingGlass,
  FileText,
  Calculator,
  ChartBar,
  Scales,
  Path,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { Message, Property, ToolCall } from "@/types";
import { Markdown } from "./Markdown";
import { PropertyGrid } from "./PropertyGrid";
import { MortgageCard } from "./MortgageCard";
import { MarketCard } from "./MarketCard";
import { RentValuationCard } from "./RentValuationCard";
import { CommuteCard } from "./CommuteCard";
import { NeighborhoodCard } from "./NeighborhoodCard";
import { Logo } from "./ui/Logo";

const TOOL_META: Record<
  string,
  { label: string; activeLabel: string; Icon: typeof MagnifyingGlass }
> = {
  buscar_propiedades: {
    label: "Idealista",
    activeLabel: "Buscando en Idealista",
    Icon: MagnifyingGlass,
  },
  detalle_propiedad: {
    label: "Ficha del anuncio",
    activeLabel: "Cargando ficha",
    Icon: FileText,
  },
  calcular_hipoteca: {
    label: "Cálculo hipotecario",
    activeLabel: "Calculando hipoteca",
    Icon: Calculator,
  },
  analizar_mercado: {
    label: "INE · Banco de España",
    activeLabel: "Consultando datos de mercado",
    Icon: ChartBar,
  },
  valorar_alquiler: {
    label: "Precio vs. zona",
    activeLabel: "Comparando el alquiler con la zona",
    Icon: Scales,
  },
  calcular_trayecto: {
    label: "Trayecto al trabajo",
    activeLabel: "Calculando el trayecto",
    Icon: Path,
  },
  consultar_barrio: {
    label: "Seguridad y calidad de vida",
    activeLabel: "Mirando seguridad y calidad de vida",
    Icon: ShieldCheck,
  },
};

export function MessageBubble({
  message,
  isStreaming = false,
  isFavorite,
  onToggleFavorite,
}: {
  message: Message;
  /** `true` solo en el último mensaje del agente mientras llega el stream. */
  isStreaming?: boolean;
  isFavorite?: (code: string) => boolean;
  onToggleFavorite?: (p: Property) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex w-full justify-end animate-fade-up">
        <div className="max-w-[80%] rounded-lg border border-saffron-200/80 bg-saffron-50/70 px-4 py-3 text-ink sm:max-w-[60%]">
          <p className="whitespace-pre-wrap text-pretty leading-relaxed">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  const toolCalls = message.toolCalls ?? [];
  const properties = message.properties ?? [];
  const hasContent =
    Boolean(message.content) ||
    toolCalls.length > 0 ||
    properties.length > 0 ||
    Boolean(message.mortgage) ||
    Boolean(message.market) ||
    Boolean(message.rent) ||
    Boolean(message.commute) ||
    Boolean(message.neighborhood);

  return (
    <article className="animate-fade-up">
      <header className="mb-3 flex items-center gap-3">
        <Logo
          variant="mark"
          className={cn("text-base transition-transform", isStreaming && "mark-pulse")}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone">
          Agente Inmobiliario
        </span>
        <span className="h-px flex-1 bg-hairline" />
      </header>

      <div className="grid grid-cols-[2px_minmax(0,1fr)] gap-4">
        <span
          className={cn(
            "rounded-full bg-saffron-300/60 transition-opacity duration-500",
            isStreaming ? "opacity-100" : "opacity-50"
          )}
        />
        <div className="space-y-5">
          {toolCalls.length > 0 && (
            <ToolCallsList toolCalls={toolCalls} />
          )}

          {message.content && (
            <Markdown streaming={isStreaming} className="text-ink-700">
              {message.content}
            </Markdown>
          )}

          {/* Las tarjetas (propiedades, mercado, hipoteca) NO se renderizan
              durante el stream — el usuario solo ve los chips de tool corriendo
              y el texto de Claude. Cuando termina, aparecen escalonadas. */}
          {!isStreaming && properties.length > 0 && (
            <div
              className="stage-reveal"
              style={{ ["--reveal-delay" as never]: "120ms" }}
            >
              <PropertyGrid
                items={properties}
                isFavorite={isFavorite}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          )}

          {!isStreaming && message.market && (
            <div
              className="stage-reveal"
              style={{ ["--reveal-delay" as never]: "240ms" }}
            >
              <MarketCard data={message.market} />
            </div>
          )}

          {!isStreaming && message.rent && (
            <div
              className="stage-reveal"
              style={{ ["--reveal-delay" as never]: "300ms" }}
            >
              <RentValuationCard data={message.rent} />
            </div>
          )}

          {!isStreaming && message.commute && (
            <div
              className="stage-reveal"
              style={{ ["--reveal-delay" as never]: "360ms" }}
            >
              <CommuteCard data={message.commute} />
            </div>
          )}

          {!isStreaming && message.neighborhood && (
            <div
              className="stage-reveal"
              style={{ ["--reveal-delay" as never]: "420ms" }}
            >
              <NeighborhoodCard data={message.neighborhood} />
            </div>
          )}

          {!isStreaming && message.mortgage && (
            <div
              className="stage-reveal"
              style={{ ["--reveal-delay" as never]: "480ms" }}
            >
              <MortgageCard data={message.mortgage} />
            </div>
          )}

          {!hasContent && isStreaming && (
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
              componiendo respuesta…
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ToolCallsList({ toolCalls }: { toolCalls: ToolCall[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {toolCalls.map((t) => (
        <li key={t.id}>
          <ToolCallChip call={t} />
        </li>
      ))}
    </ul>
  );
}

function ToolCallChip({ call }: { call: ToolCall }) {
  const meta = TOOL_META[call.name] ?? {
    label: call.name,
    activeLabel: call.name,
    Icon: Circle,
  };
  const { Icon } = meta;

  if (call.status === "running") {
    return (
      <span className="inline-flex items-center gap-2 rounded-md border border-saffron-200/70 bg-saffron-50 px-2.5 py-1 text-saffron-700">
        <span className="relative h-3 w-3">
          <span className="absolute inset-0 rounded-full bg-saffron-300/40 animate-ping" />
          <Icon size={12} weight="bold" className="relative" />
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
          {meta.activeLabel}
        </span>
      </span>
    );
  }

  if (call.status === "error" || call.isError) {
    const detail = (call.result as { error?: string } | undefined)?.error;
    return (
      <span
        className="inline-flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-50 px-2.5 py-1 text-rose-500"
        title={detail}
      >
        <WarningCircle size={12} weight="bold" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
          {meta.label} · falló
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-hairline bg-paper-100 px-2.5 py-1 text-stone">
      <CheckCircle size={12} weight="fill" className="text-sage-500" />
      <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
        {meta.label}
      </span>
    </span>
  );
}

export function ChatNoise({ className }: { className?: string }) {
  return <div className={cn("editorial-rule", className)} />;
}
