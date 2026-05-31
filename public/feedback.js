import { $, escapeHtml, getParam, isDemoMode, apiGet, formatDate, taskUrl } from "./shared.js";

const taskId = getParam("id");
const list = $("#feedbackList");
const totalCount = $("#totalCount");
const statusText = $("#statusText");
const backToTask = $("#backToTask");
const backToTasks = $("#backToTasks");

if (taskId) backToTask.href = taskUrl(taskId);
if (isDemoMode()) backToTasks.href = "index.html?demo=1";

async function load() {
  if (!taskId) {
    list.innerHTML = `<p class="empty error">Missing task id.</p>`;
    return;
  }

  try {
    const data = await apiGet(`/api/feedback?task_id=${encodeURIComponent(taskId)}&all=1`);
    const items = data.items || [];
    totalCount.textContent = String(data.total || 0);
    statusText.textContent = data.total ? "Loaded" : "No feedback yet";

    if (!items.length) {
      list.innerHTML = `<p class="empty">No feedback has been submitted for this task yet.</p>`;
      return;
    }

    list.innerHTML = items.map((item) => `
      <article class="feedback-item">
        <div class="feedback-top">
          <strong>${escapeHtml(item.username)}</strong>
          <small>${formatDate(item.created_at)}</small>
        </div>
        <small>${escapeHtml(item.category)}</small>
        <p>${escapeHtml(item.message)}</p>
      </article>
    `).join("");
  } catch (error) {
    statusText.textContent = "Failed";
    list.innerHTML = `<p class="empty error">${escapeHtml(error.message)}</p>`;
  }
}

load();
