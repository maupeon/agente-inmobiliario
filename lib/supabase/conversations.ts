import { SupabaseError } from "@/lib/errors";
import type { Conversation, Message } from "@/types";
import { getServerSupabase } from "./server";

/**
 * Crea o actualiza una conversación junto con sus mensajes nuevos.
 * Si Supabase no está configurado, no hace nada (no rompe el flujo del chat).
 */
export async function persistTurn(opts: {
  conversationId?: string;
  userId?: string | null;
  userMessage: Message;
  assistantMessage: Message;
}): Promise<{ conversationId: string } | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;

  let id = opts.conversationId;

  try {
    if (!id) {
      const title = opts.userMessage.content.slice(0, 64);
      const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: opts.userId ?? null, title })
        .select("id")
        .single();
      if (error) throw error;
      id = data.id as string;
    } else {
      // Toca updated_at vía trigger.
      await supabase.from("conversations").update({}).eq("id", id);
    }

    const rows = [
      {
        conversation_id: id,
        role: "user" as const,
        content: opts.userMessage.content,
      },
      {
        conversation_id: id,
        role: "assistant" as const,
        content: opts.assistantMessage.content,
        tool_input: opts.assistantMessage.toolCalls
          ? JSON.parse(JSON.stringify(opts.assistantMessage.toolCalls))
          : null,
      },
    ];

    const { error: msgErr } = await supabase.from("messages").insert(rows);
    if (msgErr) throw msgErr;

    return { conversationId: id! };
  } catch (err) {
    throw new SupabaseError("persistTurn failed", { cause: err });
  }
}

export async function listConversations(userId?: string | null): Promise<Conversation[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const query = supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20);

  if (userId) query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw new SupabaseError("listConversations failed", { cause: error });

  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: (row.title as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, tool_input, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new SupabaseError("getConversationMessages failed", { cause: error });

  return (data ?? [])
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => ({
      id: row.id as string,
      role: row.role as "user" | "assistant",
      content: row.content as string,
      createdAt: row.created_at as string,
    }));
}
