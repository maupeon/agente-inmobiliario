import { cn } from "@/lib/utils";

type LogoVariant = "stack" | "inline" | "mark";

/**
 * Wordmark "Agente Inmobiliario".
 *
 * La A y la I se renderizan en serif italic (Newsreader) + saffron, el resto
 * en Geist sans ink. Esto produce dos lecturas simultáneas:
 *  1) el nombre completo "Agente Inmobiliario";
 *  2) un sigil tipográfico "A · I" → IA (Inteligencia Artificial).
 *
 * Variantes:
 *  - `stack`  → editorial en dos líneas (sidebar, hero)
 *  - `inline` → una línea (mobile topbar, footers)
 *  - `mark`   → solo el sigil "A · I" (header de mensajes, espacios estrechos)
 */
export function Logo({
  variant = "stack",
  className,
  highlightClassName,
}: {
  variant?: LogoVariant;
  className?: string;
  highlightClassName?: string;
}) {
  const highlight = cn(
    "font-display italic font-medium text-saffron-700",
    highlightClassName
  );
  const body = "font-sans font-medium text-ink";

  if (variant === "mark") {
    return (
      <span
        aria-label="Agente Inmobiliario"
        className={cn(
          "inline-flex items-baseline tracking-tight leading-none",
          className
        )}
      >
        <span className={highlight}>A</span>
        <span
          aria-hidden
          className="mx-[0.18em] text-mist text-[0.55em] not-italic"
        >
          ·
        </span>
        <span className={highlight}>I</span>
      </span>
    );
  }

  if (variant === "inline") {
    return (
      <span
        aria-label="Agente Inmobiliario"
        className={cn(
          "inline-flex items-baseline tracking-tight leading-none",
          className
        )}
      >
        <span className={highlight}>A</span>
        <span className={body}>gente</span>
        <span className="w-[0.4em]" />
        <span className={highlight}>I</span>
        <span className={body}>nmobiliario</span>
      </span>
    );
  }

  // stack
  return (
    <span
      aria-label="Agente Inmobiliario"
      className={cn(
        "inline-flex flex-col leading-[0.92] tracking-tight",
        className
      )}
    >
      <span className="inline-flex items-baseline">
        <span className={highlight}>A</span>
        <span className={body}>gente</span>
      </span>
      <span className="inline-flex items-baseline pl-[0.18em]">
        <span className={highlight}>I</span>
        <span className={body}>nmobiliario</span>
      </span>
    </span>
  );
}
