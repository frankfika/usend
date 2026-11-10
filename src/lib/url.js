// USend — deep-link helpers.
//
// The PWA manifest ships "Send" and "Receive" shortcuts that point at
// /?mode=send and /?mode=receive, so the home view has to honour them.

export const MODES = ["send", "receive"];

export function parseMode(search) {
  try {
    const value = new URLSearchParams(search || "").get("mode");
    return MODES.includes(value) ? value : "send";
  } catch {
    return "send";
  }
}

export function readMode() {
  if (typeof window === "undefined") return "send";
  return parseMode(window.location.search);
}
