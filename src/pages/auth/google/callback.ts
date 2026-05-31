import type { APIRoute } from 'astro';
import { exchangeGoogleCode, fetchGoogleProfile, sanitizeReturnTo, getGoogleOAuthRedirectUri, withAppBase } from '../../../lib/google-auth';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_SESSION_COOKIE,
  createGoogleSession,
  getCookieOptions,
  isHttpsRequest,
  signValue,
  verifySignedValue
} from '../../../lib/google-session';
import { setGoogleRuntimeEnv } from '../../../lib/runtime-env';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, locals }) => {
  setGoogleRuntimeEnv(locals);

  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const stateCookie = await verifySignedValue(cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value);
  let returnTo = withAppBase('/doc-md');

  if (stateCookie) {
    try {
      const payload = JSON.parse(stateCookie) as { state?: string; returnTo?: string };
      returnTo = sanitizeReturnTo(payload.returnTo);
      if (!state || payload.state !== state) {
        return new Response('Estado OAuth inválido.', { status: 400 });
      }
    } catch {
      return new Response('Estado OAuth inválido.', { status: 400 });
    }
  } else {
    return new Response('Estado OAuth inválido.', { status: 400 });
  }

  cookies.delete(GOOGLE_OAUTH_STATE_COOKIE, { path: '/' });

  if (error) {
    return Response.redirect(new URL(`${returnTo}?googleLogin=error`, request.url).toString(), 302);
  }

  if (!code) {
    return new Response('Código OAuth ausente.', { status: 400 });
  }

  const redirectUri = getGoogleOAuthRedirectUri(request);
  const token = await exchangeGoogleCode(code, redirectUri);
  if (!token.access_token) {
    return new Response('Não foi possível obter o access token.', { status: 500 });
  }

  const profile = await fetchGoogleProfile(token.access_token);
  const sessionId = await createGoogleSession({
    accessToken: token.access_token,
    refreshToken: token.refresh_token || undefined,
    expiryDate: token.expires_in ? Date.now() + Number(token.expires_in) * 1000 : undefined,
    userLabel: profile.label,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  cookies.set(
    GOOGLE_SESSION_COOKIE,
    await signValue(sessionId),
    getCookieOptions(isHttpsRequest(request.url), 60 * 60 * 24 * 30)
  );

  return Response.redirect(new URL(`${returnTo}?googleLogin=success`, request.url).toString(), 302);
};
