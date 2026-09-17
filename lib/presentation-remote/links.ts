/** Helpers shared by the pairing dialog and the local network discovery route. */
export function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "[::1]") return true;
  const octets = parseIPv4(host);
  return octets !== null && octets[0] === 127;
}

/** The capability stays in the fragment, so it is never part of a server request. */
export function controllerUrl(origin: string, session: string): string {
  if (!/^[a-f0-9]{64}$/.test(session)) {
    throw new Error("La sesión del mando no es válida.");
  }
  const base = new URL(origin);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username || base.password || base.pathname !== "/" ||
    base.search || base.hash
  ) {
    throw new Error("Usa solo el origen de la presentación (http o https).");
  }
  const result = new URL("/presentacion/mando", base.origin);
  result.hash = session;
  return result.href;
}

type NetworkAddress = { address: string; family: string | number; internal: boolean };
type NetworkInterfaces = Record<string, readonly NetworkAddress[] | undefined>;

function parseIPv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part))) return null;
  const octets = parts.map(Number);
  return octets.every((octet) => octet <= 255) ? octets : null;
}

function isPrivateIPv4(address: string): boolean {
  const octets = parseIPv4(address);
  if (!octets) return false;
  return octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168);
}

function interfacePriority(name: string): number {
  if (/^(en[01]|eth\d+|wlan\d+|wl\w+|wi-?fi|ethernet)$/i.test(name)) return 0;
  if (/^(en\d+|enp\w+|ens\w+)/i.test(name)) return 1;
  if (/^(utun|tun|tap|wg|tailscale|docker|br-|veth|bridge|vmnet|vbox)/i.test(name)) return 3;
  return 2;
}

/** Only RFC1918 IPv4 addresses; Wi-Fi/Ethernet are offered before virtual networks. */
export function privateLanOrigins(
  interfaces: NetworkInterfaces,
  port: string,
  protocol: "http:" | "https:" = "http:",
): string[] {
  if (port && (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535)) return [];
  if (protocol !== "http:" && protocol !== "https:") return [];
  const origins = new Set<string>();
  const sorted = Object.entries(interfaces).sort(([a], [b]) =>
    interfacePriority(a) - interfacePriority(b) || a.localeCompare(b),
  );
  for (const [, addresses] of sorted) {
    for (const address of addresses ?? []) {
      if (address.internal || !["IPv4", 4].includes(address.family) || !isPrivateIPv4(address.address)) continue;
      origins.add(new URL(`${protocol}//${address.address}${port ? `:${Number(port)}` : ""}`).origin);
    }
  }
  return [...origins];
}
