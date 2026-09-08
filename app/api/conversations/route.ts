/** La demo almacena el historial exclusivamente en el navegador. */
export async function GET() {
  return Response.json({ error: "El historial se guarda solo en este navegador." }, { status: 410 });
}
