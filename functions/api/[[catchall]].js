const WORKER_URL = 'https://nexus-backend.agussbd24.workers.dev';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const targetUrl = new URL(url.pathname, WORKER_URL);
  targetUrl.search = url.search;

  try {
    const headers = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    });

    const fetchOptions = {
      method: request.method,
      headers,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      const bodyArray = new Uint8Array(await request.arrayBuffer());
      fetchOptions.body = bodyArray;
    }

    const response = await fetch(targetUrl.toString(), fetchOptions);
    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Backend no disponible', detail: error.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
