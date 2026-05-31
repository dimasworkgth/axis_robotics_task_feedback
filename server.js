const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = Number(process.env.PORT || 8080);
const AXIS_API_URL = process.env.AXIS_API_URL || "https://hub.axisrobotics.ai/api/tasks";
const AXIS_COOKIE = process.env.AXIS_COOKIE || "";

const TRANSLATION_MODE = process.env.TRANSLATION_MODE || "libretranslate";
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || "http://libretranslate:5000/translate";
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";
const TRANSLATION_SOURCE = process.env.TRANSLATION_SOURCE || "en";
const TRANSLATION_TARGET = process.env.TRANSLATION_TARGET || "id";

const CACHE_DIR = path.join(__dirname, ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "translations.json");

app.disable("x-powered-by");
app.use(express.static(path.join(__dirname, "public"), {
  etag: false,
  maxAge: "0",
  setHeaders(res) {
    res.setHeader("Cache-Control", "no-store");
  }
}));

function readCache() {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch {}
}

const translationCache = readCache();

function cacheKey(text, source, target) {
  return crypto.createHash("sha1").update(`${source}|${target}|${text}`).digest("hex");
}

async function fetchWithTimeout(url, options, ms = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function translateText(text) {
  const original = String(text || "").trim();
  if (!original) return { text: "", translated: true, provider: "empty" };

  if (TRANSLATION_MODE === "off") {
    return { text: original, translated: false, provider: "off" };
  }

  const key = cacheKey(original, TRANSLATION_SOURCE, TRANSLATION_TARGET);
  if (translationCache[key]) {
    return { text: translationCache[key], translated: true, provider: "cache" };
  }

  const body = {
    q: original,
    source: TRANSLATION_SOURCE,
    target: TRANSLATION_TARGET,
    format: "text"
  };

  if (LIBRETRANSLATE_API_KEY) body.api_key = LIBRETRANSLATE_API_KEY;

  try {
    const response = await fetchWithTimeout(LIBRETRANSLATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body)
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(`LibreTranslate HTTP ${response.status}: ${raw.slice(0, 120)}`);
    }

    const payload = JSON.parse(raw);
    const translated = String(payload.translatedText || "").trim();

    if (!translated) throw new Error("LibreTranslate returned empty translation");

    translationCache[key] = translated;
    writeCache(translationCache);

    return { text: translated, translated: true, provider: "libretranslate" };
  } catch (error) {
    return { text: original, translated: false, provider: "fallback", error: error.message };
  }
}

function buildAxisQuery(req, page) {
  const q = new URLSearchParams();
  q.set("sort_order", req.query.sort_order === "asc" ? "asc" : "desc");
  q.set("status", "active");
  q.set("search", typeof req.query.search === "string" ? req.query.search : "");
  q.set("page", String(page));
  q.set("per_page", String(Math.min(50, Math.max(1, Number(req.query.per_page || 9)))));
  return q;
}

async function fetchAxis(req, page) {
  const url = `${AXIS_API_URL}?${buildAxisQuery(req, page).toString()}`;
  const headers = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 AXIS-Task-Monitor-Translate/2.0",
    "Referer": "https://hub.axisrobotics.ai/?tab=hub",
    "Origin": "https://hub.axisrobotics.ai",
    "X-Requested-With": "XMLHttpRequest"
  };

  if (AXIS_COOKIE) headers.Cookie = AXIS_COOKIE;

  const response = await fetch(url, { headers, cache: "no-store" });
  const raw = await response.text();

  if (!response.ok) {
    const err = new Error(response.status === 401 || response.status === 403
      ? "AXIS menolak request dari VPS. Isi AXIS_COOKIE di .env hanya jika dibutuhkan."
      : `AXIS API gagal HTTP ${response.status}`);
    err.status = response.status;
    err.detail = raw.slice(0, 500);
    throw err;
  }

  return JSON.parse(raw);
}

function taskProgress(task) {
  const slot = Number(task.slot || 0);
  const completed = Number(task.slot_completed || 0);
  if (slot) return Math.max(0, Math.min(100, (completed / slot) * 100));
  return Number(task.progress || 0);
}

function isDone(task) {
  const slot = Number(task.slot || 0);
  const completed = Number(task.slot_completed || 0);
  const status = String(task.status || "").toLowerCase();
  return ["closed", "ended", "filled"].includes(status) || (slot > 0 && completed >= slot) || Number(task.progress || 0) >= 100;
}

function cleanDescription(text) {
  return String(text || "")
    .replace(/\(Please note that[\s\S]*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getSteps(task) {
  return Array.isArray(task.steps)
    ? task.steps.map(step => typeof step === "string" ? step : step.description).filter(Boolean)
    : [];
}

async function translateTask(task) {
  const description = cleanDescription(task.description || "");
  const rawSteps = getSteps(task);

  const titleResult = await translateText(task.name || "");
  const descResult = await translateText(description);

  const translatedSteps = [];
  let provider = titleResult.provider;
  let translated = titleResult.translated && descResult.translated;
  const errors = [];

  if (titleResult.error) errors.push(titleResult.error);
  if (descResult.error) errors.push(descResult.error);
  if (descResult.provider !== provider) provider = `${provider}/${descResult.provider}`;

  for (const step of rawSteps) {
    const result = await translateText(step);
    translatedSteps.push(result.text);
    translated = translated && result.translated;
    if (result.error) errors.push(result.error);
    if (!provider.includes(result.provider)) provider += `/${result.provider}`;
  }

  return {
    ...task,
    description,
    progress_calculated: taskProgress(task),
    title_id: titleResult.text,
    description_id: descResult.text,
    steps_id: translatedSteps,
    translation: {
      mode: TRANSLATION_MODE,
      provider,
      ok: translated,
      errors: errors.slice(0, 3)
    }
  };
}

app.get("/api/axis/tasks", async (req, res) => {
  try {
    const first = await fetchAxis(req, 1);
    let tasks = Array.isArray(first.tasks) ? first.tasks : [];
    const totalPages = Math.min(20, Number(first.pagination?.total_pages || 1));

    for (let page = 2; page <= totalPages; page += 1) {
      const payload = await fetchAxis(req, page);
      if (Array.isArray(payload.tasks)) tasks = tasks.concat(payload.tasks);
    }

    tasks = tasks.filter(task => !isDone(task));

    const shouldTranslate = String(req.query.translate || "1") === "1";
    if (shouldTranslate) {
      const translated = [];
      for (const task of tasks) translated.push(await translateTask(task));
      tasks = translated;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({
      tasks,
      pagination: {
        ...(first.pagination || {}),
        loaded_pages: totalPages,
        total_loaded: tasks.length
      },
      translation: {
        mode: TRANSLATION_MODE,
        provider: TRANSLATION_MODE === "libretranslate" ? LIBRETRANSLATE_URL : TRANSLATION_MODE,
        source: TRANSLATION_SOURCE,
        target: TRANSLATION_TARGET
      },
      synced_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(error.status || 500).json({
      ok: false,
      error: error.message,
      detail: error.detail || null
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    translation_mode: TRANSLATION_MODE
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AXIS Task Monitor Translate System running on http://0.0.0.0:${PORT}`);
  console.log(`AXIS_COOKIE: ${AXIS_COOKIE ? "set" : "empty"}`);
  console.log(`TRANSLATION_MODE: ${TRANSLATION_MODE}`);
  console.log(`LIBRETRANSLATE_URL: ${LIBRETRANSLATE_URL}`);
});
