"use client";

import { Check, Copy, DeviceMobile, LinkSimple, X } from "@phosphor-icons/react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePresentationHost } from "@/lib/presentation-remote/transport";
import { controllerUrl, isLoopbackHost } from "@/lib/presentation-remote/links";
import type { RemoteCommand, RemoteSnapshot } from "@/lib/presentation-remote/protocol";
import styles from "./remote-pairing.module.css";

export function PresentationRemote({ snapshot, onCommand, controlsVisible }: {
  snapshot: RemoteSnapshot;
  onCommand: (command: RemoteCommand) => void;
  controlsVisible: boolean;
}) {
  const remote = usePresentationHost({ snapshot, onCommand });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const manualOriginRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [origins, setOrigins] = useState<string[]>([]);
  const [local, setLocal] = useState(false);
  const [findingAddress, setFindingAddress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFallback, setCopyFallback] = useState(false);

  const show = useCallback(() => {
    if (dialogRef.current?.open) return;
    setOpen(true);
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey ||
        target?.closest("input, textarea, select, video, [contenteditable='true']") ||
        document.querySelector("dialog[open]") || event.key.toLowerCase() !== "m") return;
      event.preventDefault();
      show();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    if (!isLoopbackHost(window.location.hostname)) {
      setOrigin(window.location.origin);
      return;
    }
    setLocal(true);
    setFindingAddress(true);
    const abort = new AbortController();
    void fetch("/api/presentacion/conexion", { cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No address");
        const data = await response.json() as { origins?: unknown };
        const candidates = Array.isArray(data.origins)
          ? data.origins.filter((value): value is string => typeof value === "string") : [];
        if (abort.signal.aborted) return;
        setOrigins(candidates);
        setOrigin((current) => manualOriginRef.current ? current : candidates[0] || "");
      })
      .catch(() => {})
      .finally(() => { if (!abort.signal.aborted) setFindingAddress(false); });
    return () => abort.abort();
  }, [open]);

  useEffect(() => {
    if (remote.remoteConnected) dialogRef.current?.close();
  }, [remote.remoteConnected]);

  useEffect(() => {
    setCopied(false);
    setCopyFallback(false);
  }, [origin, remote.session]);

  let link = "";
  let addressError = "";
  if (origin) {
    try {
      const target = new URL(controllerUrl(origin, remote.session ?? "0".repeat(64)));
      if (isLoopbackHost(target.hostname) || target.hostname === "0.0.0.0" || target.hostname === "[::]") {
        addressError = "Usa la dirección de la computadora en tu red, no localhost.";
      } else if (remote.session) link = target.href;
    } catch {
      addressError = "Introduce una dirección http o https con su puerto, sin rutas adicionales.";
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyFallback(false);
    } catch {
      setCopyFallback(true);
      linkRef.current?.focus();
      linkRef.current?.select();
    }
  };

  return <>
    <button ref={triggerRef} type="button" className={styles.trigger} onClick={show} data-controls-visible={controlsVisible}
      aria-haspopup="dialog" aria-controls="phone-pairing" aria-label={remote.remoteConnected ? "Control con celular: conectado" : "Control con celular"} title="Control con celular (M)">
      <DeviceMobile aria-hidden />
      <span>{remote.remoteConnected ? "Celular conectado" : "Control con celular"}</span>
      {remote.remoteConnected && <i className={styles.connectedDot} aria-hidden />}
    </button>
    <dialog ref={dialogRef} id="phone-pairing" className={styles.dialog} aria-labelledby="phone-pairing-title"
      onClose={() => { setOpen(false); triggerRef.current?.focus({ preventScroll: true }); }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialogRef.current?.close();
      }}>
      <div className={styles.header}>
        <div><p className={styles.eyebrow}>Tu mando, a mano</p><h2 id="phone-pairing-title">Control con celular</h2></div>
        <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label="Cerrar control con celular"><X aria-hidden /></button>
      </div>
      {!remote.supported ? <div className={styles.body}>
        <p>El control con celular todavía no está configurado en esta instalación.</p>
        <p>La presentación sigue disponible con las flechas del teclado.</p>
      </div> : <div className={styles.body}>
        <p>Avanza las diapositivas y consulta tus notas y el tiempo desde tu celular.</p>
        {local && <p className={styles.networkHint}>Conecta ambos dispositivos a la misma red Wi-Fi y mantén acceso a internet.</p>}
        {findingAddress && <p role="status">Buscando la dirección de la computadora…</p>}
        {local && !findingAddress && <details className={styles.address} open={!origin || undefined}>
          <summary>Dirección para el celular</summary>
          {origins.length > 1 && <select aria-label="Red de la computadora" value={origins.includes(origin) ? origin : ""} onChange={(event) => { manualOriginRef.current = true; setOrigin(event.target.value); }}>
            <option value="" disabled>Elige una red</option>
            {origins.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>}
          <label htmlFor="remote-origin">Dirección de la computadora en tu red</label>
          <input id="remote-origin" type="url" value={origin} placeholder="http://192.168.1.20:3000" onChange={(event) => { manualOriginRef.current = true; setOrigin(event.target.value.trim()); }} spellCheck={false} autoCapitalize="none" aria-invalid={!!addressError} aria-describedby={addressError ? "remote-address-error" : undefined} />
          {addressError && <p id="remote-address-error" className={styles.error}>{addressError}</p>}
          <p>Si el QR no abre, comprueba la red elegida. Algunas redes de invitados impiden conectar dispositivos entre sí.</p>
        </details>}
        {!remote.session ? <button type="button" className={styles.primary} onClick={remote.start} disabled={findingAddress || !origin || !!addressError}>
          <DeviceMobile aria-hidden /> Vincular celular
        </button> : <>
          <p role="status" className={styles.status} data-connected={remote.remoteConnected}>
            <span aria-hidden /> {remote.remoteConnected ? "Celular conectado" : remote.status === "connected" ? "Escanea el QR con la cámara del celular" : remote.status === "error" ? "Conexión interrumpida" : "Preparando la conexión…"}
          </p>
          {link && remote.status === "connected" && !remote.remoteConnected && <div className={styles.qr}>
            <QRCodeSVG value={link} size={232} marginSize={4} level="M" bgColor="#ffffff" fgColor="#17211d" title="Escanea para controlar esta presentación" />
          </div>}
          {link && <div className={styles.linkSection}>
            <label htmlFor="phone-control-link"><LinkSimple aria-hidden /> Enlace del mando</label>
            <div className={styles.linkRow}>
              <input ref={linkRef} id="phone-control-link" readOnly value={link} onFocus={(event) => event.target.select()} />
              <button type="button" onClick={() => void copyLink()} aria-label={copied ? "Enlace copiado" : "Copiar enlace del mando"}>{copied ? <Check aria-hidden /> : <Copy aria-hidden />}</button>
            </div>
            {copied && <p role="status">Enlace copiado.</p>}
            {copyFallback && <p role="status">Enlace seleccionado. Cópialo con el teclado.</p>}
          </div>}
          <p className={styles.finePrint}>Este enlace permite controlar la presentación. Vincula tu celular antes de proyectar el QR. Al cerrar este panel, el mando sigue conectado.</p>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={remote.stop}>Desconectar</button>
            <button type="button" className={styles.primary} onClick={() => dialogRef.current?.close()}>Volver a la presentación</button>
          </div>
        </>}
        {remote.error && <p role="alert" className={styles.error}>{remote.error}</p>}
      </div>}
    </dialog>
  </>;
}
