import fs from "node:fs/promises";
import path from "node:path";
const STORE_NAME = "axis_feedback_v5";
const LOCAL_DIR = path.join(process.cwd(), ".local-feedback");

function useLocalStorage() {
  return process.env.USE_LOCAL_STORAGE === "1" || process.env.NETLIFY_DEV === "true";
}

function localPath(key) {
  const safe = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(LOCAL_DIR, `${safe}.json`);
}

export async function getJson(key, fallback) {
  if (useLocalStorage()) {
    try {
      const raw = await fs.readFile(localPath(key), "utf8");
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  const { getStore } = await import("@netlify/blobs");
  const store = getStore(STORE_NAME);
  const value = await store.get(key, { type: "json" });
  return value ?? fallback;
}

export async function setJson(key, value) {
  if (useLocalStorage()) {
    await fs.mkdir(LOCAL_DIR, { recursive: true });
    await fs.writeFile(localPath(key), JSON.stringify(value, null, 2));
    return;
  }

  const { getStore } = await import("@netlify/blobs");
  const store = getStore(STORE_NAME);
  await store.setJSON(key, value);
}
