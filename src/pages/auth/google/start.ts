import type { APIRoute } from 'astro';
import {
  buildGoogleAuthUrl,
  getGoogleOAuthClientId,
  getGoogleOAuthRedirectUri,
  randomState,
  sanitizeReturnTo
} from '../../../lib/google-auth';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  getCookieOptions,
  isHttpsRequest,
  signValue
} from '../../../lib/google-session';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const clientId = getGoogleOAuthClientId();
  if (!clientId) {
    return new Response(JSON.stringify({ ok: false, error: 'Defina GOOGLE_OAUTH_CLIENT_ID para autenticar.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const returnTo = sanitizeReturnTo(url.searchParams.get('returnTo'));
  const state = randomState();
  const redirectUri = getGoogleOAuthRedirectUri(request);

  cookies.set(
    GOOGLE_OAUTH_STATE_COOKIE,
    await signValue(JSON.stringify({ state, returnTo })),
    getCookieOptions(isHttpsRequest(request.url), 10 * 60)
  );

  return Response.redirect(buildGoogleAuthUrl(redirectUri, state), 302);
};
