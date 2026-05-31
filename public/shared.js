export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

export function getParam(name) {
  return new URLSearchParams(location.search).get(name) || "";
}

export function isDemoMode() {
  return getParam("demo") === "1";
}

export function getClientId() {
  const key = "axis_feedback_client_id_v8";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function submittedKey(taskId) {
  return `axis_feedback_submitted_v8:${taskId}`;
}

export function markSubmitted(taskId) {
  localStorage.setItem(submittedKey(taskId), "1");
}

export function hasSubmitted(taskId) {
  return localStorage.getItem(submittedKey(taskId)) === "1";
}

export function cacheTasks(tasks) {
  localStorage.setItem("axis_feedback_tasks_v8", JSON.stringify(tasks || []));
}

export function readCachedTasks() {
  try {
    return JSON.parse(localStorage.getItem("axis_feedback_tasks_v8") || "[]");
  } catch {
    return [];
  }
}

export async function apiGet(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed: ${response.status}`);
  return payload;
}

export async function apiPost(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function taskUrl(taskId) {
  const demo = isDemoMode() ? "&demo=1" : "";
  return `task.html?id=${encodeURIComponent(taskId)}${demo}`;
}

export function feedbackUrl(taskId) {
  const demo = isDemoMode() ? "&demo=1" : "";
  return `feedback.html?id=${encodeURIComponent(taskId)}${demo}`;
}


export function taskAgeHours(task) {
  const basis = task?.first_seen_at || task?.last_seen_at || task?.updated_at || task?.created_at;
  if (!basis) return Number.POSITIVE_INFINITY;
  const time = new Date(basis).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - time) / 36e5);
}

export function isTodayTask(task) {
  return Boolean(task?.active) && taskAgeHours(task) < 24;
}

export function isSevenDayTask(task) {
  return !isTodayTask(task);
}

export function taskBucketLabel(task) {
  if (isTodayTask(task)) return "Today";
  const hours = taskAgeHours(task);
  if (hours < 168) return "7D";
  return "Saved";
}
