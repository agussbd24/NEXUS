const WORKER_URL = 'https://nexus-backend.agussbd24.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Build target URL for WebSocket
  const targetUrl = new URL(url.pathname + url.search, WORKER_URL);

  try {
    // For WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      // Cloudflare Pages doesn't support WebSocket proxying directly
      // Return instructions to connect directly
      return new Response(JSON.stringify({
        error: 'WebSocket direct connection required',
        wsUrl: `wss://nexus-backend.agussbd24.workers.dev${url.pathname}${url.search}`
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Regular HTTP request proxy
    const modifiedRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const response = await fetch(modifiedRequest);
    return response;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Backend no disponible' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
