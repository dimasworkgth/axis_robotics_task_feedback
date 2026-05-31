import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const functionsDir = path.join(__dirname, "netlify", "functions");
const port = Number(process.env.PORT || 8888);

async function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  try {
    const raw = await fs.readFile(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['\"]|['\"]$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env is optional for quick preview.
  }

  process.env.USE_LOCAL_STORAGE ||= "1";
  process.env.USE_MOCK_AXIS ||= "0";
  process.env.ADMIN_KEY ||= "change-this-admin-key";
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  }[ext] || "application/octet-stream";
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function sendResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}

async function handleFunction(req, res) {
  const incomingUrl = new URL(req.url, `http://localhost:${port}`);
  const functionName = incomingUrl.pathname.replace(/^\/api\//, "");
  const functionFile = path.join(functionsDir, `${functionName}.mjs`);

  try {
    await fs.access(functionFile);
  } catch {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: `Function not found: ${functionName}` }));
    return;
  }

  const body = ["GET", "HEAD"].includes(req.method || "GET") ? undefined : await readBody(req);
  const request = new Request(`http://localhost:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body
  });

  try {
    const module = await import(`${pathToFileURL(functionFile).href}?t=${Date.now()}`);
    const response = await module.default(request);
    await sendResponse(res, response);
  } catch (error) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: error.message || String(error) }));
  }
}

async function handleStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  let requested = decodeURIComponent(url.pathname);
  if (requested === "/") requested = "/index.html";

  const safePath = path.normalize(requested).replace(/^([.][.][/\\])+/, "");
  let filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "content-type": mimeType(filePath), "cache-control": "no-store" });
    res.end(content);
  } catch {
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" });
    res.end("<h1>404</h1><p>File not found.</p>");
  }
}

await loadEnv();

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/")) return handleFunction(req, res);
  return handleStatic(req, res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`AXIS Feedback local preview running on http://0.0.0.0:${port}`);
  console.log(`USE_LOCAL_STORAGE=${process.env.USE_LOCAL_STORAGE}`);
  console.log(`USE_MOCK_AXIS=${process.env.USE_MOCK_AXIS}`);
});
