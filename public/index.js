import {
  $, escapeHtml, apiGet, cacheTasks, isDemoMode, taskUrl, formatDate,
  isTodayTask, taskBucketLabel, taskAgeHours
} from "./shared.js";

let tasks = [];

const todayGrid = $("#todayGrid");
const sevenDayGrid = $("#sevenDayGrid");
const todayCount = $("#todayCount");
const sevenDayCount = $("#sevenDayCount");
const searchInput = $("#searchInput");
const refreshBtn = $("#refreshBtn");

function filterTasks(list) {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return list;
  return list.filter((task) => `${task.title} ${task.description}`.toLowerCase().includes(query));
}

function statusText(task) {
  if (isTodayTask(task)) return "Live now";
  if (task.active) return "Moved after 24h";
  return "Saved from API";
}

function ageLabel(task) {
  const hours = taskAgeHours(task);
  if (!Number.isFinite(hours)) return "Age unknown";
  if (hours < 1) return "Collected less than 1h ago";
  if (hours < 24) return `Collected ${Math.floor(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `Collected ${days}d ago`;
}

function taskCard(task) {
  const badge = taskBucketLabel(task);
  const progress = Math.max(0, Math.min(100, Math.round(task.progress || 0)));
  return `
    <article class="task-card ${isTodayTask(task) ? "today-task" : "saved-task"}">
      <div class="card-top">
        <span class="pill ${isTodayTask(task) ? "" : "muted-pill"}">${escapeHtml(badge)}</span>
        <small>${escapeHtml(task.slot_label || "Open")}</small>
      </div>
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description || "No description available.")}</p>
      <div>
        <small>${progress}% progress</small>
        <div class="progress"><span style="width:${progress}%"></span></div>
      </div>
      <small>${escapeHtml(statusText(task))} · ${escapeHtml(ageLabel(task))}${task.last_seen_at ? ` · Last seen ${formatDate(task.last_seen_at)}` : ""}</small>
      <a class="btn primary full" href="${taskUrl(task.id)}">Open Task Room</a>
    </article>
  `;
}

async function loadTasks() {
  todayGrid.innerHTML = `<p class="empty">Syncing AXIS tasks...</p>`;
  sevenDayGrid.innerHTML = "";
  todayCount.textContent = "Reading live API and saved catalog...";
  sevenDayCount.textContent = "Waiting for catalog sync...";

  try {
    const demo = isDemoMode() ? "?demo=1" : "";
    const data = await apiGet(`/api/axis-tasks${demo}`);
    tasks = data.tasks || [];
    cacheTasks(tasks);
    render();
  } catch (error) {
    todayCount.textContent = "Failed to sync tasks";
    todayGrid.innerHTML = `<p class="empty error">${escapeHtml(error.message)}</p>`;
    sevenDayGrid.innerHTML = "";
  }
}

function render() {
  const filtered = filterTasks(tasks);
  const today = filtered.filter(isTodayTask);
  const sevenDay = filtered.filter((task) => !isTodayTask(task));
  const liveCount = tasks.filter((task) => task.active).length;

  todayCount.textContent = `${today.length} today task${today.length === 1 ? "" : "s"} · ${liveCount} live`;
  sevenDayCount.textContent = `${sevenDay.length} saved task${sevenDay.length === 1 ? "" : "s"} · tasks move here after 24h or when AXIS removes them from the live API`;

  todayGrid.innerHTML = today.length
    ? today.map(taskCard).join("")
    : `<p class="empty">No Today Tasks yet. AXIS usually publishes tasks around 7 PM WIB, but random early leaks will still be collected safely.</p>`;

  sevenDayGrid.innerHTML = sevenDay.length
    ? sevenDay.map(taskCard).join("")
    : `<p class="empty">No 7D Tasks yet. Saved tasks will appear here after 24 hours.</p>`;
}

searchInput.addEventListener("input", render);
refreshBtn.addEventListener("click", loadTasks);
loadTasks();
