export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function requireMethod(request, allowed) {
  if (!allowed.includes(request.method)) {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }
  return null;
}
