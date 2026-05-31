import type { APIRoute } from 'astro';

export const prerender = false;

function sanitizeFolder(value: string): string {
  const folder = String(value || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
  if (!folder || folder === '.' || folder.includes('..')) {
    return 'convertido';
  }
  return folder.split('/').filter(Boolean).join('/');
}

function sanitizeMdName(value: string): string {
  const base = String(value || 'resultado.md').trim().split('/').pop() || 'resultado.md';
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, '-');
  return safe.toLowerCase().endsWith('.md') ? safe : `${safe}.md`;
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const mdName = sanitizeMdName(body?.mdName || 'resultado.md');
  const folder = sanitizeFolder(body?.folder || 'convertido');
  const content = String(body?.content || '');

  if (!content.trim()) {
    return new Response(JSON.stringify({ ok: false, error: 'Conteúdo vazio.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, path: `drive/md/${folder}/${mdName}` }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
