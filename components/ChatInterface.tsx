"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { List } from "@phosphor-icons/react";
import { useChat } from "@/hooks/useChat";
import { useFavorites } from "@/hooks/useFavorites";
import { useProfile } from "@/hooks/useProfile";
import { Sidebar } from "./Sidebar";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyState } from "./EmptyState";
import { Onboarding } from "./Onboarding";
import { Logo } from "./ui/Logo";
import type { Conversation } from "@/types";

export function ChatInterface() {
  const { profile, loaded, save } = useProfile();
  const chat = useChat({ profile });
  const favs = useFavorites();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [skippedOnboarding, setSkippedOnboarding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !shouldFollowRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [chat.messages, chat.agentState]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((data: { conversations?: Conversation[] }) => {
        if (!cancelled) setConversations(data.conversations ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [chat.conversationId]);

  const submit = () => {
    const text = input;
    if (!text.trim()) return;
    setInput("");
    void chat.send(text);
  };

  const isEmpty = chat.messages.length === 0;
  const onboardingVisible =
    loaded && isEmpty && (showOnboarding || (!profile && !skippedOnboarding));
  const lastAssistant = [...chat.messages].reverse().find((m) => m.role === "assistant");
  const lastIsEmpty =
    !lastAssistant ||
    (!lastAssistant.content && (lastAssistant.toolCalls?.length ?? 0) === 0);
  const streamingAssistantId =
    chat.isStreaming && lastAssistant ? lastAssistant.id : null;

  return (
    <div className="relative z-10 flex min-h-[100dvh]">
      <Sidebar
        conversations={conversations}
        activeConversationId={chat.conversationId}
        favorites={favs.favorites}
        onNewChat={() => {
          shouldFollowRef.current = true;
          chat.reset();
          setSidebarOpen(false);
        }}
        onSelectConversation={(id) => {
          shouldFollowRef.current = true;
          void chat.loadConversation(id);
          setSidebarOpen(false);
        }}
        onRemoveFavorite={(p) => favs.toggleFavorite(p)}
        open={sidebarOpen}
        onClose={closeSidebar}
      />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Topbar móvil */}
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-white/70 bg-paper/80 px-5 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="pressable grid h-11 w-11 place-items-center rounded-xl border border-hairline bg-paper-50 text-ink-700"
            aria-label="Abrir menú"
          >
            <List size={15} weight="bold" />
          </button>
          <Logo variant="inline" className="text-[1rem]" />
          <div className="w-11" />
        </header>

        {/* Cuerpo */}
        <div
          ref={scrollRef}
          onScroll={(event) => {
            const el = event.currentTarget;
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            shouldFollowRef.current = distanceFromBottom <= 160;
          }}
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-[960px] px-5 pb-32 pt-12 sm:px-8 lg:px-12 lg:pt-20">
            {onboardingVisible ? (
              <Onboarding
                initial={profile}
                onComplete={(p) => {
                  save(p);
                  setShowOnboarding(false);
                  setSkippedOnboarding(false);
                }}
                onSkip={() => {
                  setShowOnboarding(false);
                  setSkippedOnboarding(true);
                }}
              />
            ) : isEmpty ? (
              <EmptyState
                profile={profile}
                onEditProfile={() => setShowOnboarding(true)}
                onPick={(prompt) => {
                  setInput("");
                  void chat.send(prompt);
                }}
              />
            ) : (
              <div className="space-y-10">
                {chat.messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    isStreaming={m.id === streamingAssistantId}
                    isFavorite={(c) => favs.isFavorite(c)}
                    onToggleFavorite={(p) => favs.toggleFavorite(p)}
                  />
                ))}
                {chat.isStreaming && lastIsEmpty && (
                  <div className="ml-[18px]">
                    <TypingIndicator
                      mode={chat.agentState === "searching" ? "searching" : "thinking"}
                      toolLabel={chat.activeTool ?? undefined}
                    />
                  </div>
                )}
                {chat.error && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-50 p-4 text-sm">
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-rose-500">
                      Hubo un fallo
                    </p>
                    <p className="mt-1 text-ink-700">{chat.error}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Composer pegado abajo, con difuminado superior hacia el paper */}
        <div className="pointer-events-none sticky bottom-0 z-10">
          <div className="pointer-events-none h-12 bg-gradient-to-t from-paper to-transparent" />
          <div className="pointer-events-auto bg-paper/90 px-5 pb-6 pt-3 backdrop-blur sm:px-8 lg:px-12">
            <div className="mx-auto w-full max-w-[960px]">
              <Composer
                value={input}
                onChange={setInput}
                onSubmit={submit}
                onStop={chat.stop}
                isStreaming={chat.isStreaming}
              />
              <p className="mt-3 text-center text-[11px] leading-relaxed text-stone">
                Enter envía · Shift + Enter salta de línea
                <span className="mx-2 text-hairline-strong">·</span>
                La IA puede equivocarse — verifica los anuncios en Idealista
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
