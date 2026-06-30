const WORKER_URL = 'https://nexus-backend.agussbd24.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // The function receives /api/auth/me, forward to worker as /api/auth/me
  const targetUrl = new URL(url.pathname, WORKER_URL);
  targetUrl.search = url.search;

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });

    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Backend no disponible', detail: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
