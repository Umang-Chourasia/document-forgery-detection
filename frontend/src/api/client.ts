export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Free-tier ngrok tunnels serve an HTML "you're about to visit..." interstitial
 * to any request that looks like it's from a browser (based on User-Agent),
 * regardless of path or Accept header — including plain <img> requests. This
 * header tells ngrok to skip that and proxy straight through. It's harmless
 * to send when the backend isn't behind ngrok (e.g. a plain LAN IP) — unknown
 * headers are just ignored — so it's applied to every backend request rather
 * than conditionally.
 */
const BACKEND_HEADERS: HeadersInit = { "ngrok-skip-browser-warning": "true" };

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { timeoutMs = 30000, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { ...BACKEND_HEADERS, ...init.headers },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        `Request to ${path} failed with status ${response.status}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out — is the model server reachable?");
    }
    throw new ApiError(
      "Could not reach the model server. Check that it's running and reachable.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetches a binary resource (e.g. a heatmap image) from the backend, with
 * the same ngrok-bypass header, and returns it as a local blob: URL so
 * <img> tags and downstream fetches never touch the remote URL directly. */
export async function fetchBackendResourceAsObjectUrl(path: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: BACKEND_HEADERS });
  if (!response.ok) {
    throw new ApiError(`Failed to fetch ${path} (${response.status})`, response.status);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
