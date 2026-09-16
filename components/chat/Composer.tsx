"use client";
import { ArrowUp, StopCircle } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  placeholder = "Cuéntame qué buscas. Ej.: «un piso de 2 hab. en Lavapiés por 200 mil»",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isStreaming: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!isStreaming) onSubmit();
      }}
      className={cn(
        "group relative flex items-end gap-3 rounded-xl border border-hairline bg-paper-50 p-2.5 pl-4 transition focus-within:border-ink/40 shadow-nudge"
      )}
    >
      <span className="pointer-events-none absolute left-4 top-3 font-mono text-[9px] uppercase tracking-[0.2em] text-mist">
        tú
      </span>
      <textarea
        ref={ref}
        rows={1}
        maxLength={8000}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isStreaming) onSubmit();
          }
        }}
        className="mt-5 flex-1 resize-none bg-transparent pr-2 text-ink placeholder:text-mist focus:outline-none"
      />

      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          className="grid h-10 w-10 place-items-center self-end rounded-md border border-hairline bg-paper text-stone transition hover:border-ink/30 hover:text-ink active:scale-95"
          aria-label="Detener respuesta"
        >
          <StopCircle size={17} weight="bold" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!value.trim()}
          className={cn(
            "grid h-10 w-10 place-items-center self-end rounded-md transition active:scale-95",
            value.trim()
              ? "bg-ink text-paper hover:bg-ink-700"
              : "border border-hairline bg-paper text-mist"
          )}
          aria-label="Enviar mensaje"
        >
          <ArrowUp size={17} weight="bold" />
        </button>
      )}
    </form>
  );
}
