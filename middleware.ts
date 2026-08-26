import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next conserva los segmentos no ASCII codificados al resolver rutas. La URL
 * pública mantiene la tilde, pero se sirve desde un segmento interno estable.
 */
export function middleware(request: NextRequest) {
  let pathname = request.nextUrl.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return NextResponse.next();
  }

  if (pathname === "/presentación" || pathname === "/presentación/") {
    const url = request.nextUrl.clone();
    url.pathname = "/presentacion";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
