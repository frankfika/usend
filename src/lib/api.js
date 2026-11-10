// USend — API client.
//
// Every request is bounded by a timeout and can be cancelled by the caller,
// so a stalled connection can never freeze the transfer UI. Errors surface
// as `ApiError` whose `message` is the machine-readable error code, which is
// what the UI maps to a translated message.

const isViteDevelopment = /^517\d$/.test(window.location.port);

// In local development Vite may move to another port; the API remains on 8787.
// VITE_API_URL can override this for a hosted deployment or reverse proxy.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (isViteDevelopment
    ? `${window.location.protocol}//${window.location.hostname}:8787/api`
    : "/api");

export const DEFAULT_TIMEOUT = 15_000;
// Uploading a 20 MB payload over a slow link needs a much longer budget.
export const UPLOAD_TIMEOUT = 180_000;

export class ApiError extends Error {
  constructor(code, status = 0) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export const isAbort = (error) => error?.code === "aborted";

// Performs the fetch with a timeout and optional caller-supplied cancellation.
export async function request(path, options = {}) {
  const { timeout = DEFAULT_TIMEOUT, signal, ...init } = options;
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("timeout", "TimeoutError"));
  }, timeout);

  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) forwardAbort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    return await fetch(`${API_BASE}${path}`, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new ApiError("timeout");
    if (signal?.aborted) throw new ApiError("aborted");
    throw new ApiError("network_error");
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

export async function api(path, options = {}) {
  const response = await request(path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(data.error || "network_error", response.status);
  return data;
}

export async function apiBinary(path, options = {}) {
  const response = await request(path, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.error || "network_error", response.status);
  }
  return new Uint8Array(await response.arrayBuffer());
}
