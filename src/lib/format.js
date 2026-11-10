// USend — small formatting and environment helpers shared across the UI.

// One slug feeds both the link and the API, so the star count can never
// drift away from the repository the button points at.
export const REPO_SLUG = "frankfika/usend";
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const REPO_API_URL = `https://api.github.com/repos/${REPO_SLUG}`;

export const fmt = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

// Detect when the page was opened over plain HTTP. The Worker will already
// have issued a 308, but iOS Safari (and some embedded WebViews) suppress
// that hop and keep serving the HTTP version — surfacing a clear banner
// helps the user understand the failure.
export const isInsecureProtocol = () => {
  if (typeof window === "undefined") return false;
  const { hostname, protocol } = window.location;
  if (protocol === "https:") return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  return true;
};
