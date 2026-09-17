"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { createClient, type RealtimeChannel } from "@supabase/supabase-js";
import {
  COMMAND_TTL_MS, HEARTBEAT_MS, PEER_TIMEOUT_MS, REMOTE_EVENT,
  inspectCommand, isRemoteCommand, isRemoteSession, parseRemoteMessage, rememberCommand,
  type CommandPeer, type RemoteCommand, type RemoteMessage, type RemoteSnapshot,
} from "./protocol";

export type { RemoteCommand, RemoteSnapshot } from "./protocol";

type HostStatus = "idle" | "connecting" | "connected" | "error";
type ControllerStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error" | "ended";
const configured = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return ["http:", "https:"].includes(url.protocol) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim());
  } catch { return false; }
})();

function randomToken(bytes = 16) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), value => value.toString(16).padStart(2, "0")).join("");
}

function createRemoteClient() {
  try {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch { return null; }
}

/** Only send on a joined socket: the SDK's HTTP fallback must never queue a remote action. */
function broadcast(channel: RealtimeChannel, payload: RemoteMessage) {
  if (channel.state !== "joined" || !channel.socket.isConnected()) return Promise.resolve(false);
  return channel.send({ type: "broadcast", event: REMOTE_EVENT, payload }, { timeout: 2_000 })
    .then(result => result === "ok", () => false);
}

export function usePresentationHost({ snapshot, onCommand }: {
  snapshot: RemoteSnapshot;
  onCommand: (command: RemoteCommand) => void;
}) {
  const [session, setSession] = useState<string | null>(null);
  const [status, setStatus] = useState<HostStatus>("idle");
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef(snapshot);
  const onCommandRef = useRef(onCommand);
  const publishRef = useRef<(() => void) | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  snapshotRef.current = snapshot;
  onCommandRef.current = onCommand;

  const start = useCallback(() => {
    if (!configured || !globalThis.crypto?.getRandomValues) {
      setError("No se ha podido configurar el control remoto.");
      setStatus("error");
      return;
    }
    setError(null);
    setStatus("connecting");
    setSession(current => current ?? randomToken(32));
  }, []);

  const stop = useCallback(() => {
    stopRef.current?.();
    setSession(null);
    setRemoteConnected(false);
    setStatus("idle");
    setError(null);
  }, []);

  useEffect(() => {
    if (!session) return;
    const client = createRemoteClient();
    if (!client) {
      setStatus("error");
      setError("No se ha podido configurar la conexión remota.");
      return;
    }
    const channel = client.channel(`presentation:${session}`, { config: { broadcast: { ack: true, self: false } } });
    const host = randomToken();
    const peers = new Map<string, CommandPeer>();
    let closed = false;
    let revision = 0;
    let lastSnapshot = "";

    const currentState = () => {
      const current = snapshotRef.current;
      const serialized = JSON.stringify(current);
      if (serialized !== lastSnapshot) { revision += 1; lastSnapshot = serialized; }
      return { snapshot: current, revision, sentAt: Date.now() };
    };
    const publishTo = (controller: string, peer: CommandPeer) => {
      void broadcast(channel, {
        kind: "state", host, to: controller, connection: peer.connection, lease: peer.lease, ...currentState(),
      });
    };
    const publish = () => {
      if (closed) return;
      const now = Date.now();
      for (const [controller, peer] of peers) {
        if (now - peer.lastSeen > PEER_TIMEOUT_MS) peers.delete(controller);
        else publishTo(controller, peer);
      }
      setRemoteConnected(peers.size > 0 && channel.state === "joined");
    };
    publishRef.current = publish;
    const end = () => {
      if (closed) return;
      // Delivery is best effort; a missing heartbeat also disables every controller.
      void broadcast(channel, { kind: "ended", host });
      closed = true;
      peers.clear();
    };
    stopRef.current = end;

    channel.on("broadcast", { event: REMOTE_EVENT }, ({ payload }) => {
      if (closed) return;
      const message = parseRemoteMessage(payload);
      if (!message || !("controller" in message)) return;
      const now = Date.now();
      let peer = peers.get(message.controller);
      if (message.kind === "hello") {
        if (!peer || peer.connection !== message.connection || now - peer.lastSeen > PEER_TIMEOUT_MS) {
          peer = { connection: message.connection, lease: randomToken(), createdAt: now, lastSeen: now, lastSequence: 0, outcomes: new Map() };
          peers.set(message.controller, peer);
        }
        peer.lastSeen = now;
        publishTo(message.controller, peer);
        setRemoteConnected(true);
      } else if (message.kind === "ping" && peer?.connection === message.connection) {
        peer.lastSeen = now;
        publishTo(message.controller, peer);
      } else if (message.kind === "leave" && peer?.connection === message.connection) {
        peers.delete(message.controller);
        setRemoteConnected(peers.size > 0);
      } else if (message.kind === "command") {
        const decision = inspectCommand(message, peer, snapshotRef.current.active, now);
        let accepted = decision.accepted;
        if (decision.execute) {
          try {
            // Commit the laptop's state before acknowledging, so fast successive taps
            // always use the slide that is actually on screen.
            flushSync(() => onCommandRef.current(message.command));
          } catch { accepted = false; }
        }
        if (peer?.connection === message.connection && peer.lease === message.lease) {
          rememberCommand(peer, message, accepted);
          peer.lastSeen = now;
        }
        void broadcast(channel, {
          kind: "ack", host, to: message.controller, connection: message.connection,
          id: message.id, accepted, ...currentState(),
        });
        publish();
      }
    }).subscribe(subscription => {
      if (closed) return;
      if (subscription === "SUBSCRIBED") {
        setStatus("connected");
        setError(null);
        publish();
      } else if (subscription === "CHANNEL_ERROR" || subscription === "TIMED_OUT" || subscription === "CLOSED") {
        peers.clear();
        setRemoteConnected(false);
        setStatus("error");
        setError("Se perdió la conexión. El control se recuperará al volver a tener internet.");
      }
    });
    const interval = window.setInterval(publish, HEARTBEAT_MS);
    const visibility = () => { if (document.visibilityState === "visible") publish(); };
    const online = () => {
      if (closed) return;
      setStatus(channel.state === "joined" && channel.socket.isConnected() ? "connected" : "connecting");
      setError(null);
      publish();
    };
    const offline = () => {
      if (closed) return;
      peers.clear();
      setRemoteConnected(false);
      setStatus("error");
      setError("La computadora está sin conexión a internet.");
    };
    const restored = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      // pagehide revoked this capability. A restored browser history entry must
      // offer a new QR instead of displaying a session whose listener has ended.
      setSession(null);
      setRemoteConnected(false);
      setStatus("idle");
      setError(null);
    };
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("pagehide", end);
    window.addEventListener("pageshow", restored);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      end();
      publishRef.current = null;
      stopRef.current = null;
      window.clearInterval(interval);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("pagehide", end);
      window.removeEventListener("pageshow", restored);
      document.removeEventListener("visibilitychange", visibility);
      void client.removeChannel(channel).finally(() => client.realtime.disconnect());
    };
  }, [session]);

  useEffect(() => {
    publishRef.current?.();
  }, [snapshot.active, snapshot.elapsed, snapshot.running, snapshot.videoPlaying, snapshot.videoAvailable, snapshot.videoError]);

  return { supported: configured, status, remoteConnected, session, start, stop, error };
}

