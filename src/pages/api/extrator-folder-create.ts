import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { DOC_MD_ROOT } from '../../lib/docPaths';

export const prerender = false;

function sanitizeFolderName(value: string): string {
  const folder = String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');

  if (!folder || folder === '.' || folder.includes('..') || path.isAbsolute(folder)) {
    return '';
  }

  return folder
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/');
}

function uniqueFolderName(baseName: string): string {
  const cleanBase = sanitizeFolderName(baseName) || 'nova-pasta';
  let candidate = cleanBase;
  let suffix = 2;

  while (fs.existsSync(path.join(DOC_MD_ROOT, candidate))) {
    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedName = typeof body?.folderName === 'string' ? body.folderName : '';
    const folderName = uniqueFolderName(requestedName || 'nova-pasta');
    const targetDir = path.join(DOC_MD_ROOT, folderName);

    fs.mkdirSync(targetDir, { recursive: true });

    return new Response(JSON.stringify({ ok: true, folder: folderName }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'Falha ao criar a pasta.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
