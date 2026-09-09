import type { Conversation, Message } from "@/types";
export const DEMO_CONVERSATIONS_CHANGED = "habitia-demo-conversations-changed";
export const DEMO_FAVORITES_CHANGED = "habitia-demo-favorites-changed";

export async function demoRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(15_000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "No se ha podido acceder a los datos compartidos.");
  return data as T;
}
export async function listSharedConversations(): Promise<Conversation[]> {
  return (await demoRequest<{ conversations: Conversation[] }>("/api/conversations")).conversations;
}
export async function loadSharedConversation(id: string): Promise<Message[]> {
  return (await demoRequest<{ messages: Message[] }>(`/api/conversations?id=${encodeURIComponent(id)}`)).messages;
}
export async function saveSharedConversation(id: string, messages: Message[]): Promise<void> {
  await demoRequest("/api/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, messages: messages.slice(-40) }) });
  window.dispatchEvent(new Event(DEMO_CONVERSATIONS_CHANGED));
}
