export const GOOGLE_SESSION_COOKIE = 'ncs_google_session';
export const GOOGLE_OAUTH_STATE_COOKIE = 'ncs_google_oauth_state';

export type GoogleSessionRecord = {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  userLabel: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

let runtimeEnv: Record<string, string | undefined> = {};

export function setGoogleSessionEnv(env: Record<string, string | undefined> | undefined) {
  runtimeEnv = env || {};
}

function getSecret(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (
    runtimeEnv.GOOGLE_SESSION_SECRET ||
    runtimeEnv.SESSION_SECRET ||
    globalThis.process?.env?.GOOGLE_SESSION_SECRET ||
    globalThis.process?.env?.SESSION_SECRET ||
    env.GOOGLE_SESSION_SECRET ||
    env.SESSION_SECRET ||
    'ncs-studio-google-session-secret'
  );
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function encodeJson(value: unknown): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as T;
  } catch {
    return null;
  }
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function signValue(value: string): Promise<string> {
  return `${value}.${await hmac(value)}`;
}

export async function verifySignedValue(signedValue: string | null | undefined): Promise<string | null> {
  if (!signedValue) return null;
  const idx = signedValue.lastIndexOf('.');
  if (idx <= 0) return null;
  const value = signedValue.slice(0, idx);
  const signature = signedValue.slice(idx + 1);
  const expected = await hmac(value);
  return signature === expected ? value : null;
}

export async function getGoogleSession(sessionId: string): Promise<GoogleSessionRecord | null> {
  return decodeJson<GoogleSessionRecord>(sessionId);
}

export async function createGoogleSession(record: GoogleSessionRecord): Promise<string> {
  return encodeJson(record);
}

export async function updateGoogleSession(sessionId: string, patch: Partial<GoogleSessionRecord>): Promise<GoogleSessionRecord | null> {
  const current = await getGoogleSession(sessionId);
  if (!current) return null;
  return {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
}

export async function deleteGoogleSession(_sessionId: string): Promise<void> {}

export function getCookieOptions(isSecure: boolean, maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure,
    path: '/',
    maxAge: maxAgeSeconds
  };
}

export function isHttpsRequest(url: string): boolean {
  return new URL(url).protocol === 'https:';
}
