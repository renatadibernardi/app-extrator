import type { APIRoute } from 'astro';
import { createDriveFolder } from '../../../lib/google-drive';
import { GOOGLE_SESSION_COOKIE, verifySignedValue } from '../../../lib/google-session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const sessionId = await verifySignedValue(cookies.get(GOOGLE_SESSION_COOKIE)?.value);
  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: 'Faça login com o Google para criar pasta no Drive.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parentId = String(body?.parentId || '').trim();
    const name = String(body?.name || '').trim();

    if (!parentId || !name) {
      return new Response(JSON.stringify({ ok: false, error: 'parentId e name são obrigatórios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const folder = await createDriveFolder(sessionId, parentId, name);
    return new Response(JSON.stringify({ ok: true, folder }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao criar pasta no Drive.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
