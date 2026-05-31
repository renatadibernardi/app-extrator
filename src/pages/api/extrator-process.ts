import type { APIRoute } from 'astro';

export const prerender = false;

const EXTRATOR_API_URL =
  import.meta.env.PUBLIC_EXTRATOR_API_URL ||
  'https://app-extrator-api.dibernardi.workers.dev';

export const POST: APIRoute = async ({ request }) => {
  const target = new URL('/api/extrator-process', EXTRATOR_API_URL);
  return fetch(target, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
    duplex: 'half'
  } as RequestInit & { duplex: 'half' });
};
