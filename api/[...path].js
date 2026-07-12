const BACKEND_BASE_URL =
  process.env.BACKEND_URL || "https://operating-theatre-backend.onrender.com";

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,X-Device-Key"
    );
    return res.status(204).end();
  }

  const requestUrl = new URL(
    req.url,
    `https://${req.headers.host || "localhost"}`
  );

  // Build the upstream URL: keep the /api prefix as-is
  const upstreamUrl = new URL(
    `${BACKEND_BASE_URL}${requestUrl.pathname}${requestUrl.search}`
  );

  // Forward headers, stripping hop-by-hop headers
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders.host;
  delete forwardHeaders.connection;
  delete forwardHeaders["content-length"];
  delete forwardHeaders["transfer-encoding"];

  // Read request body for non-GET/HEAD requests
  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    if (chunks.length > 0) {
      body = Buffer.concat(chunks);
    }
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: req.method,
      headers: forwardHeaders,
      body: body && body.length > 0 ? body : undefined,
    });
  } catch (networkError) {
    console.error("Upstream fetch failed:", networkError);
    return res.status(502).json({
      success: false,
      message: "Unable to reach the backend service.",
    });
  }

  const responseBody = await upstreamResponse.text();
  const contentType =
    upstreamResponse.headers.get("content-type") || "application/json";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type,Authorization,X-Device-Key"
  );

  return res.status(upstreamResponse.status).end(responseBody);
}
