const WORKER_URL = 'https://nexus-backend.agussbd24.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Build target URL
  const targetUrl = new URL(`/api${url.pathname}`, WORKER_URL);
  targetUrl.search = url.search;

  // Clone request with target URL
  const modifiedRequest = new Request(targetUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  try {
    const response = await fetch(modifiedRequest);

    // Create new response with CORS headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    // Add CORS headers
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return newResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Backend no disponible' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
