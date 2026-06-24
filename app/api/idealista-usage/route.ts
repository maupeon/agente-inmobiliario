import { getIdealistaUsage } from "@/lib/idealista/usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Consumo del mes de la API de Idealista (para el badge de la barra). */
export async function GET() {
  const usage = await getIdealistaUsage();
  const mock = process.env.MOCK_IDEALISTA === "true";
  return Response.json({ ...usage, mock });
}
