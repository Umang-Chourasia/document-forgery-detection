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

/**
 * Request timeouts for the analysis pipeline.
 *
 * Without these a hung backend leaves the pipeline waiting forever: the UI
 * sits on a processing stage and the Supabase row stays PROCESSING with no
 * way to recover. A timeout turns that into an ordinary, reportable failure.
 *
 * The values are generous because both calls are legitimately slow — CAT-Net
 * inference takes seconds, and the narrative service waits on a language
 * model whose latency varies widely (25s and >180s have both been observed
 * for the same request). They are there to catch a hang, not to police
 * normal slowness.
 */
export const CATNET_TIMEOUT_MS = 120_000;
export const NARRATIVE_TIMEOUT_MS = 180_000;

/** True when a fetch rejected because its AbortController fired. */
export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/**
 * fetch() with an AbortController-based deadline. Rejects with an AbortError
 * on timeout; otherwise behaves exactly like fetch, so success paths are
 * unchanged. The timer is always cleared, including on failure.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
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
      throw new ApiError("Request timed out — is the analysis service reachable?");
    }
    throw new ApiError(
      "Could not reach the analysis service. Check that it's running and reachable.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Fetches a binary resource (e.g. a heatmap image) from the backend, with
 * the same ngrok-bypass header. Shares the CAT-Net deadline: this hits the
 * same server, so it can hang the pipeline in exactly the same way. */
export async function fetchBackendResourceAsBlob(path: string): Promise<Blob> {
  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      { headers: BACKEND_HEADERS },
      CATNET_TIMEOUT_MS,
    );
  } catch (err) {
    if (isAbortError(err)) {
      throw new ApiError(
        `The analysis service did not return the result within ${CATNET_TIMEOUT_MS / 1000} seconds.`,
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new ApiError(`Failed to fetch ${path} (${response.status})`, response.status);
  }
  return response.blob();
}

/** As above, but returns a local blob: URL so <img> tags and downstream
 * fetches never touch the remote URL directly. */
export async function fetchBackendResourceAsObjectUrl(path: string): Promise<string> {
  const blob = await fetchBackendResourceAsBlob(path);
  return URL.createObjectURL(blob);
}
