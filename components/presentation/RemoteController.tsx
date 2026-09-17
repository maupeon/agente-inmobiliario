"use client";

import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Pause,
  Play,
  QrCode,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import {
  formatClock,
  MAIN_SCENE_COUNT,
  SCENES,
  TOTAL_SECONDS,
} from "@/lib/presentation-remote/slides";
import { usePresentationController } from "@/lib/presentation-remote/transport";
import type { RemoteCommand } from "@/lib/presentation-remote/protocol";
import styles from "./remote-controller.module.css";

type LinkState = "loading" | "valid" | "missing" | "invalid";

const STATUS_LABELS = {
  idle: "Sin vincular",
  connecting: "Conectando…",
  connected: "Conectado",
  reconnecting: "Reconectando…",
  error: "Sin conexión",
  ended: "Sesión cerrada",
} as const;

export function RemoteController() {
  const [session, setSession] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<LinkState>("loading");
  const [commandError, setCommandError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<HTMLDetailsElement>(null);
  const { status, snapshot, pending, error, send, reconnect } =
    usePresentationController(session);

  useEffect(() => {
    const readLink = () => {
      const token = window.location.hash.slice(1);
      const valid = /^[a-f0-9]{64}$/i.test(token);
      setSession(valid ? token.toLowerCase() : null);
      setLinkState(!token ? "missing" : valid ? "valid" : "invalid");
      setCommandError(null);
    };
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
    setCommandError(null);
  }, [snapshot?.active]);

  const scene = snapshot ? SCENES[snapshot.active] : null;
  const nextScene = snapshot ? SCENES[snapshot.active + 1] : null;
  const canControl = status === "connected" && !pending && !!scene;
  const disconnected = status !== "connected";
  const remaining = TOTAL_SECONDS - (snapshot?.elapsed ?? 0);
  const position = snapshot
    ? snapshot.active < MAIN_SCENE_COUNT
      ? `Diapositiva ${snapshot.active + 1} de ${MAIN_SCENE_COUNT}`
      : `Anexo ${snapshot.active - MAIN_SCENE_COUNT + 1} de ${SCENES.length - MAIN_SCENE_COUNT}`
    : "";

  const runCommand = async (command: RemoteCommand) => {
    if (!canControl) return false;
    setCommandError(null);
    const confirmed = await send(command);
    if (!confirmed) {
      setCommandError("La computadora no ha confirmado la orden. Comprueba la conexión antes de repetirla.");
    }
    return confirmed;
  };

  const jumpTo = async (index: number) => {
    if (!(await runCommand({ type: "go-to", index }))) return;
    if (indexRef.current) {
      indexRef.current.open = false;
      indexRef.current.querySelector("summary")?.focus({ preventScroll: true });
    }
  };

  return (
    <main className={styles.controller} aria-label="Mando de la presentación">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.brand}>
            <Logo variant="inline" className={styles.logo} />
            <span className={styles.brandLabel}>Mando de presentación</span>
          </div>
          <p
            className={styles.status}
            data-connected={status === "connected"}
            role="status"
          >
            <span className={styles.statusDot} aria-hidden="true" />
            {linkState === "loading" ? "Preparando…" : STATUS_LABELS[status]}
          </p>
        </div>
      </header>

      <div className={styles.content} ref={contentRef}>
        <div className={styles.contentInner}>
          {linkState === "loading" ? (
            <section className={styles.emptyState} aria-label="Preparando el mando">
              <p className={styles.eyebrow}>Control desde tu celular</p>
              <h1>Preparando el mando…</h1>
            </section>
          ) : linkState !== "valid" ? (
            <section className={styles.emptyState}>
              <QrCode size={40} weight="light" aria-hidden="true" />
              <p className={styles.eyebrow}>Control desde tu celular</p>
              <h1>{linkState === "invalid" ? "Este enlace no es válido" : "Tu presentación, a mano"}</h1>
              <p>
                {linkState === "invalid"
                  ? "Vuelve a escanear el QR que aparece en la computadora para vincular este celular."
                  : "Abre la presentación en tu computadora y pulsa «Control con celular». Escanea su código QR con la cámara de este celular."}
              </p>
              <ol className={styles.setupSteps}>
                <li><span>1</span> Abre «Control con celular» en la computadora.</li>
                <li><span>2</span> Escanea el QR y abre el enlace.</li>
                <li><span>3</span> Avanza, consulta tus notas y controla el tiempo.</li>
              </ol>
              <p className={styles.quiet}>Las diapositivas seguirán en la computadora. Tus notas estarán aquí.</p>
            </section>
          ) : (
            <>
              {disconnected && (
                <section className={styles.connectionNotice} aria-label="Estado de la conexión">
                  <p className={styles.noticeTitle}>
                    {status === "ended"
                      ? "La sesión del mando ha terminado"
                      : status === "error"
                        ? "No podemos conectar con la computadora"
                        : snapshot
                          ? "Recuperando la conexión"
                          : "Buscando tu presentación"}
                  </p>
                  <p>
                    {status === "ended"
                      ? "Abre «Control con celular» en la computadora y escanea su nuevo QR."
                      : snapshot
                        ? "Los datos muestran la última actualización recibida. Los controles se activarán al reconectar."
                        : "Mantén la presentación abierta en la computadora. Las diapositivas y el reloj aparecerán cuando se conecte."}
                  </p>
                  {error && <p className={styles.connectionError}>{error}</p>}
                  {(status === "error" || status === "reconnecting") && (
                    <button type="button" className={styles.reconnectButton} onClick={reconnect}>
                      <ArrowClockwise size={18} aria-hidden="true" />
                      Volver a conectar
                    </button>
                  )}
                </section>
              )}

              {scene && snapshot && (
                <>
                  <section className={styles.currentSlide} aria-labelledby="current-slide-title">
                    <div className={styles.sceneMeta}>
                      <p className={styles.eyebrow}>{scene.kicker}</p>
                      <p className={styles.slideCount}>{position}</p>
                    </div>
                    <h1 id="current-slide-title">{scene.title}</h1>
                  </section>
                  <p className={styles.srOnly} role="status" aria-atomic="true">
                    {position}. {scene.title}.
                  </p>

                  <section className={styles.timer} aria-label="Tiempo de la presentación">
                    <div className={styles.timerRow}>
                      <div className={styles.clockGroup}>
                        <span className={styles.clock}>{formatClock(snapshot.elapsed)}</span>
                        <span className={styles.clockCaption}>de {formatClock(TOTAL_SECONDS)}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.timerButton}
                        onClick={() => void runCommand({ type: "toggle-timer" })}
                        disabled={!canControl}
                        aria-label={snapshot.running ? "Pausar el reloj" : "Reanudar el reloj"}
                      >
                        {snapshot.running ? <Pause size={17} weight="fill" aria-hidden="true" /> : <Play size={17} weight="fill" aria-hidden="true" />}
                        {snapshot.running ? "Pausar" : "Reanudar"}
                      </button>
                    </div>
                    <progress
                      className={styles.timeProgress}
                      data-overtime={remaining < 0}
                      value={Math.min(snapshot.elapsed, TOTAL_SECONDS)}
                      max={TOTAL_SECONDS}
                      aria-label="Tiempo transcurrido"
                      aria-valuetext={`${formatClock(snapshot.elapsed)} de ${formatClock(TOTAL_SECONDS)}`}
                    />
                    <div className={styles.timerCaption}>
                      <span data-overtime={remaining < 0}>
                        {remaining < 0 ? `${formatClock(-remaining)} de tiempo extra` : `Quedan ${formatClock(remaining)}`}
                      </span>
                      <span>{disconnected ? "Sin actualizar" : snapshot.running ? "En marcha" : "En pausa"}</span>
                    </div>
                  </section>

                  {snapshot.videoAvailable && (
                    <section className={styles.videoControl} aria-label="Vídeo de la demostración">
                      <div>
                        <p className={styles.videoTitle}>Vídeo de la demo</p>
                        <p className={styles.quiet}>{snapshot.videoPlaying ? "Reproduciendo en la computadora" : "Pausado en la computadora"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void runCommand({ type: "toggle-video" })}
                        className={styles.videoButton}
                        disabled={!canControl}
                        aria-label={snapshot.videoPlaying ? "Pausar el vídeo" : "Reproducir el vídeo"}
                      >
                        {snapshot.videoPlaying ? <Pause size={22} weight="fill" aria-hidden="true" /> : <Play size={22} weight="fill" aria-hidden="true" />}
                      </button>
                    </section>
                  )}
                  {snapshot.videoError && <p className={styles.actionError} role="alert">{snapshot.videoError}</p>}

                  <section className={styles.notes} aria-labelledby="notes-title">
                    <div className={styles.notesHeading}>
                      <h2 id="notes-title">Tus notas</h2>
                      <span>Solo en tu celular</span>
                    </div>
                    <p>{scene.note}</p>
                  </section>

                  <details className={styles.slideIndex} ref={indexRef}>
                    <summary>
                      <span>Ir a una diapositiva</span>
                      <span className={styles.indexTotal}>{SCENES.length} <CaretDown size={17} aria-hidden="true" /></span>
                    </summary>
                    <ol>
                      {SCENES.map((item, index) => (
                        <li key={item.kicker}>
                          {index === MAIN_SCENE_COUNT && <p className={styles.annexLabel}>Anexos</p>}
                          <button
                            type="button"
                            onClick={() => void jumpTo(index)}
                            disabled={!canControl || index === snapshot.active}
                            aria-current={index === snapshot.active ? "step" : undefined}
                          >
                            <span className={styles.indexNumber}>{index < MAIN_SCENE_COUNT ? String(index + 1).padStart(2, "0") : `A${index - MAIN_SCENE_COUNT + 1}`}</span>
                            <span>{item.title}</span>
                            {index === snapshot.active && <span className={styles.currentLabel}>Actual</span>}
                          </button>
                        </li>
                      ))}
                    </ol>
                  </details>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {linkState === "valid" && (
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            {(commandError || (status === "connected" && error)) && (
              <p className={styles.actionError} role="alert">{commandError || error}</p>
            )}
            <p className={styles.nextPreview}>
              <span>{scene ? nextScene ? "Después" : "Final del recorrido" : "Esperando conexión"}</span>
              {nextScene && <strong>{nextScene.title}</strong>}
            </p>
            <div className={styles.navigation} aria-label="Cambiar diapositiva" aria-busy={pending}>
              <button
                type="button"
                className={styles.previous}
                onClick={() => void runCommand({ type: "previous" })}
                disabled={!canControl || snapshot?.active === 0}
              >
                <ArrowLeft size={22} aria-hidden="true" />
                Anterior
              </button>
              <button
                type="button"
                className={styles.next}
                onClick={() => void runCommand({ type: "next" })}
                disabled={!canControl || !nextScene}
              >
                Siguiente
                <ArrowRight size={24} aria-hidden="true" />
              </button>
            </div>
          </div>
        </footer>
      )}
    </main>
  );
}
