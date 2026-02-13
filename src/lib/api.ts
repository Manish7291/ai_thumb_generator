/**
 * API client - uses fetch for reliability.
 * Relative URLs work correctly with the page origin (handles any port).
 */

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid response: ${res.status}`);
  }
}

export async function apiPost<T = unknown>(
  path: string,
  body: object
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify(body),
  });
  const data = (await parseJson(res)) as { error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: getAuthHeader(),
  });
  const data = (await parseJson(res)) as { error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export async function apiPatch<T = unknown>(path: string, body?: object): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await parseJson(res)) as { error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
  const data = (await parseJson(res)) as { error?: string };
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

// Axios-style default export for compatibility
const api = {
  post: <T = unknown>(path: string, body: object) => apiPost<T>(path, body),
  get: <T = unknown>(path: string) => apiGet<T>(path),
  patch: <T = unknown>(path: string, body?: object) => apiPatch<T>(path, body),
  del: <T = unknown>(path: string) => apiDelete<T>(path),
};

export default api;
