const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`http://localhost:8000${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    ...init,
  });

  // 204/205 = no content, don’t try to parse JSON
  if (res.status === 204 || res.status === 205) {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return null;
  }

  // Some endpoints may return empty body with 200/201 too; handle that
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    // keep existing error behavior
    throw new Error(text || `${res.status} ${res.statusText}`);
  }

  return data;
}