import { stableId, cleanText } from "./utils.mjs";
import { getJson, setJson } from "./storage.mjs";

const TASK_CATALOG_KEY = "task_catalog";

const DEMO_TASKS = [
  {
    id: "axis-demo-content-review",
    title: "Review AXIS community content task",
    description: "Check whether the task instruction is clear, actionable, and easy for contributors to understand.",
    slot_label: "18/50 slots",
    progress: 36,
    steps: ["Read the task instruction", "Check the expected output", "Submit feedback if anything is unclear"],
    active: true
  },
  {
    id: "axis-demo-dashboard-feedback",
    title: "Test contributor dashboard feedback flow",
    description: "Open the task room and submit specific feedback about the contributor dashboard experience.",
    slot_label: "7/30 slots",
    progress: 23,
    steps: ["Open the dashboard", "Review UI and flow", "Write feedback in English"],
    active: true
  },
  {
    id: "axis-demo-archived-task",
    title: "Archived task kept for feedback history",
    description: "This demo task is no longer active, but it stays visible because the feedback board stores task identity permanently.",
    slot_label: "Last seen: 20/20 slots",
    progress: 100,
    steps: ["The task disappeared from the live API", "The feedback page remains available"],
    active: false
  }
];

export function demoTasks() {
  const now = new Date();
  const isoHoursAgo = (hours) => new Date(now.getTime() - hours * 36e5).toISOString();
  return DEMO_TASKS.map((task, index) => {
    const firstSeen = index === 2 ? isoHoursAgo(36) : isoHoursAgo(index === 1 ? 4 : 2);
    const lastSeen = index === 2 ? isoHoursAgo(28) : isoHoursAgo(index === 1 ? 1 : 0.3);
    return {
      ...task,
      first_seen_at: task.first_seen_at || firstSeen,
      last_seen_at: task.last_seen_at || lastSeen,
      updated_at: task.updated_at || lastSeen,
      source: "demo",
      sort_order: index
    };
  });
}

function getProgress(task) {
  const slot = Number(task.slot || 0);
  const completed = Number(task.slot_completed || 0);
  if (slot) return Math.max(0, Math.min(100, (completed / slot) * 100));
  return Math.max(0, Math.min(100, Number(task.progress || 0)));
}

function isDone(task) {
  const status = String(task.status || "").toLowerCase();
  const slot = Number(task.slot || 0);
  const completed = Number(task.slot_completed || 0);
  return ["closed", "ended", "filled", "done", "completed"].includes(status)
    || (slot > 0 && completed >= slot)
    || Number(task.progress || 0) >= 100;
}

function getSteps(task) {
  if (!Array.isArray(task.steps)) return [];
  return task.steps
    .map((step) => typeof step === "string" ? step : step?.description || step?.title || "")
    .map((step) => cleanText(step, 280))
    .filter(Boolean);
}

export function normalizeTask(task) {
  const rawId = task.id || task.uuid || task.slug || task.task_id || stableId(`${task.name || task.title}|${task.description || ""}`);
  const title = cleanText(task.name || task.title || "Untitled Task", 180);
  const description = cleanText(task.description || task.short_description || "", 520);
  const slot = Number(task.slot || 0);
  const completed = Number(task.slot_completed || 0);
  const progress = getProgress(task);
  const done = isDone(task);

  return {
    id: String(rawId),
    title,
    description,
    progress,
    slot_label: slot ? `${completed}/${slot} slots` : "Open",
    steps: getSteps(task),
    raw_url: task.url || task.link || "",
    active: !done,
    api_status: cleanText(task.status || (done ? "archived" : "active"), 40)
  };
}

function sortCatalog(tasks) {
  return tasks.sort((a, b) => {
    if (Boolean(a.active) !== Boolean(b.active)) return a.active ? -1 : 1;
    return new Date(b.last_seen_at || b.updated_at || 0) - new Date(a.last_seen_at || a.updated_at || 0);
  });
}

export async function getTaskCatalog() {
  const catalog = await getJson(TASK_CATALOG_KEY, {});
  return sortCatalog(Object.values(catalog));
}

export async function getTaskById(taskId) {
  const catalog = await getJson(TASK_CATALOG_KEY, {});
  return catalog[taskId] || null;
}

function isDemoTask(taskId, task = {}) {
  return String(taskId || task.id || "").startsWith("axis-demo-") || task.source === "demo";
}

