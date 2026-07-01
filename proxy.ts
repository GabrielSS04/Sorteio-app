import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (antigo Middleware). Checagem OTIMISTA de autenticação:
 * se a rota for do painel e não houver cookie de sessão, redireciona para o login.
 * A verificação real (assinatura + existência do admin) é feita no DAL / nas
 * Server Actions — nunca confie só nisto.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";
  const hasSession = Boolean(request.cookies.get("session")?.value);

  if (!isLogin && !hasSession) {
    const url = new URL("/admin/login", request.url);
    return NextResponse.redirect(url);
  }

  // Já logado tentando ver o login -> manda pro painel.
  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
