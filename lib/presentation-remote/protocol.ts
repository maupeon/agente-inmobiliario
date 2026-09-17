import { SCENES } from "./slides";

export type RemoteSnapshot = {
  active: number;
  elapsed: number;
  running: boolean;
  videoPlaying: boolean;
  videoAvailable: boolean;
  videoError: string | null;
};

export type RemoteCommand =
  | { type: "next" | "previous" | "toggle-timer" | "toggle-video" }
  | { type: "go-to"; index: number };

export const HEARTBEAT_MS = 2_000;
export const PEER_TIMEOUT_MS = 8_000;
export const COMMAND_TTL_MS = 4_000;
export const REMOTE_EVENT = "presentation-remote-v1";

type Identity = { controller: string; connection: string };
export type CommandMessage = Identity & {
  kind: "command";
  lease: string;
  id: string;
  sequence: number;
  issuedAt: number;
  expiresAt: number;
  expectedActive: number;
  command: RemoteCommand;
};
export type RemoteMessage =
  | (Identity & { kind: "hello" | "ping" | "leave" })
  | CommandMessage
  | {
      kind: "state";
      host: string;
      to: string;
      connection: string;
      lease: string;
      revision: number;
      sentAt: number;
      snapshot: RemoteSnapshot;
    }
  | {
      kind: "ack";
      host: string;
      to: string;
      connection: string;
      id: string;
      accepted: boolean;
      revision: number;
      sentAt: number;
      snapshot: RemoteSnapshot;
    }
  | { kind: "ended"; host: string };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max;
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{32}$/.test(value);

export function isRemoteSession(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function isRemoteCommand(value: unknown): value is RemoteCommand {
  if (!record(value)) return false;
  if (value.type === "go-to") return integer(value.index, SCENES.length - 1);
  return ["next", "previous", "toggle-timer", "toggle-video"].includes(value.type as string);
}

export function isRemoteSnapshot(value: unknown): value is RemoteSnapshot {
  return record(value) && integer(value.active, SCENES.length - 1) && integer(value.elapsed) &&
    typeof value.running === "boolean" && typeof value.videoPlaying === "boolean" &&
    typeof value.videoAvailable === "boolean" &&
    (value.videoError === null || (typeof value.videoError === "string" && value.videoError.length <= 1_000));
}

export function parseRemoteMessage(value: unknown): RemoteMessage | null {
  if (!record(value)) return null;
  switch (value.kind) {
    case "hello":
    case "ping":
    case "leave":
      return identifier(value.controller) && identifier(value.connection) ? value as RemoteMessage : null;
    case "command":
      return identifier(value.controller) && identifier(value.connection) && identifier(value.lease) &&
        identifier(value.id) && integer(value.sequence) && value.sequence > 0 &&
        integer(value.issuedAt) && integer(value.expiresAt) && integer(value.expectedActive, SCENES.length - 1) &&
        isRemoteCommand(value.command) ? value as CommandMessage : null;
    case "state":
    case "ack": {
      if (!identifier(value.host) || !identifier(value.to) || !identifier(value.connection) ||
        !integer(value.revision) || !integer(value.sentAt) || !isRemoteSnapshot(value.snapshot)) return null;
      if (value.kind === "state") return identifier(value.lease) ? value as RemoteMessage : null;
      return identifier(value.id) && typeof value.accepted === "boolean" ? value as RemoteMessage : null;
    }
    case "ended":
      return identifier(value.host) ? value as RemoteMessage : null;
    default:
      return null;
  }
}

export type CommandPeer = {
  connection: string;
  lease: string;
  createdAt: number;
  lastSeen: number;
  lastSequence: number;
  outcomes: Map<string, boolean>;
};

/** Never execute a duplicate or an action from an expired connection, even after rejoining. */
export function inspectCommand(
  message: CommandMessage,
  peer: CommandPeer | undefined,
  active: number,
  now: number,
): { execute: boolean; accepted: boolean } {
  if (!peer || peer.connection !== message.connection || peer.lease !== message.lease ||
    now - peer.lastSeen > PEER_TIMEOUT_MS) return { execute: false, accepted: false };
  const previous = peer.outcomes.get(message.id);
  if (previous !== undefined) return { execute: false, accepted: previous };
  if (message.sequence <= peer.lastSequence || message.issuedAt < peer.createdAt ||
    message.issuedAt > now || message.expiresAt < now ||
    message.expiresAt < message.issuedAt || message.expiresAt - message.issuedAt > COMMAND_TTL_MS ||
    message.expectedActive !== active) return { execute: false, accepted: false };
  return { execute: true, accepted: true };
}

export function rememberCommand(peer: CommandPeer, message: CommandMessage, accepted: boolean) {
  peer.lastSequence = Math.max(peer.lastSequence, message.sequence);
  peer.outcomes.set(message.id, accepted);
  if (peer.outcomes.size > 64) peer.outcomes.delete(peer.outcomes.keys().next().value!);
}
