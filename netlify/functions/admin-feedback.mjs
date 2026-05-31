import { json } from "./_shared/http.mjs";
import { getAllFeedback } from "./_shared/feedback.mjs";

export default async function handler(request) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const expected = process.env.ADMIN_KEY || "";

  if (!expected || key !== expected) {
    return json({ ok: false, error: "Invalid admin key." }, 401);
  }

  try {
    const items = await getAllFeedback();
    return json({ ok: true, total: items.length, items });
  } catch (error) {
    return json({ ok: false, error: error.message }, 500);
  }
}
