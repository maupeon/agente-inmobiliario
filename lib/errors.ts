/**
 * Errores tipados de la app. La regla: nunca exponer stack traces ni mensajes
 * técnicos al usuario final. `handleError()` devuelve un mensaje legible y
 * loggea el detalle a consola con contexto.
 */

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly userMessage: string;

  constructor(opts: {
    code: string;
    message: string;
    userMessage: string;
    status?: number;
    cause?: unknown;
  }) {
    super(opts.message);
    this.name = this.constructor.name;
    this.code = opts.code;
    this.status = opts.status ?? 500;
    this.userMessage = opts.userMessage;
    if (opts.cause) (this as unknown as { cause: unknown }).cause = opts.cause;
  }
}

export class IdealistaError extends AppError {
  constructor(message: string, opts: { status?: number; cause?: unknown; userMessage?: string } = {}) {
    super({
      code: "idealista_error",
      message,
      status: opts.status ?? 502,
      cause: opts.cause,
      userMessage:
        opts.userMessage ??
        "Idealista no está respondiendo bien ahora mismo. Vuelve a intentarlo en un momento.",
    });
  }
}

export class AnthropicError extends AppError {
  constructor(message: string, opts: { status?: number; cause?: unknown } = {}) {
    super({
      code: "anthropic_error",
      message,
      status: opts.status ?? 502,
      cause: opts.cause,
      userMessage: "He tenido un fallo al razonar tu petición. ¿Podemos intentarlo otra vez?",
    });
  }
}

export class SupabaseError extends AppError {
  constructor(message: string, opts: { cause?: unknown } = {}) {
    super({
      code: "supabase_error",
      message,
      status: 500,
      cause: opts.cause,
      userMessage:
        "No he podido guardar la conversación, pero seguimos pudiendo hablar.",
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, userMessage = "Falta información para responderte.") {
    super({ code: "validation_error", message, userMessage, status: 400 });
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSec: number) {
    super({
      code: "rate_limit",
      message: `rate limit reached, retry in ${retryAfterSec}s`,
      status: 429,
      userMessage:
        "Estás yendo muy rápido. Espera un momento y volvemos a buscar.",
    });
  }
}

export function handleError(err: unknown, ctx?: Record<string, unknown>) {
  if (err instanceof AppError) {
    console.error(`[${err.code}]`, err.message, { ctx, cause: (err as { cause?: unknown }).cause });
    return { code: err.code, status: err.status, userMessage: err.userMessage };
  }
  console.error("[unknown_error]", err, ctx);
  return {
    code: "unknown_error",
    status: 500,
    userMessage: "Algo se ha torcido por dentro. Estamos en ello.",
  };
}
