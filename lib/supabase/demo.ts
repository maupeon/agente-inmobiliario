import "server-only";
import { AppError, ValidationError } from "@/lib/errors";
import { isRecord, validDisplayProperty } from "@/lib/api-validation";
import { readStoredMessage, validMessageCards } from "@/lib/message-validation";
import { getServerSupabase } from "./server";
import type { Conversation, Message, Property } from "@/types";

export function demoId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value)) throw new ValidationError("invalid demo id", "El identificador no es válido.");
  return value;
}
export function demoMessages(value: unknown): Message[] {
  if (!Array.isArray(value) || !value.length || value.length > 40) throw new ValidationError("invalid demo messages", "Guarda entre 1 y 40 mensajes por petición.");
  const ids = new Set<string>();
  return value.map((item) => {
    if (!isRecord(item) || !["user", "assistant"].includes(String(item.role))
      || typeof item.content !== "string" || item.content.length > 100_000
      || typeof item.createdAt !== "string" || !Number.isFinite(Date.parse(item.createdAt))) throw new ValidationError("invalid demo message", "El mensaje no tiene un formato válido.");
    const id = demoId(item.id);
    if (ids.has(id)) throw new ValidationError("duplicate message id", "Hay mensajes duplicados en la petición.");
    ids.add(id);
    if (!validMessageCards(item)) throw new ValidationError("invalid message cards", "El mensaje contiene una tarjeta con datos inválidos.");
    return readStoredMessage(item)!;
  });
}
function database() {
  const db = getServerSupabase();
  if (!db) throw new AppError({ code: "demo_storage_unavailable", message: "Supabase not configured", status: 503, userMessage: "No está disponible el almacenamiento compartido de la demo." });
  return db;
}
function checked(error: unknown) {
  if (error) throw new AppError({ code: "demo_storage_error", message: "Shared demo storage failed", cause: error, status: 503, userMessage: "No se ha podido acceder a Supabase. Vuelve a intentarlo." });
}
export async function listDemoConversations(): Promise<Conversation[]> {
  const { data, error } = await database().from("demo_conversations").select("id,title,preview,created_at,updated_at").order("updated_at", { ascending: false }).limit(50);
  checked(error);
  return (data ?? []).map((row) => ({ id: row.id, title: row.title, preview: row.preview, createdAt: row.created_at, updatedAt: row.updated_at }));
}
export async function loadDemoConversation(id: string): Promise<Message[]> {
  const db = database();
  const { data: conversation, error } = await db.from("demo_conversations").select("id").eq("id", id).maybeSingle();
  checked(error);
  if (!conversation) throw new AppError({ code: "not_found", message: "Demo conversation not found", status: 404, userMessage: "Esa conversación no está en el historial compartido." });
  const { data, error: messagesError } = await db.from("demo_messages").select("payload").eq("conversation_id", id).order("position", { ascending: false }).limit(200);
  checked(messagesError);
  return (data ?? []).reverse().map((row) => readStoredMessage(row.payload)).filter((message): message is Message => message !== null);
}
export async function saveDemoConversation(id: string, messages: Message[]): Promise<void> {
  const { error } = await database().rpc("save_demo_conversation", { p_id: id, p_messages: messages });
  checked(error);
}
export async function listDemoFavorites(): Promise<Property[]> {
  const { data, error } = await database().from("demo_favorites").select("property_data").order("created_at", { ascending: false }).limit(100);
  checked(error);
  return (data ?? []).map((row) => row.property_data).filter(validDisplayProperty);
}
export async function saveDemoFavorite(property: Property): Promise<void> {
  const { error } = await database().from("demo_favorites").upsert({ property_id: property.propertyCode, property_data: property }, { onConflict: "property_id" });
  checked(error);
}
export async function removeDemoFavorite(code: string): Promise<void> {
  const { error } = await database().from("demo_favorites").delete().eq("property_id", code);
  checked(error);
}
