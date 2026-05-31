import { getJson, setJson } from "./storage.mjs";
import { cleanText, normalizeUsername, hash, getClientIp } from "./utils.mjs";

const CATEGORIES = new Set(["Suggestion", "Bug", "Criticism"]);

function listKey(taskId) {
  return `feedback_${taskId}`;
}
function guardKey(taskId) {
  return `guard_${taskId}`;
}
const indexKey = "task_index";

export async function getFeedback(taskId, options = {}) {
  const allItems = await getJson(listKey(taskId), []);
  const sorted = allItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const all = options.all === true;
  const limit = Number(options.limit || 2);
  return {
    task_id: taskId,
    total: sorted.length,
    items: all ? sorted : sorted.slice(0, limit)
  };
}

export async function addFeedback(request, body) {
  const taskId = cleanText(body?.task_id, 120);
  const taskTitle = cleanText(body?.task_title, 180);
  const username = cleanText(body?.username, 40);
  const usernameNorm = normalizeUsername(username);
  const category = cleanText(body?.category, 20);
  const message = cleanText(body?.message, 1200);
  const clientId = cleanText(body?.client_id, 140);

  if (!taskId) return { status: 400, data: { ok: false, error: "Missing task_id." } };
  if (!username || usernameNorm.length < 2) return { status: 400, data: { ok: false, error: "Name / username is required." } };
  if (!CATEGORIES.has(category)) return { status: 400, data: { ok: false, error: "Category must be Suggestion, Bug, or Criticism." } };
  if (message.length < 8) return { status: 400, data: { ok: false, error: "Feedback message is too short." } };
  if (!clientId) return { status: 400, data: { ok: false, error: "Missing browser identity. Refresh the page and try again." } };

  const guard = await getJson(guardKey(taskId), { clients: {}, usernames: {}, ips: {} });
  const clientHash = hash(clientId);
  const usernameHash = hash(usernameNorm);
  const ipHash = hash(getClientIp(request));
  const blockByIp = process.env.BLOCK_DUPLICATE_BY_IP === "1";

  if (guard.clients[clientHash] || guard.usernames[usernameHash] || (blockByIp && guard.ips[ipHash])) {
    return {
      status: 409,
      data: { ok: false, error: "You have already submitted feedback for this task. Only one submission is allowed per task." }
    };
  }

  const item = {
    id: `fb_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    task_id: taskId,
    task_title: taskTitle,
    username,
    category,
    message,
    created_at: new Date().toISOString()
  };

  const items = await getJson(listKey(taskId), []);
  items.push(item);
  await setJson(listKey(taskId), items);

  guard.clients[clientHash] = item.created_at;
  guard.usernames[usernameHash] = item.created_at;
  if (blockByIp && ipHash) guard.ips[ipHash] = item.created_at;
  await setJson(guardKey(taskId), guard);

  const taskIndex = await getJson(indexKey, {});
  taskIndex[taskId] = {
    task_id: taskId,
    task_title: taskTitle || taskIndex[taskId]?.task_title || taskId,
    updated_at: item.created_at
  };
  await setJson(indexKey, taskIndex);

  return { status: 200, data: { ok: true, feedback: item } };
}

export async function getAllFeedback() {
  const taskIndex = await getJson(indexKey, {});
  const all = [];
  for (const taskId of Object.keys(taskIndex)) {
    const items = await getJson(listKey(taskId), []);
    all.push(...items);
  }
  return all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
