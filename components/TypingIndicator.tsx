"use client";
import { cn } from "@/lib/utils";

export function TypingIndicator({
  mode,
  toolLabel,
  className,
}: {
  mode: "thinking" | "searching";
  toolLabel?: string;
  className?: string;
}) {
  if (mode === "thinking") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-hairline bg-paper-50 px-3 py-1.5",
          className
        )}
        aria-label="Pensando"
      >
        <span className="flex items-end gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-stone"
              style={{
                animation: "pulseSoft 1.2s ease-in-out infinite",
                animationDelay: `${i * 160}ms`,
              }}
            />
          ))}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
          pensando
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-md border border-saffron-200/70 bg-saffron-50 px-3 py-1.5",
        className
      )}
      aria-label={`${toolLabel ?? "Buscando"} en Idealista`}
    >
      <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-saffron-100">
        <span
          className="absolute inset-y-0 -left-1/3 w-1/3 rounded-full bg-gradient-to-r from-transparent via-saffron-500 to-transparent"
          style={{ animation: "shimmer 1.2s linear infinite" }}
        />
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-saffron-700">
        {toolLabel ?? "Buscando en Idealista"}
      </span>
    </div>
  );
}
