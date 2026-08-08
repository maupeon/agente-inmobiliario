import { cn } from "@/lib/utils";

type LogoVariant = "stack" | "inline" | "mark";

/**
 * Wordmark de HabitIA. El sufijo IA funciona como firma de producto sin
 * separar visualmente la marca ni hacer que parezca una etiqueta técnica.
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
    "font-sans font-semibold text-saffron-700",
    highlightClassName
  );

  if (variant === "mark") {
    return (
      <span
        aria-label="HabitIA"
        className={cn(
          "inline-flex items-baseline font-sans font-semibold leading-none tracking-[-0.045em] text-ink",
          className
        )}
      >
        <span aria-hidden>H</span>
        <span aria-hidden className={highlight}>
          IA
        </span>
      </span>
    );
  }

  return (
    <span
      aria-label="HabitIA"
      className={cn(
        "inline-flex items-baseline whitespace-nowrap font-sans font-semibold leading-none tracking-[-0.055em] text-ink",
        variant === "stack" && "tracking-[-0.065em]",
        className
      )}
    >
      <span aria-hidden>Habit</span>
      <span aria-hidden className={highlight}>
        IA
      </span>
    </span>
  );
}
