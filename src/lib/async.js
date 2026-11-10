// USend — small async helpers.

// A sleep that resolves immediately when the caller aborts, so polling
// loops stop promptly instead of waiting out the remaining delay.
export const delay = (ms, signal) =>
  /** @type {Promise<void>} */
  (new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  }));
