import { IdealistaError } from "@/lib/errors";

/**
 * OAuth2 client_credentials para la API de Idealista.
 * Cachea el token en memoria del worker y lo refresca 60s antes de expirar.
 *
 * Idealista emite tokens con `expires_in` típicamente 43200 segundos (12 h).
 * El cache es por instancia/lambda — está bien para nuestro tráfico.
 */

let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string> | null = null;

const TOKEN_URL = "https://api.idealista.com/oauth/token";

export async function getAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;
  if (inflight) return inflight;

  const apiKey = process.env.IDEALISTA_API_KEY;
  const secret = process.env.IDEALISTA_SECRET;
  if (!apiKey || !secret) {
    throw new IdealistaError("missing IDEALISTA_API_KEY / IDEALISTA_SECRET", {
      userMessage:
        "El conector con Idealista todavía no está configurado en este entorno.",
    });
  }

  const credentials = Buffer.from(`${apiKey}:${secret}`).toString("base64");

  inflight = (async () => {
    try {
      const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: "grant_type=client_credentials&scope=read",
        // El token endpoint no necesita streaming
        cache: "no-store",
    signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new IdealistaError(
          `auth failed ${res.status}: ${text.slice(0, 200)}`,
          { status: res.status }
        );
      }

      const data = (await res.json()) as { access_token: string; expires_in: number };
      cached = {
        token: data.access_token,
        expiresAt: Date.now() + data.expires_in * 1000,
      };
      return data.access_token;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Usado en tests/dev para resetear el cache entre llamadas. */
export function _resetIdealistaTokenCache() {
  cached = null;
  inflight = null;
}
