import { json, readJson } from "./_shared/http.mjs";
import { cleanText } from "./_shared/utils.mjs";
import { getFeedback, addFeedback } from "./_shared/feedback.mjs";

export default async function handler(request) {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const taskId = cleanText(url.searchParams.get("task_id"), 120);
      if (!taskId) return json({ ok: false, error: "Missing task_id." }, 400);

      const data = await getFeedback(taskId, {
        all: url.searchParams.get("all") === "1",
        limit: Number(url.searchParams.get("limit") || 2)
      });
      return json({ ok: true, ...data });
    }

    if (request.method === "POST") {
      const body = await readJson(request);
      const result = await addFeedback(request, body);
      return json(result.data, result.status);
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (error) {
    return json({ ok: false, error: error.message }, 500);
  }
}
