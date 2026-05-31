import { json } from "./_shared/http.mjs";
import { fetchAxisTasks, getTaskCatalog } from "./_shared/axis.mjs";

export default async function handler(request) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "sync";
    const result = mode === "catalog"
      ? { tasks: await getTaskCatalog(), demo: false }
      : await fetchAxisTasks(request.url);

    return json({
      ok: true,
      tasks: result.tasks,
      live_count: result.live_count ?? result.tasks.filter((task) => task.active).length,
      collected_count: result.collected_count ?? result.tasks.length,
      demo: result.demo,
      synced_at: new Date().toISOString()
    });
  } catch (error) {
    return json({ ok: false, error: error.message }, 500);
  }
}
