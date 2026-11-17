export const token = () => localStorage.getItem("token");

export async function api(path, { method = "GET", body, form, signal } = {}) {
  const headers = {};
  if (token()) headers.Authorization = "Bearer " + token();
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch("/api" + path, {
    method,
    headers,
    signal,
    body: form || (body ? JSON.stringify(body) : undefined),
  });

  const data = res.status === 204 ? null : await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data?.detail ||
      (typeof data === "object" ? Object.values(data || {}).flat().join(" ") : "") ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

/** Fetch all pages of a paginated DRF endpoint and return a flat array. */
export async function apiAll(path) {
  let url = "/api" + path;
  let results = [];
  while (url) {
    const headers = {};
    if (token()) headers.Authorization = "Bearer " + token();
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (Array.isArray(data)) return data;        // non-paginated
    results = results.concat(data.results || []);
    url = data.next;
  }
  return results;
}

/**
 * api() with a timeout. Rejects with a timeout error if the request takes
 * longer than timeoutMs milliseconds. Automatically cancels the fetch.
 */
export async function apiWithTimeout(path, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await api(path, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error("Request timed out. The server is taking too long. Please try again.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
