import { networkInterfaces } from "node:os";
import { isLoopbackHost, privateLanOrigins } from "@/lib/presentation-remote/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loopbackAuthority(authority: string, protocol: string): URL | null {
  try {
    const url = new URL(`${protocol}//${authority}`);
    return !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash && isLoopbackHost(url.hostname)
      ? url : null;
  } catch {
    return null;
  }
}

/** Local-only hint for a laptop opened at localhost; never exposes deployed NICs. */
export function GET(request: Request): Response {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const localAuthority = host ? loopbackAuthority(host, url.protocol) : null;
  // Next can normalize Request.url to its bind address when listening on all
  // interfaces. Only an explicit loopback Host may qualify that wildcard URL.
  const wildcard = url.hostname === "0.0.0.0" || url.hostname === "[::]";
  const origin = localAuthority ?? url;
  const localRequest = !process.env.VERCEL &&
    (url.protocol === "http:" || url.protocol === "https:") &&
    (isLoopbackHost(url.hostname) || (wildcard && localAuthority !== null)) &&
    (!host || localAuthority !== null) &&
    (!forwardedHost || loopbackAuthority(forwardedHost, url.protocol) !== null);
  const origins = localRequest
    ? privateLanOrigins(networkInterfaces(), origin.port, origin.protocol as "http:" | "https:")
    : [];
  return Response.json({ origins }, {
    headers: { "Cache-Control": "private, no-store", "Vary": "Host, X-Forwarded-Host" },
  });
}
