import { NextRequest } from "next/server";
import { listConversations, getConversationMessages } from "@/lib/supabase/conversations";
import { handleError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const conversationId = req.nextUrl.searchParams.get("id");

  try {
    if (conversationId) {
      const messages = await getConversationMessages(conversationId);
      return Response.json({ messages });
    }
    const conversations = await listConversations(userId);
    return Response.json({ conversations });
  } catch (err) {
    const handled = handleError(err, { route: "GET /api/conversations" });
    return Response.json(
      { error: handled.userMessage },
      { status: handled.status }
    );
  }
}
