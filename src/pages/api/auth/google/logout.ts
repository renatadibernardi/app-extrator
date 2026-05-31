import type { APIRoute } from 'astro';
import { GOOGLE_SESSION_COOKIE, deleteGoogleSession, verifySignedValue } from '../../../../lib/google-session';
import { setGoogleRuntimeEnv } from '../../../../lib/runtime-env';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  setGoogleRuntimeEnv(locals);

  const sessionId = await verifySignedValue(cookies.get(GOOGLE_SESSION_COOKIE)?.value);
  if (sessionId) {
    await deleteGoogleSession(sessionId);
  }

  cookies.delete(GOOGLE_SESSION_COOKIE, { path: '/' });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
