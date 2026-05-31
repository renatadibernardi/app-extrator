import type { APIRoute } from 'astro';
import { getGoogleAuthStatus } from '../../../../lib/google-drive';
import { GOOGLE_SESSION_COOKIE, verifySignedValue } from '../../../../lib/google-session';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const sessionId = verifySignedValue(cookies.get(GOOGLE_SESSION_COOKIE)?.value);
  const status = await getGoogleAuthStatus(sessionId);

  return new Response(JSON.stringify({
    authenticated: Boolean(status),
    userLabel: status?.userLabel || '',
    email: status?.email || ''
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