export async function purgeDemoCatalog() {
  const catalog = await getJson(TASK_CATALOG_KEY, {});
  let changed = false;

  for (const taskId of Object.keys(catalog)) {
    if (isDemoTask(taskId, catalog[taskId])) {
      delete catalog[taskId];
      changed = true;
    }
  }

  if (changed) await setJson(TASK_CATALOG_KEY, catalog);
  return catalog;
}

export async function upsertTaskCatalog(incomingTasks, options = {}) {
  const now = new Date().toISOString();
  const catalog = options.allowDemo
    ? await getJson(TASK_CATALOG_KEY, {})
    : await purgeDemoCatalog();
  const seenIds = new Set();

  for (const incoming of incomingTasks) {
    const existing = catalog[incoming.id] || {};
    seenIds.add(incoming.id);
    catalog[incoming.id] = {
      ...existing,
      ...incoming,
      id: incoming.id,
      title: incoming.title || existing.title || incoming.id,
      description: incoming.description || existing.description || "",
      steps: incoming.steps?.length ? incoming.steps : existing.steps || [],
      raw_url: incoming.raw_url || existing.raw_url || "",
      first_seen_at: existing.first_seen_at || incoming.first_seen_at || now,
      last_seen_at: incoming.last_seen_at || now,
      updated_at: incoming.updated_at || now,
      source: incoming.source || "axis_api"
    };
  }

  for (const taskId of Object.keys(catalog)) {
    if (!seenIds.has(taskId)) {
      catalog[taskId] = {
        ...catalog[taskId],
        active: false,
        api_status: catalog[taskId].api_status === "active" ? "not_in_active_api" : catalog[taskId].api_status || "not_in_active_api",
        updated_at: now
      };
    }
  }

  await setJson(TASK_CATALOG_KEY, catalog);
  return sortCatalog(Object.values(catalog));
}

export async function seedDemoCatalog() {
  return upsertTaskCatalog(demoTasks(), { allowDemo: true });
}

export async function fetchAxisTasks(requestUrl) {
  const urlObject = new URL(requestUrl);
  const useMock = process.env.USE_MOCK_AXIS === "1" || urlObject.searchParams.get("demo") === "1";
  if (useMock) {
    const tasks = await seedDemoCatalog();
    return { tasks, demo: true, collected_count: tasks.length };
  }

  // When running the real AXIS API, remove every mock/demo task that may
  // have been saved during Codespaces previews or old deployments.
  await purgeDemoCatalog();

  const baseUrl = process.env.AXIS_API_URL || "https://hub.axisrobotics.ai/api/tasks";
  const maxPages = Math.max(1, Math.min(20, Number(process.env.MAX_AXIS_PAGES || 6)));
  const perPage = Math.max(1, Math.min(50, Number(urlObject.searchParams.get("per_page") || 12)));
  const search = urlObject.searchParams.get("search") || "";
  const rawTasks = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const apiUrl = new URL(baseUrl);
    apiUrl.searchParams.set("sort_order", "desc");
    apiUrl.searchParams.set("status", "active");
    apiUrl.searchParams.set("page", String(page));
    apiUrl.searchParams.set("per_page", String(perPage));
    apiUrl.searchParams.set("search", search);

    const headers = {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 AXIS-Feedback-Netlify/5.0",
      Referer: "https://hub.axisrobotics.ai/?tab=hub",
      Origin: "https://hub.axisrobotics.ai",
      "X-Requested-With": "XMLHttpRequest"
    };
    if (process.env.AXIS_COOKIE) headers.Cookie = process.env.AXIS_COOKIE;

    const response = await fetch(apiUrl, { headers, cache: "no-store" });
    const raw = await response.text();
    if (!response.ok) {
      throw new Error(response.status === 401 || response.status === 403
        ? "AXIS rejected the request. Add AXIS_COOKIE only if the API requires it."
        : `AXIS API failed with HTTP ${response.status}`);
    }

    const payload = JSON.parse(raw);
    const pageTasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    rawTasks.push(...pageTasks);

    const totalPages = Number(payload.pagination?.total_pages || page);
    if (page >= totalPages) break;
  }

  const normalized = rawTasks.map(normalizeTask);
  const catalogTasks = await upsertTaskCatalog(normalized);

  return {
    tasks: catalogTasks,
    live_count: normalized.filter((task) => task.active).length,
    collected_count: catalogTasks.length,
    demo: false
  };
}
