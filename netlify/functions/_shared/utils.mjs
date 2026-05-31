import crypto from "node:crypto";

export function hash(value = "") {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function stableId(value = "") {
  return crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 18);
}

export function cleanText(value = "", max = 1200) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizeUsername(value = "") {
  return cleanText(value, 40).toLowerCase().replace(/^@+/, "");
}

export function getClientIp(request) {
  const headers = request.headers;
  return headers.get("x-nf-client-connection-ip")
    || headers.get("client-ip")
    || headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "";
}
