/** No se aceptan identificadores de usuario sin una sesión autenticada. */
function localOnly() {
  return Response.json({ error: "Los favoritos se guardan solo en este navegador." }, { status: 410 });
}
export const GET = localOnly;
export const POST = localOnly;
export const DELETE = localOnly;
