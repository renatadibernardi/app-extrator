export const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
export const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const GOOGLE_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid'
].join(' ');

let runtimeEnv: Record<string, string | undefined> = {};

export function setGoogleAuthEnv(env: Record<string, string | undefined> | undefined) {
  runtimeEnv = env || {};
}

function getEnvVariable(name: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return runtimeEnv[name] || globalThis.process?.env?.[name] || env[name] || '';
}

export function getGoogleOAuthClientId(): string {
  return getEnvVariable('GOOGLE_OAUTH_CLIENT_ID') || getEnvVariable('PUBLIC_GOOGLE_OAUTH_CLIENT_ID');
}

export function getGoogleOAuthClientSecret(): string {
  return getEnvVariable('GOOGLE_OAUTH_CLIENT_SECRET');
}

export function buildGoogleAuthUrl(redirectUri: string, state: string) {
  const url = new URL(GOOGLE_AUTHORIZATION_URL);
  url.searchParams.set('client_id', getGoogleOAuthClientId());
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  return url.toString();
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    code,
    client_id: getGoogleOAuthClientId(),
    client_secret: getGoogleOAuthClientSecret(),
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error_description === 'string' ? data.error_description : 'Falha ao trocar código OAuth.';
    throw new Error(message);
  }

  return data as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
    id_token?: string;
  };
}

export async function refreshGoogleToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: getGoogleOAuthClientId(),
    client_secret: getGoogleOAuthClientSecret(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error_description === 'string' ? data.error_description : 'Falha ao renovar token OAuth.';
    throw new Error(message);
  }

  return data as {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

export async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return { label: 'Google Drive' };
  }

  const data = await response.json().catch(() => ({}));
  const label = data?.name || data?.email || 'Google Drive';
  return {
    label: String(label)
  };
}

export function getAppBasePath(): string {
  const base = String(import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  return base === '/' ? '' : base;
}

export function withAppBase(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${getAppBasePath()}${path}`;
}

export function sanitizeReturnTo(value: string | null | undefined): string {
  const candidate = String(value || '').trim();
  if (!candidate.startsWith('/')) {
    return withAppBase('/doc-md');
  }
  return candidate;
}

export function getGoogleOAuthRedirectUri(request: Request): string {
  const requestUrl = new URL(request.url);
  const defaultUrl = new URL(request.url);
  defaultUrl.pathname = withAppBase('/auth/google/callback');
  defaultUrl.search = '';
  defaultUrl.hash = '';

  const explicit = getEnvVariable('GOOGLE_OAUTH_REDIRECT_URI');
  if (explicit) {
    try {
      const explicitUrl = new URL(explicit);
      if (explicitUrl.host === requestUrl.host) {
        return explicitUrl.toString();
      }
    } catch {}
  }

  return defaultUrl.toString();
}

export function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
