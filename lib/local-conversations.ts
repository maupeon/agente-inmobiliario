import type { Conversation, Message } from "@/types";
const KEY = "habitia.conversations.local.v1";
export const CONVERSATIONS_CHANGED = "habitia-conversations-changed";
interface LocalConversation extends Conversation { messages: Message[] }
function read(): LocalConversation[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(data) ? data.filter((c) => c && typeof c.id === "string" && Array.isArray(c.messages)) : [];
  } catch { return []; }
}
export function listLocalConversations(): Conversation[] {
  return read().map(({ id, title, createdAt, updatedAt, preview }) => ({ id, title, createdAt, updatedAt, preview }));
}
export function loadLocalConversation(id: string): Message[] {
  return read().find((c) => c.id === id)?.messages ?? [];
}
export function saveLocalConversation(id: string, messages: Message[]): boolean {
  if (!messages.length) return true;
  const all = read();
  const existing = all.find((c) => c.id === id);
  const entry: LocalConversation = {
    id, title: messages.find((m) => m.role === "user")?.content.slice(0, 70) ?? "Conversación",
    createdAt: existing?.createdAt ?? messages[0].createdAt,
    updatedAt: new Date().toISOString(),
    preview: messages[messages.length - 1].content.slice(0, 120),
    messages: messages.slice(-40),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([entry, ...all.filter((c) => c.id !== id)].slice(0, 20)));
    window.dispatchEvent(new Event(CONVERSATIONS_CHANGED));
    return true;
  } catch { return false; }
}
export function clearLocalConversations(): void {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CONVERSATIONS_CHANGED));
}
