const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

function emitApiError(message: string, status?: number) {
  window.dispatchEvent(
    new CustomEvent("app:apiError", {
      detail: { message, status },
    })
  );
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  // 204/205 no content: ok -> null
  if ((res.status === 204 || res.status === 205) && res.ok) return null;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      text ||
      `${res.status} ${res.statusText}`;

    emitApiError(typeof msg === "string" ? msg : JSON.stringify(msg), res.status);
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return data;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
