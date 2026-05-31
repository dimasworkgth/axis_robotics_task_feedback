import {
  $, escapeHtml, getParam, isDemoMode, apiGet, apiPost, cacheTasks, readCachedTasks,
  getClientId, hasSubmitted, markSubmitted, formatDate, feedbackUrl, isTodayTask, taskBucketLabel
} from "./shared.js";

const taskId = getParam("id");
let task = null;
let feedback = { total: 0, items: [] };

const taskPanel = $("#taskPanel");
const feedbackPanel = $("#feedbackPanel");
const formPanel = $("#formPanel");
const roomStatus = $("#roomStatus");
const roomSubtext = $("#roomSubtext");
const backToTasks = $("#backToTasks");

if (isDemoMode()) backToTasks.href = "index.html?demo=1";

async function loadTask() {
  if (!taskId) throw new Error("Missing task id.");

  let tasks = readCachedTasks();
  task = tasks.find((item) => item.id === taskId);

  if (!task) {
    const demo = isDemoMode() ? "?demo=1" : "";
    const data = await apiGet(`/api/axis-tasks${demo}`);
    tasks = data.tasks || [];
    cacheTasks(tasks);
    task = tasks.find((item) => item.id === taskId);
  }

  if (!task) throw new Error("Task not found. Go back and refresh the task list.");
}

async function loadFeedback() {
  feedback = await apiGet(`/api/feedback?task_id=${encodeURIComponent(taskId)}&limit=2`);
}

function renderTask() {
  taskPanel.innerHTML = `
    <div class="meta">
      <span class="pill">${escapeHtml(taskBucketLabel(task))} Task</span>
      <span class="pill">${escapeHtml(task.slot_label || "Open")}</span>
    </div>
    <h2 class="big-title">${escapeHtml(task.title)}</h2>
    <p class="description">${escapeHtml(task.description || "No description available.")}</p>
    <p class="muted">${isTodayTask(task) ? "Currently visible in Today Tasks." : "Saved in the 7D task catalog, so feedback stays available even after AXIS removes it from the live API."}</p>
    <div>
      <small>${Math.round(task.progress || 0)}% progress</small>
      <div class="progress"><span style="width:${Math.max(0, Math.min(100, task.progress || 0))}%"></span></div>
    </div>
    ${Array.isArray(task.steps) && task.steps.length ? `
      <div class="divider"></div>
      <h2>Task Steps</h2>
      <ol class="steps">${task.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    ` : ""}
  `;
}

function renderFeedbackPreview() {
  const items = feedback.items || [];
  feedbackPanel.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Community Feedback</h2>
        <p class="muted">${feedback.total} feedback item${feedback.total === 1 ? "" : "s"} for this task.</p>
      </div>
      <span class="pill">${feedback.total} total</span>
    </div>
    <div class="feedback-preview">
      ${items.length ? items.map((item) => `
        <article class="feedback-item preview">
          <div class="feedback-top">
            <strong>${escapeHtml(item.username)}</strong>
            <small>${formatDate(item.created_at)}</small>
          </div>
          <small>${escapeHtml(item.category)}</small>
          <p>${escapeHtml(item.message)}</p>
        </article>
      `).join("") : `<p class="empty">No feedback has been submitted for this task yet.</p>`}
    </div>
    <div class="actions">
      <a class="btn primary" href="${feedbackUrl(taskId)}">See More Feedback</a>
    </div>
  `;
}

function renderForm(message = "") {
  if (hasSubmitted(taskId)) {
    formPanel.innerHTML = `
      <h2>Submit Feedback</h2>
      <div class="divider"></div>
      <div class="warning">
        You have already submitted feedback for this task from this browser. Only one feedback submission is allowed per task.
      </div>
    `;
    return;
  }

  formPanel.innerHTML = `
    <h2>Submit Feedback</h2>
    <p class="note">Please write your feedback in English so the AXIS team can review it faster.</p>
    ${message ? `<p class="error">${escapeHtml(message)}</p>` : ""}
    <form class="form-grid" id="feedbackForm">
      <label class="field">
        <span>Name / username</span>
        <input name="username" required minlength="2" maxlength="40" placeholder="Example: robot1111 or username" />
      </label>
      <label class="field">
        <span>Category</span>
        <select name="category" required>
          <option value="">Choose category</option>
          <option value="Suggestion">Suggestion</option>
          <option value="Bug">Bug</option>
          <option value="Criticism">Criticism</option>
        </select>
      </label>
      <label class="field">
        <span>Message</span>
        <textarea name="message" required minlength="8" maxlength="1200" placeholder="Write specific, useful feedback for this task in English..."></textarea>
      </label>
      <button class="btn primary full" type="submit">Submit Feedback</button>
      <small>This form is locked to the opened task automatically.</small>
    </form>
  `;

  $("#feedbackForm").addEventListener("submit", submitFeedback);
}

async function submitFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button");
  const data = new FormData(form);
  button.disabled = true;
  button.textContent = "Submitting...";

  try {
    await apiPost("/api/feedback", {
      task_id: task.id,
      task_title: task.title,
      username: data.get("username"),
      category: data.get("category"),
      message: data.get("message"),
      client_id: getClientId()
    });

    markSubmitted(task.id);
    await loadFeedback();
    renderFeedbackPreview();
    renderForm();
  } catch (error) {
    if (error.status === 409) markSubmitted(task.id);
    renderForm(error.message);
  }
}

async function boot() {
  try {
    await loadTask();
    await loadFeedback();
    roomStatus.textContent = `${taskBucketLabel(task)} Task`;
    roomSubtext.textContent = isTodayTask(task) ? "" : "";
    renderTask();
    renderFeedbackPreview();
    renderForm();
  } catch (error) {
    roomStatus.textContent = "Failed";
    roomSubtext.textContent = error.message;
    taskPanel.innerHTML = `<p class="empty error">${escapeHtml(error.message)}</p>`;
    feedbackPanel.innerHTML = "";
    formPanel.innerHTML = "";
  }
}

boot();