type PendingCommand = { id: string; finish: (accepted: boolean) => void; timeout: ReturnType<typeof setTimeout> };

export function usePresentationController(session: string | null) {
  const [status, setStatus] = useState<ControllerStatus>("idle");
  const [snapshot, setSnapshot] = useState<RemoteSnapshot | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const sendRef = useRef<((command: RemoteCommand) => Promise<boolean>) | null>(null);
  const reconnect = useCallback(() => setAttempt(value => value + 1), []);
  const send = useCallback((command: RemoteCommand) => sendRef.current?.(command) ?? Promise.resolve(false), []);

  useEffect(() => {
    setSnapshot(null);
    setPending(false);
    setError(null);
    if (!session) { setStatus("idle"); return; }
    if (!isRemoteSession(session) || !configured || !globalThis.crypto?.getRandomValues) {
      setStatus("error");
      setError("El enlace no es válido o el control remoto no está configurado.");
      return;
    }
    setStatus("connecting");
    const client = createRemoteClient();
    if (!client) {
      setStatus("error");
      setError("No se ha podido configurar la conexión remota.");
      return;
    }
    const channel = client.channel(`presentation:${session}`, { config: { broadcast: { ack: true, self: false } } });
    const controller = randomToken();
    let connection = randomToken();
    let host: string | null = null;
    let lease: string | null = null;
    let currentSnapshot: RemoteSnapshot | null = null;
    let revision = -1;
    let lastHostTime = 0;
    let lastReceived = 0;
    let sequence = 0;
    let connected = false;
    let joined = false;
    let closed = false;
    let ended = false;
    let hasConnected = false;
    let pendingCommand: PendingCommand | null = null;
    const startedAt = Date.now();

    const finishPending = (accepted: boolean) => {
      if (!pendingCommand) return;
      const command = pendingCommand;
      pendingCommand = null;
      clearTimeout(command.timeout);
      command.finish(accepted);
      if (!closed) setPending(false);
    };
    const hello = () => {
      if (!closed && !ended && joined) void broadcast(channel, { kind: "hello", controller, connection });
    };
    const loseConnection = (message: string) => {
      if (closed || ended) return;
      connected = false;
      lease = null;
      connection = randomToken();
      finishPending(false);
      setStatus(hasConnected ? "reconnecting" : "connecting");
      setError(message);
    };
    const resync = () => {
      if (closed || ended) return;
      loseConnection("Sincronizando con la computadora…");
      hello();
    };
    const acceptState = (message: Extract<RemoteMessage, { kind: "state" | "ack" }>) => {
      if (host && host !== message.host) return false;
      host = message.host;
      lastReceived = Date.now();
      if (message.revision >= revision && message.sentAt >= lastHostTime) {
        revision = message.revision;
        lastHostTime = message.sentAt;
        currentSnapshot = message.snapshot;
        setSnapshot(message.snapshot);
      }
      return true;
    };

    channel.on("broadcast", { event: REMOTE_EVENT }, ({ payload }) => {
      if (closed || ended) return;
      const message = parseRemoteMessage(payload);
      if (!message) return;
      if (message.kind === "ended" && (!host || host === message.host)) {
        ended = true;
        connected = false;
        finishPending(false);
        setStatus("ended");
        setError(null);
        return;
      }
      if ((message.kind !== "state" && message.kind !== "ack") ||
        message.to !== controller || message.connection !== connection) return;
      if (message.kind === "state") {
        if (!acceptState(message)) return;
        lease = message.lease;
        connected = true;
        hasConnected = true;
        setStatus("connected");
        setError(null);
      } else if (acceptState(message) && pendingCommand?.id === message.id) {
        finishPending(message.accepted);
        if (!message.accepted) setError("La diapositiva cambió. Revisa la posición y vuelve a intentarlo.");
      }
    }).subscribe(subscription => {
      if (closed || ended) return;
      if (subscription === "SUBSCRIBED") {
        joined = true;
        resync();
      } else if (subscription === "CHANNEL_ERROR" || subscription === "TIMED_OUT" || subscription === "CLOSED") {
        joined = false;
        loseConnection("Se perdió la conexión. Buscando la computadora…");
      }
    });

    sendRef.current = command => {
      if (closed || ended || !connected || !joined || !lease || !currentSnapshot || pendingCommand ||
        !isRemoteCommand(command) || !navigator.onLine || Date.now() - lastReceived > HEARTBEAT_MS * 1.5) {
        if (!closed && !ended && connected && Date.now() - lastReceived > HEARTBEAT_MS * 1.5) resync();
        return Promise.resolve(false);
      }
      const id = randomToken();
      const message: RemoteMessage = {
        kind: "command", controller, connection, lease, id, sequence: ++sequence,
        // Expiry uses the laptop's clock; different phone time zones/clocks are harmless.
        issuedAt: lastHostTime, expiresAt: lastHostTime + COMMAND_TTL_MS,
        expectedActive: currentSnapshot.active, command,
      };
      setError(null);
      setPending(true);
      return new Promise<boolean>(resolve => {
        pendingCommand = {
          id, finish: resolve,
          timeout: setTimeout(() => {
            finishPending(false);
            loseConnection("No llegó la confirmación de la computadora. Sincronizando…");
            hello();
          }, COMMAND_TTL_MS),
        };
        void broadcast(channel, message).then(sent => {
          if (!sent && pendingCommand?.id === id) {
            loseConnection("No se pudo enviar la acción. Sincronizando…");
            hello();
          }
        });
      });
    };

    const heartbeat = () => {
      if (closed || ended) return;
      if (connected && Date.now() - lastReceived > PEER_TIMEOUT_MS) loseConnection("No hay respuesta de la computadora. Reconectando…");
      if (connected) void broadcast(channel, { kind: "ping", controller, connection });
      else {
        hello();
        if (!hasConnected && Date.now() - startedAt > 15_000) {
          setStatus("error");
          setError("No se encuentra la presentación. Comprueba la computadora o escanea un QR nuevo.");
        }
      }
    };
    const interval = window.setInterval(heartbeat, HEARTBEAT_MS);
    const visibility = () => { if (document.visibilityState === "visible") resync(); };
    const offline = () => loseConnection("El celular está sin conexión a internet.");
    const leave = () => { void broadcast(channel, { kind: "leave", controller, connection }); };
    window.addEventListener("online", resync);
    window.addEventListener("offline", offline);
    window.addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      leave();
      closed = true;
      finishPending(false);
      sendRef.current = null;
      window.clearInterval(interval);
      window.removeEventListener("online", resync);
      window.removeEventListener("offline", offline);
      window.removeEventListener("pagehide", leave);
      document.removeEventListener("visibilitychange", visibility);
      void client.removeChannel(channel).finally(() => client.realtime.disconnect());
    };
  }, [session, attempt]);

  return { status, snapshot, pending, error, send, reconnect };
}
