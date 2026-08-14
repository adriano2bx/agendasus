import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * O painel não utiliza Server Actions. Bloquear esse cabeçalho impede que
 * requisições externas malformadas sejam encaminhadas ao decodificador interno
 * do Next.js e evita ruído de erro nos logs de produção.
 */
export function proxy(request: NextRequest) {
  if (request.headers.has('next-action')) {
    return NextResponse.json(
      { message: 'Requisição não permitida.' },
      { status: 400 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next/static|_next/image|favicon.ico).*)'],
};
