import { Container } from '@cloudflare/containers';

export class ExtratorContainer extends Container {
  defaultPort = 8080;
  sleepAfter = '10m';
}

export interface Env {
  EXTRATOR_CONTAINER: DurableObjectNamespace<ExtratorContainer>;
}

function corsHeaders(request: Request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-File-Name, X-Folder',
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'app-extrator-worker' }, { headers: cors });
    }

    if (url.pathname === '/api/extrator-process' && request.method === 'POST') {
      const container = env.EXTRATOR_CONTAINER.getByName('processor');
      const response = await container.fetch(request);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors)) {
        headers.set(key, value);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return Response.json({ ok: false, error: 'Not found' }, { status: 404, headers: cors });
  },
};
