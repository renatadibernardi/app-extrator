import crypto from 'node:crypto';
import { GOOGLE_DRIVE_API_BASE, GOOGLE_DRIVE_UPLOAD_BASE, fetchGoogleProfile, refreshGoogleToken } from './google-auth';
import { getGoogleSession, updateGoogleSession, type GoogleSessionRecord } from './google-session';

type GoogleRequestInit = RequestInit & {
  params?: Record<string, string | number | boolean | null | undefined>;
};

async function getFreshSession(sessionId: string): Promise<GoogleSessionRecord | null> {
  const session = await getGoogleSession(sessionId);
  if (!session) return null;

  if (session.expiryDate && Date.now() < session.expiryDate - 60_000) {
    return session;
  }

  if (!session.refreshToken) {
    return session;
  }

  try {
    const refreshed = await refreshGoogleToken(session.refreshToken);
    if (!refreshed.access_token) {
      return session;
    }

    const nextSession = await updateGoogleSession(sessionId, {
      accessToken: refreshed.access_token,
      expiryDate: Date.now() + (Number(refreshed.expires_in || 3600) * 1000),
      userLabel: session.userLabel
    });

    return nextSession || session;
  } catch {
    return session;
  }
}

async function googleFetch(sessionId: string, baseUrl: string, path: string, options: GoogleRequestInit = {}) {
  const session = await getFreshSession(sessionId);
  if (!session?.accessToken) {
    throw new Error('Faça login com o Google para usar o Drive.');
  }

  const url = new URL(`${baseUrl}${path}`);
  const { params, headers, ...init } = options;
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      ...(headers || {})
    }
  });

  if (response.status !== 401) {
    return { response, session };
  }

  if (!session.refreshToken) {
    return { response, session };
  }

  const refreshed = await getFreshSession(sessionId);
  if (!refreshed?.accessToken || refreshed.accessToken === session.accessToken) {
    return { response, session };
  }

  const retry = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${refreshed.accessToken}`,
      ...(headers || {})
    }
  });

  return { response: retry, session: refreshed };
}

export async function getGoogleAuthStatus(sessionId: string | null | undefined) {
  if (!sessionId) return null;
  const session = await getFreshSession(sessionId);
  if (!session) return null;
  return {
    userLabel: session.userLabel,
    email: session.email || '',
    authenticated: true
  };
}

export async function getGoogleProfileForSession(sessionId: string) {
  const session = await getFreshSession(sessionId);
  if (!session?.accessToken) return null;
  return fetchGoogleProfile(session.accessToken);
}

export async function listDriveChildren(sessionId: string, folderId: string) {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink),nextPageToken',
    orderBy: 'folder,name',
    pageSize: '200',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true'
  });

  const { response } = await googleFetch(sessionId, GOOGLE_DRIVE_API_BASE, `/files?${params.toString()}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Falha ao listar pastas.');
  }

  const data = await response.json();
  const files = Array.isArray(data.files) ? data.files : [];
  return {
    folders: files.filter((item: { mimeType?: string }) => item.mimeType === 'application/vnd.google-apps.folder'),
    files: files.filter((item: { mimeType?: string }) => item.mimeType !== 'application/vnd.google-apps.folder')
  };
}

export async function createDriveFolder(sessionId: string, parentId: string, name: string) {
  const { response } = await googleFetch(sessionId, GOOGLE_DRIVE_API_BASE, '/files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Falha ao criar pasta.');
  }

  return response.json();
}

export async function uploadDriveText(sessionId: string, params: {
  folderId: string;
  name: string;
  content: string;
  mimeType?: string;
}) {
  const boundary = `ncs-${crypto.randomUUID().replace(/-/g, '')}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify({
      name: params.name,
      parents: [params.folderId]
    }),
    `\r\n--${boundary}\r\nContent-Type: ${params.mimeType || 'text/markdown; charset=UTF-8'}\r\n\r\n`,
    params.content,
    `\r\n--${boundary}--`
  ], {
    type: `multipart/related; boundary=${boundary}`
  });

  const { response } = await googleFetch(sessionId, GOOGLE_DRIVE_UPLOAD_BASE, '/files', {
    method: 'POST',
    params: {
      uploadType: 'multipart',
      fields: 'id,name,mimeType,size,modifiedTime,webViewLink,webContentLink'
    },
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Falha ao enviar arquivo.');
  }

  return response.json();
}

export async function uploadDriveBase64(sessionId: string, params: {
  folderId: string;
  name: string;
  base64: string;
  mimeType?: string;
}) {
  const boundary = `ncs-${crypto.randomUUID().replace(/-/g, '')}`;
  const binary = Uint8Array.from(Buffer.from(params.base64, 'base64'));
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify({
      name: params.name,
      parents: [params.folderId]
    }),
    `\r\n--${boundary}\r\nContent-Type: ${params.mimeType || 'application/octet-stream'}\r\n\r\n`,
    binary,
    `\r\n--${boundary}--`
  ], {
    type: `multipart/related; boundary=${boundary}`
  });

  const { response } = await googleFetch(sessionId, GOOGLE_DRIVE_UPLOAD_BASE, '/files', {
    method: 'POST',
    params: {
      uploadType: 'multipart',
      fields: 'id,name,mimeType,size,modifiedTime,webViewLink,webContentLink'
    },
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Falha ao enviar arquivo.');
  }

  return response.json();
}
