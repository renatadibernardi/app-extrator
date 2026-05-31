import type { APIRoute } from 'astro';
import { uploadDriveText } from '../../../lib/google-drive';
import { GOOGLE_SESSION_COOKIE, verifySignedValue } from '../../../lib/google-session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const sessionId = await verifySignedValue(cookies.get(GOOGLE_SESSION_COOKIE)?.value);
  if (!sessionId) {
    return new Response(JSON.stringify({ ok: false, error: 'Faça login com o Google para enviar ao Drive.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const folderId = String(body?.folderId || '').trim();
    const name = String(body?.name || '').trim();
    const content = String(body?.content || '');
    const mimeType = String(body?.mimeType || 'text/markdown; charset=UTF-8');

    if (!folderId || !name) {
      return new Response(JSON.stringify({ ok: false, error: 'folderId e name são obrigatórios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const file = await uploadDriveText(sessionId, { folderId, name, content, mimeType });
    return new Response(JSON.stringify({ ok: true, file }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Falha ao enviar arquivo ao Drive.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
