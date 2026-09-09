import { isRecord } from "@/lib/api-validation";
import { DEMO_HEADERS, readDemoWrite } from "@/lib/demo-api";
import { handleError, ValidationError } from "@/lib/errors";
import { demoId, demoMessages, listDemoConversations, loadDemoConversation, saveDemoConversation } from "@/lib/supabase/demo";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    return Response.json(id ? { messages: await loadDemoConversation(demoId(id)) } : { conversations: await listDemoConversations() }, { headers: DEMO_HEADERS });
  } catch (error) {
    const e = handleError(error, { route: "demo conversations" });
    return Response.json({ error: e.userMessage }, { status: e.status, headers: DEMO_HEADERS });
  }
}
export async function POST(req: Request) {
  try {
    const body = await readDemoWrite(req, 1_500_000);
    if (!isRecord(body)) throw new ValidationError("invalid conversation");
    await saveDemoConversation(demoId(body.id), demoMessages(body.messages));
    return Response.json({ saved: true }, { headers: DEMO_HEADERS });
  } catch (error) {
    const e = handleError(error, { route: "save demo conversation" });
    return Response.json({ error: e.userMessage }, { status: e.status, headers: DEMO_HEADERS });
  }
}
