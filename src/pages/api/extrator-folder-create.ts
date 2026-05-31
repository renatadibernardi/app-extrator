import type { APIRoute } from 'astro';

export const prerender = false;

function sanitizeFolderName(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''))
    .filter(Boolean)
    .join('/');
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  const requestedName = typeof body?.folderName === 'string' ? body.folderName : '';
  const folderName = sanitizeFolderName(requestedName) || 'nova-pasta';

  return new Response(JSON.stringify({ ok: true, folder: folderName }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
