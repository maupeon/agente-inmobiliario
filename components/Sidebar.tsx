"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MapTrifold, Plus, X } from "@phosphor-icons/react";
import { Logo } from "./ui/Logo";
import { FavoritesList } from "./FavoritesList";
import { cn, timeAgo } from "@/lib/utils";
import type { Conversation, Property } from "@/types";

/**
 * Panel lateral en lenguaje "Swiss Industrial Print" (variante light):
 *  - tipografía mono uppercase con tracking generoso,
 *  - hairlines de 1px y separadores punteados,
 *  - cero border-radius,
 *  - rojo aviación (#E61919) como único acento, exclusivo del estado activo.
 *
 * Vive aislado del resto del chat (que sigue editorial) mediante la clase
 * `.brutalist-*` definida en `globals.css`.
 */
export function Sidebar({
  conversations,
  activeConversationId,
  favorites,
  onNewChat,
  onSelectConversation,
  onRemoveFavorite,
  open,
  onClose,
}: {
  conversations: Conversation[];
  activeConversationId: string | null;
  favorites: Property[];
  onNewChat: () => void;
  onSelectConversation?: (id: string) => void;
  onRemoveFavorite?: (p: Property) => void;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Se inicializa al placeholder del servidor para que el primer render del
  // cliente coincida con el HTML SSR; el id real se genera tras el montaje.
  const [sessionId, setSessionId] = useState("S-0000-0000");
  useEffect(() => {
    setSessionId(makeSessionId());
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar panel lateral"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "brutalist-shell fixed inset-y-0 left-0 z-40 flex w-[288px] flex-col overflow-hidden border-r-2 border-ink px-4 pb-4 pt-5 transition-transform duration-300 ease-editorial lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header brutalist con identidad + meta de sesión */}
        <header className="flex items-start justify-between gap-3 border-b-2 border-ink pb-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-ink-700">
              [ A · I ]
            </p>
            <Logo
              variant="stack"
              className="mt-1 text-[1.4rem]"
              highlightClassName="text-ink"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center border border-ink text-ink hover:bg-ink hover:text-paper lg:hidden"
            aria-label="Cerrar"
          >
            <X size={13} weight="bold" />
          </button>
        </header>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.16em] text-stone">
          <dt className="text-mist">Sesión</dt>
          <dd className="text-right tabular text-ink">{sessionId}</dd>
          <dt className="text-mist">Modelo</dt>
          <dd className="text-right text-ink">opus 4·6</dd>
          <dt className="text-mist">Build</dt>
          <dd className="text-right text-ink">tfm · 06</dd>
        </dl>

        <button
          type="button"
          onClick={onNewChat}
          className="mt-5 flex items-center justify-between border border-ink bg-ink px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-paper transition hover:bg-paper hover:text-ink active:translate-y-[1px]"
        >
          <span>&gt; Nueva sesión</span>
          <Plus size={11} weight="bold" />
        </button>

        <Link
          href="/dashboard"
          onClick={onClose}
          className="mt-2 flex items-center justify-between border border-ink px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink transition hover:bg-ink hover:text-paper active:translate-y-[1px]"
        >
          <span>&gt; Panel · Mapa</span>
          <MapTrifold size={12} weight="bold" />
        </Link>

        <Link
          href="/como-funciona"
          onClick={onClose}
          className="mt-2 flex items-center justify-between border border-ink/40 px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-700 transition hover:border-ink hover:text-ink active:translate-y-[1px]"
        >
          <span>&gt; Cómo funciona</span>
        </Link>

        {/* Sección historial */}
        <BrutalistSection title="Historial" code="01">
          {conversations.length === 0 ? (
            <p className="border border-dashed border-ink/40 px-3 py-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-stone">
              {"[ sin registros ]"}
              <br />
              {"////  inicia una sesión"}
            </p>
          ) : (
            <ul className="-mx-1">
              {conversations.map((c, i) => (
                <li key={c.id} className="border-b border-ink/15 last:border-b-0">
                  <ConversationRow
                    conversation={c}
                    index={i}
                    active={activeConversationId === c.id}
                    onClick={() => onSelectConversation?.(c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </BrutalistSection>

        {/* Sección favoritos */}
        <BrutalistSection title="Favoritos" code="02">
          <div className="font-sans text-sm normal-case tracking-normal text-ink-700">
            <FavoritesList favorites={favorites} onRemove={onRemoveFavorite} />
          </div>
        </BrutalistSection>

        {/* Footer telemetry */}
        <footer className="mt-auto border-t-2 border-ink pt-4">
          <div className="brutalist-rule mb-3" />
          <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[0.22em] text-ink-700">
            {"////  fuente · idealista"}
            <br />
            {"////  mercado · ine + bde"}
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-stone">
            unit / d-01  ·  rev 2.6
          </p>
        </footer>
      </aside>
    </>
  );
}

function BrutalistSection({
  title,
  code,
  children,
}: {
  title: string;
  code: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-6 border-t border-ink pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-ink transition hover:text-stone"
      >
        <span>
          [ {code} ] {title}
        </span>
        <span className="text-ink">{open ? "[−]" : "[+]"}</span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-editorial",
          open ? "mt-3 grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  index,
  active,
  onClick,
}: {
  conversation: Conversation;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const date = new Date(conversation.updatedAt);
  const stamp = `${pad(date.getDate())}.${pad(date.getMonth() + 1)} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "brutalist-row group relative block w-full overflow-hidden px-3 py-2.5 text-left",
        active && "is-active brutalist-sweep"
      )}
    >
      <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-stone group-[.is-active]:text-paper/70">
        <span className="tabular">
          {pad(index + 1)} · {stamp}
        </span>
        <span className="hazard tabular text-mist group-[.is-active]:text-paper/70">
          {timeAgo(conversation.updatedAt)}
        </span>
      </div>
      <p className="mt-1 line-clamp-1 font-mono text-[12px] uppercase tracking-[0.14em] text-ink group-[.is-active]:text-paper">
        &gt; {conversation.title || "sin título"}
      </p>
    </button>
  );
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Identificador de sesión efímero (no se persiste). Solo decoración para que
 * el panel se sienta como una terminal de telemetría real.
 */
function makeSessionId(): string {
  if (typeof window === "undefined") return "S-0000-0000";
  // Determinístico por sesión de pestaña.
  const w = window as unknown as { __aiSession?: string };
  if (w.__aiSession) return w.__aiSession;
  const a = Math.floor(1000 + Math.random() * 9000);
  const b = Math.floor(1000 + Math.random() * 9000);
  const id = `S-${a}-${b}`;
  w.__aiSession = id;
  return id;
}
