import type { APIRoute } from 'astro';
import { listDriveChildren } from '../../../lib/google-drive';
import { GOOGLE_SESSION_COOKIE, verifySignedValue } from '../../../lib/google-session';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const sessionId = await verifySignedValue(cookies.get(GOOGLE_SESSION_COOKIE)?.value);
  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: 'Faça login com o Google para listar o Drive.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const folderId = url.searchParams.get('folderId') || '';
    if (!folderId) {
      return new Response(JSON.stringify({ ok: false, error: 'folderId é obrigatório.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const children = await listDriveChildren(sessionId, folderId);
    return new Response(JSON.stringify({ ok: true, ...children }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao listar o Drive.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
