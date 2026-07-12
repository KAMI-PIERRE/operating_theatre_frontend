export default async function handler(req, res) {
  const requestUrl = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const backendBaseUrl = process.env.BACKEND_URL || 'https://operating-theatre-backend.onrender.com';
  const upstreamUrl = new URL(`${backendBaseUrl}${requestUrl.pathname}${requestUrl.search}`);

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers['content-length'];

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Device-Key');
    res.status(204).end();
    return;
  }

  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    body = Buffer.concat(chunks);
  }

  const response = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: body && body.length ? body : undefined,
  });

  const responseBody = await response.text();
  const contentType = response.headers.get('content-type') || 'application/json';

  res.status(response.status);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Device-Key');
  res.end(responseBody);
}
