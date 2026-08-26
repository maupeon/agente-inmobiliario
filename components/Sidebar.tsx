"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CaretDown,
  Database,
  Info,
  MapTrifold,
  Plus,
  X,
} from "@phosphor-icons/react";
import { cn, timeAgo } from "@/lib/utils";
import type { Conversation, Property } from "@/types";
import { FavoritesList } from "./FavoritesList";
import { IdealistaUsageBadge } from "./IdealistaUsageBadge";
import { Logo } from "./ui/Logo";

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
  onRemoveFavorite?: (property: Property) => void;
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 1023px)").matches) return;

    const panel = panelRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [onClose, open]);

  return (
    <>
      <button
        type="button"
        aria-label="Cerrar navegación"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm transition lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        ref={panelRef}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Navegación del asistente"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col overflow-hidden border-r border-hairline bg-paper-50/95 px-4 pb-4 pt-4 shadow-lift backdrop-blur-xl transition-transform duration-300 ease-editorial lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <header className="flex min-h-12 items-center justify-between gap-3 px-1">
          <Link href="/" aria-label="HabitIA, inicio" className="pressable rounded-lg py-2">
            <Logo variant="inline" className="text-xl" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hairline text-stone hover:border-saffron-300 hover:text-ink lg:hidden"
            aria-label="Cerrar"
          >
            <X aria-hidden size={18} weight="bold" />
          </button>
        </header>

        <button
          type="button"
          onClick={onNewChat}
          className="pressable mt-4 flex min-h-12 items-center justify-between rounded-xl bg-ink px-4 text-sm font-medium text-paper shadow-lift hover:bg-ink-700"
        >
          Nueva conversación
          <Plus aria-hidden size={16} weight="bold" className="text-saffron-300" />
        </button>

        <Link
          href="/dashboard"
          onClick={onClose}
          className="pressable mt-2 flex min-h-12 items-center justify-between rounded-xl border border-hairline bg-paper px-4 text-sm font-medium text-ink hover:border-saffron-300"
        >
          Buscar viviendas
          <MapTrifold aria-hidden size={17} weight="duotone" className="text-saffron-700" />
        </Link>

        <div className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
          <SidebarSection title="Conversaciones" count={conversations.length}>
            {conversations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-hairline-strong px-3 py-4 text-sm leading-relaxed text-stone">
                Tus conversaciones aparecerán aquí cuando empieces a preguntar.
              </p>
            ) : (
              <ul className="space-y-1">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <ConversationRow
                      conversation={conversation}
                      active={activeConversationId === conversation.id}
                      onClick={() => onSelectConversation?.(conversation.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>

          <SidebarSection title="Guardados" count={favorites.length}>
            <FavoritesList favorites={favorites} onRemove={onRemoveFavorite} />
          </SidebarSection>
        </div>

        <footer className="mt-4 space-y-1 border-t border-hairline pt-3">
          <div className="px-2 pb-2">
            <IdealistaUsageBadge />
          </div>
          <Link
            href="/como-funciona"
            onClick={onClose}
            className="pressable flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-stone-600 hover:bg-paper-200 hover:text-ink"
          >
            <Info aria-hidden size={15} /> Cómo funciona
          </Link>
          <Link
            href="/datos"
            onClick={onClose}
            className="pressable flex min-h-10 items-center gap-2 rounded-lg px-2 text-xs font-medium text-stone-600 hover:bg-paper-200 hover:text-ink"
          >
            <Database aria-hidden size={15} /> Datos y fuentes
          </Link>
          <p className="px-2 pt-2 text-[11px] leading-relaxed text-stone">
            HabitIA puede equivocarse. Confirma la disponibilidad y los datos en el anuncio.
          </p>
        </footer>
      </aside>
    </>
  );
}

function SidebarSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(true);
  const id = `sidebar-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section className="border-t border-hairline pt-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
        className="pressable flex min-h-10 w-full items-center justify-between rounded-lg px-2 text-sm font-semibold text-ink hover:bg-paper-200"
      >
        <span>
          {title} <span className="ml-1 text-xs font-normal text-stone">{count}</span>
        </span>
        <CaretDown
          aria-hidden
          size={15}
          weight="bold"
          className={cn("text-stone transition-transform", !expanded && "-rotate-90")}
        />
      </button>
      <div id={id} hidden={!expanded} className="mt-2">
        {children}
      </div>
    </section>
  );
}

function ConversationRow({
  conversation,
  active,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "pressable block min-h-12 w-full rounded-xl px-3 py-2.5 text-left",
        active ? "bg-saffron-50 text-saffron-700" : "text-ink hover:bg-paper-200"
      )}
    >
      <span className="block line-clamp-1 text-sm font-medium">
        {conversation.title || "Conversación sin título"}
      </span>
      <span className="mt-0.5 block text-xs text-stone">{timeAgo(conversation.updatedAt)}</span>
    </button>
  );
}
