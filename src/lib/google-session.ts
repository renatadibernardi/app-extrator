import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const GOOGLE_SESSION_COOKIE = 'ncs_google_session';
export const GOOGLE_OAUTH_STATE_COOKIE = 'ncs_google_oauth_state';
const STORE_PATH = path.join(process.cwd(), '.data', 'google-sessions.json');

export type GoogleSessionRecord = {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  userLabel: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

type GoogleSessionStore = {
  sessions: Record<string, GoogleSessionRecord>;
};

function getSecret(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (
    process.env.GOOGLE_SESSION_SECRET ||
    process.env.SESSION_SECRET ||
    env.GOOGLE_SESSION_SECRET ||
    env.SESSION_SECRET ||
    'ncs-studio-google-session-secret'
  );
}

function hmac(value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function signValue(value: string): string {
  return `${value}.${hmac(value)}`;
}

export function verifySignedValue(signedValue: string | null | undefined): string | null {
  if (!signedValue) return null;
  const idx = signedValue.lastIndexOf('.');
  if (idx <= 0) return null;
  const value = signedValue.slice(0, idx);
  const signature = signedValue.slice(idx + 1);
  const expected = hmac(value);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return null;
  if (!crypto.timingSafeEqual(left, right)) return null;
  return value;
}

async function readStore(): Promise<GoogleSessionStore> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<GoogleSessionStore>;
    return {
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {}
    };
  } catch {
    return { sessions: {} };
  }
}

async function writeStore(store: GoogleSessionStore): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export async function getGoogleSession(sessionId: string): Promise<GoogleSessionRecord | null> {
  const store = await readStore();
  return store.sessions[sessionId] || null;
}

export async function createGoogleSession(record: GoogleSessionRecord): Promise<string> {
  const store = await readStore();
  const sessionId = crypto.randomUUID();
  store.sessions[sessionId] = record;
  await writeStore(store);
  return sessionId;
}

export async function updateGoogleSession(sessionId: string, patch: Partial<GoogleSessionRecord>): Promise<GoogleSessionRecord | null> {
  const store = await readStore();
  const current = store.sessions[sessionId];
  if (!current) return null;
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  store.sessions[sessionId] = next;
  await writeStore(store);
  return next;
}

export async function deleteGoogleSession(sessionId: string): Promise<void> {
  const store = await readStore();
  if (!store.sessions[sessionId]) return;
  delete store.sessions[sessionId];
  await writeStore(store);
}

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
