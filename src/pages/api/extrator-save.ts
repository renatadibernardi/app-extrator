import fs from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { DOC_MD_ROOT } from '../../lib/docPaths';

export const prerender = false;

function sanitizeFolder(value: string): string {
  const folder = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!folder || folder === '.' || folder.includes('..') || path.isAbsolute(folder)) {
    return 'convertido';
  }
  return folder.split('/').filter(Boolean).join('/');
}

function sanitizeMdName(value: string): string {
  const base = path.basename(String(value || '').trim());
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '-');
  if (!safe.toLowerCase().endsWith('.md')) {
    return `${safe}.md`;
  }
  return safe;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const mdName = sanitizeMdName(body?.mdName || 'resultado.md');
    const folder = sanitizeFolder(body?.folder || 'convertido');
    const content = String(body?.content || '');

    if (!content.trim()) {
      return new Response(JSON.stringify({ ok: false, error: 'Conteúdo vazio.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const targetDir = path.join(DOC_MD_ROOT, folder);
    fs.mkdirSync(targetDir, { recursive: true });
    const outputPath = path.join(targetDir, mdName);
    fs.writeFileSync(outputPath, content, 'utf-8');

    return new Response(JSON.stringify({ ok: true, path: outputPath }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: 'Falha ao salvar o ficheiro.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
