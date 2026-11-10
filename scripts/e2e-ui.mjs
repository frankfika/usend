#!/usr/bin/env node
// End-to-end UI check for USend.
//
// Drives the real app in a browser: headline rendering, the receive flow
// (which used to white-screen), a full file transfer between two contexts,
// the pairing-code copy button, clipboard paste, drag feedback and the
// responsive layouts. Exits non-zero when anything fails.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const shotDir = path.join(projectDir, ".playwright-mcp", "e2e");
const API_PORT = Number(process.env.USEND_E2E_API_PORT || 8899);
const WEB_PORT = Number(process.env.USEND_E2E_WEB_PORT || 5199);
const baseUrl = process.env.USEND_URL || `http://127.0.0.1:${WEB_PORT}`;

// The API rate-limits room creation per IP, so the suite talks to its own
// server instance rather than spending the dev server's hourly quota.
const children = [];

function startService(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: projectDir,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = (chunk) => {
    if (process.env.E2E_VERBOSE) process.stdout.write(`[${name}] ${chunk}`);
  };
  child.stdout.on("data", log);
  child.stderr.on("data", log);
  child.on("exit", (code) => {
    if (code && code !== 0 && process.env.E2E_VERBOSE) {
      process.stdout.write(`[${name}] exited with ${code}\n`);
    }
  });
  children.push(child);
  return child;
}

async function waitForHealth(url, attempts = 120) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`service did not come up: ${url}`);
}

function stopServices() {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
}

process.on("exit", stopServices);
process.on("SIGINT", () => {
  stopServices();
  process.exit(130);
});

if (!process.env.USEND_URL) {
  startService("api", process.execPath, ["server.mjs"], { PORT: String(API_PORT) });
  startService(
    "web",
    path.join(projectDir, "node_modules", ".bin", "vite"),
    ["--port", String(WEB_PORT), "--strictPort", "--host", "127.0.0.1"],
    { VITE_API_URL: `http://127.0.0.1:${API_PORT}/api` },
  );
  await waitForHealth(`http://127.0.0.1:${API_PORT}/api/health`);
  await waitForHealth(baseUrl);
}

await rm(shotDir, { recursive: true, force: true });
await mkdir(shotDir, { recursive: true });

const results = [];
const failures = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${detail && !ok ? ` — ${detail}` : ""}`);
}

const consoleErrors = [];
function watch(page, label) {
  page.on("pageerror", (e) => consoleErrors.push(`[${label}] pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/GitHub API|403|Failed to load resource/i.test(m.text())) {
      consoleErrors.push(`[${label}] console.error: ${m.text()}`);
    }
  });
}

async function newPage(context, label) {
  const page = await context.newPage();
  watch(page, label);
  return page;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function makeContext(lang) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
    locale: lang === "en" ? "en-US" : "zh-CN",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addInitScript((l) => {
    try {
      window.localStorage.setItem("usend:lang", l);
    } catch {}
  }, lang);
  return context;
}

// ---------------------------------------------------------------- 1. headlines
{
  const context = await makeContext("en");
  const page = await newPage(context, "en");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const h1 = (await page.locator(".hero h1").innerText()).replace(/\s+/g, " ").trim();
  check("EN headline keeps the space", h1 === "Send to another device", `got "${h1}"`);

  const accent = await page.locator(".hero h1 .accent").innerText();
  check("EN accent segment intact", accent === "another device", `got "${accent}"`);

  await page.getByRole("button", { name: "Receive", exact: true }).click();
  const h1r = (await page.locator(".hero h1").innerText()).replace(/\s+/g, " ").trim();
  check("EN receive headline keeps the space", h1r === "Receive from another device", `got "${h1r}"`);
  await context.close();
}

{
  const context = await makeContext("zh");
  const page = await newPage(context, "zh");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const h1 = (await page.locator(".hero h1").innerText()).replace(/\s+/g, " ").trim();
  check("ZH headline has no stray space", h1 === "传到另一台设备", `got "${h1}"`);
  await page.getByRole("button", { name: "接收", exact: true }).click();
  const h1r = (await page.locator(".hero h1").innerText()).replace(/\s+/g, " ").trim();
  check("ZH receive headline has no stray space", h1r === "接收来自另一台设备", `got "${h1r}"`);
  await context.close();
}

// ---------------------------------------------------------------- 2. receive flow
{
  const context = await makeContext("en");
  const page = await newPage(context, "recv");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Receive", exact: true }).click();
  await page.waitForSelector(".receive-entry", { timeout: 5000 });
  check("Receive panel renders (no white screen)", true);
  check("Receive panel heading visible", await page.locator(".receive-entry h2").isVisible());

  await page.getByPlaceholder("0000 0000").fill("48273165");
  await page.waitForTimeout(400);
  check("8-digit code does not crash the page", await page.locator(".receive-entry").isVisible());
  check(
    "Receive button becomes active",
    await page.getByRole("button", { name: /Connect device/ }).isEnabled(),
  );
  await page.screenshot({ path: path.join(shotDir, "receive-desktop.png"), fullPage: true });
  await context.close();
}

// ---------------------------------------------------------------- 3. full transfer
{
  const senderCtx = await makeContext("en");
  const receiverCtx = await makeContext("en");
  const sender = await newPage(senderCtx, "sender");
  const receiver = await newPage(receiverCtx, "receiver");

  await sender.goto(baseUrl, { waitUntil: "networkidle" });
  await receiver.goto(baseUrl, { waitUntil: "networkidle" });

  // Sender attaches a file through the real file input.
  const tmp = path.join(shotDir, "hello.txt");
  await writeFile(tmp, "hello from the e2e suite");
  await sender.locator('input[type="file"]').setInputFiles(tmp);

  await sender.waitForSelector(".dropzone.has-file", { timeout: 5000 });
  check("Chosen file shows in the dropzone", true);

  // Drag feedback
  await sender.evaluate(() => {
    const zone = document.querySelector(".dropzone");
    const dt = new DataTransfer();
    zone.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await sender.waitForTimeout(150);
  check(
    "Drag-over highlight applies",
    await sender.locator(".dropzone.is-dragover").count() > 0,
  );
  await sender.evaluate(() => {
    const zone = document.querySelector(".dropzone");
    const dt = new DataTransfer();
    zone.dispatchEvent(new DragEvent("dragleave", { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await sender.waitForTimeout(150);
  check(
    "Drag-over highlight clears",
    await sender.locator(".dropzone.is-dragover").count() === 0,
  );

  // Create the pairing code.
  await sender.getByRole("button", { name: /Create pairing code/ }).click();
  await sender.waitForSelector(".pair-ticket", { timeout: 15000 });
  const code = (await sender.locator(".pair-code").innerText()).replace(/\s+/g, "").trim();
  check("Pairing code is 8 digits", /^\d{8}$/.test(code), `got "${code}"`);

  // Copy button writes the code to the clipboard.
  await sender.locator(".pair-ticket").click();
  await sender.waitForTimeout(250);
  check(
    "Copy button confirms in the UI",
    await sender.locator(".pair-ticket.is-copied").count() > 0,
  );
  const clip = await sender.evaluate(() => navigator.clipboard.readText());
  check("Copy button copies the code", clip.replace(/\s+/g, "") === code, `clipboard "${clip}"`);

  // Receiver joins.
  await receiver.getByRole("button", { name: "Receive", exact: true }).click();
  await receiver.getByPlaceholder("0000 0000").fill(code);
  await receiver.getByRole("button", { name: /Connect device/ }).click();

  // Sender confirms the security code.
  await sender.waitForSelector(".verification-box", { timeout: 15000 });
  await sender.getByRole("button", { name: /Codes match/ }).click();

  // Receiver gets the file.
  await receiver.waitForSelector(".receive-inline-done", { timeout: 20000 });
  const name = await receiver.locator(".download-file > span").first().innerText();
  check("File arrives at the receiver", name.includes("hello.txt"), `got "${name}"`);
  const note = await receiver.locator(".delete-confirm").innerText();
  check("Receiver confirms the payload was destroyed", /deleted|已删除/i.test(note), note);

  await sender.waitForSelector(".destroyed-state", { timeout: 20000 });
  check("Sender shows the finished state", true);
  await sender.screenshot({ path: path.join(shotDir, "ready-desktop.png"), fullPage: true });
  await receiver.screenshot({ path: path.join(shotDir, "received-desktop.png"), fullPage: true });

  await senderCtx.close();
  await receiverCtx.close();
}

// ---------------------------------------------------------------- 4. paste to attach
{
  const context = await makeContext("en");
  const page = await newPage(context, "paste");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const file = new File(["pasted bytes"], "pasted-shot.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    window.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
    );
  });
  await page.waitForSelector(".dropzone.has-file", { timeout: 4000 }).catch(() => {});
  check("Pasted file is picked up", await page.locator(".dropzone.has-file").count() > 0);
  const title = await page.locator(".drop-title").innerText();
  check("Pasted file keeps its name", title.includes("pasted-shot.png"), title);
  await context.close();
}

// ---------------------------------------------------------------- 5. countdown urgency
{
  const context = await makeContext("en");
  const page = await newPage(context, "countdown");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles({
    name: "tick.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("tick"),
  });
  await page.locator("select").selectOption("1");
  await page.getByRole("button", { name: /Create pairing code/ }).click();
  await page.waitForSelector(".countdown", { timeout: 15000 });
  await page.waitForTimeout(2200);
  check(
    "Countdown turns urgent under 60s",
    await page.locator(".countdown.is-low, .countdown.is-critical").count() > 0,
  );
  await page.screenshot({ path: path.join(shotDir, "ready-low-countdown.png"), fullPage: true });
  await context.close();
}

// ---------------------------------------------------------------- 6. responsive
{
  for (const [label, width, height] of [["mobile", 390, 844], ["desktop", 1200, 900]]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      locale: "en-US",
      permissions: ["clipboard-read", "clipboard-write"],
    });
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem("usend:lang", "en");
      } catch {}
    });
    const page = await newPage(context, label);
    await page.goto(baseUrl, { waitUntil: "networkidle" });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`${label} has no horizontal overflow`, overflow <= 1, `${overflow}px`);

    await page.screenshot({ path: path.join(shotDir, `home-${label}.png`), fullPage: true });

    await page.getByRole("button", { name: "Receive", exact: true }).click();
    await page.waitForSelector(".receive-entry");
    await page.screenshot({ path: path.join(shotDir, `receive-${label}.png`), fullPage: true });
    await context.close();
  }
}


// ---------------------------------------------------------------- 7. text mode
{
  const senderCtx = await makeContext("en");
  const receiverCtx = await makeContext("en");
  const sender = await newPage(senderCtx, "text-sender");
  const receiver = await newPage(receiverCtx, "text-receiver");
  await sender.goto(baseUrl, { waitUntil: "networkidle" });
  await receiver.goto(baseUrl, { waitUntil: "networkidle" });

  await sender.getByRole("button", { name: "Text", exact: true }).click();
  await sender
    .getByPlaceholder("Paste some text, an address, or any temporary note\u2026")
    .fill("a short note\nbetween two devices");
  await sender.getByRole("button", { name: /Create pairing code/ }).click();
  await sender.waitForSelector(".pair-ticket", { timeout: 15000 });
  const code = (await sender.locator(".pair-code").innerText()).replace(/\s+/g, "").trim();

  await receiver.getByRole("button", { name: "Receive", exact: true }).click();
  await receiver.getByPlaceholder("0000 0000").fill(code);
  await receiver.getByRole("button", { name: /Connect device/ }).click();
  await sender.waitForSelector(".verification-box", { timeout: 15000 });
  await sender.getByRole("button", { name: /Codes match/ }).click();

  await receiver.waitForSelector(".text-result", { timeout: 20000 });
  const text = await receiver.locator(".text-result").innerText();
  check("Text payload arrives intact", text.includes("between two devices"), JSON.stringify(text));
  await senderCtx.close();
  await receiverCtx.close();
}

// ---------------------------------------------------------------- 8. passphrase
{
  const senderCtx = await makeContext("en");
  const receiverCtx = await makeContext("en");
  const sender = await newPage(senderCtx, "pp-sender");
  const receiver = await newPage(receiverCtx, "pp-receiver");
  await sender.goto(baseUrl, { waitUntil: "networkidle" });
  await receiver.goto(baseUrl, { waitUntil: "networkidle" });

  await sender.locator('input[type="file"]').setInputFiles({
    name: "secret.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("classified"),
  });
  await sender.getByRole("button", { name: /Transfer settings/ }).click();
  await sender.getByText("Set a receive password", { exact: true }).click();
  await sender.getByPlaceholder("At least 8 characters").fill("hunter2hunter2");
  await sender.getByRole("button", { name: /Create pairing code/ }).click();
  await sender.waitForSelector(".pair-ticket", { timeout: 15000 });
  const code = (await sender.locator(".pair-code").innerText()).replace(/\s+/g, "").trim();

  await receiver.getByRole("button", { name: "Receive", exact: true }).click();
  await receiver.getByPlaceholder("0000 0000").fill(code);
  await receiver.getByRole("button", { name: /Connect device/ }).click();
  await receiver.waitForSelector(".receive-passphrase", { timeout: 10000 });
  check("Receiver is asked for the password", true);
  await receiver.locator(".receive-passphrase input").fill("hunter2hunter2");
  await receiver.getByRole("button", { name: /Connect and receive/ }).click();

  await sender.waitForSelector(".verification-box", { timeout: 15000 });
  await sender.getByRole("button", { name: /Codes match/ }).click();
  await receiver.waitForSelector(".receive-inline-done", { timeout: 20000 });
  check("Passphrase-protected transfer completes", true);

  await senderCtx.close();
  await receiverCtx.close();
}

// ---------------------------------------------------------------- 9. cancel transfer
{
  const context = await makeContext("en");
  const page = await newPage(context, "cancel");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles({
    name: "cancel.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("cancel me"),
  });
  await page.getByRole("button", { name: /Create pairing code/ }).click();
  await page.waitForSelector(".pair-ticket", { timeout: 15000 });
  await page.getByRole("button", { name: /Cancel transfer/ }).click();
  await page.waitForSelector(".destroyed-state", { timeout: 10000 });
  check("Cancelling ends the transfer cleanly", true);
  check(
    "Cancelling keeps the ready page on screen",
    await page.locator(".ready-panel").isVisible(),
  );
  check(
    "Cancelling does not bounce back to the home screen",
    await page.locator(".hero h1").count() === 0,
  );
  const cancelled = await page.locator(".destroyed-state").innerText();
  check("Cancelled state explains itself", cancelled.length > 0, cancelled);
  await page.screenshot({ path: path.join(shotDir, "ready-cancelled.png"), fullPage: true });
  await context.close();
}

// ---------------------------------------------------------------- 9b. expiry
{
  const context = await makeContext("en");
  const page = await newPage(context, "expiry");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles({
    name: "expire.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("expire me"),
  });
  await page.locator("select").selectOption("1");
  await page.getByRole("button", { name: /Create pairing code/ }).click();
  await page.waitForSelector(".pair-ticket", { timeout: 15000 });
  // The code lives for one minute; wait for it to run out.
  await page.waitForSelector(".destroyed-state", { timeout: 80000 });
  const expired = await page.locator(".destroyed-state").innerText();
  check("Expired transfer ends in place", /expired|到期/i.test(expired), expired);
  check(
    "Expired transfer keeps the ready page on screen",
    await page.locator(".ready-panel").isVisible(),
  );
  await page.screenshot({ path: path.join(shotDir, "ready-expired.png"), fullPage: true });
  await context.close();
}

// ---------------------------------------------------------------- 10. error paths
{
  const context = await makeContext("en");
  const page = await newPage(context, "errors");
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // A file over the 20 MB ceiling is rejected with a readable message.
  await page.evaluate(() => {
    const big = new File([new Uint8Array(21 * 1024 * 1024)], "big.bin");
    const dt = new DataTransfer();
    dt.items.add(big);
    window.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }),
    );
  });
  await page.waitForSelector(".error-note", { timeout: 5000 });
  const note = await page.locator(".error-note").innerText();
  check("Oversized file is rejected", /20 MB/i.test(note), note);

  // An unknown pairing code shows the expired/not-found message.
  await page.getByRole("button", { name: "Receive", exact: true }).click();
  await page.getByPlaceholder("0000 0000").fill("00000000");
  await page.getByRole("button", { name: /Connect device/ }).click();
  await page.waitForSelector(".error-note", { timeout: 10000 });
  const err = await page.locator(".error-note").innerText();
  check("Unknown code shows a friendly error", err.length > 0 && !/undefined/i.test(err), err);
  await context.close();
}

// ---------------------------------------------------------------- 11. chrome
{
  const context = await makeContext("en");
  const page = await newPage(context, "chrome");
  await page.goto(baseUrl, { waitUntil: "networkidle" });

  // Language switch.
  await page.getByRole("button", { name: /Switch to/ }).click();
  await page.waitForTimeout(300);
  const zhH1 = (await page.locator(".hero h1").innerText()).replace(/\s+/g, " ").trim();
  check("Language switch switches to Chinese", zhH1 === "传到另一台设备", zhH1);
  await page.getByRole("button", { name: /切换到/ }).click();
  await page.waitForTimeout(300);
  const enH1 = (await page.locator(".hero h1").innerText()).replace(/\s+/g, " ").trim();
  check("Language switch switches back to English", enH1 === "Send to another device", enH1);

  // The "how it works" disclosure.
  await page.getByRole("button", { name: /How security works/ }).click();
  await page.waitForSelector(".how-step", { timeout: 5000 });
  check("How-it-works panel expands", await page.locator(".how-step").first().isVisible());
  await page.getByRole("button", { name: /How security works/ }).click();
  await page.waitForTimeout(300);
  check("How-it-works panel collapses", await page.locator(".how-step").first().isHidden());
  await context.close();
}

// ---------------------------------------------------------------- 12. mobile ready
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: "en-US",
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("usend:lang", "en");
    } catch {}
  });
  const page = await newPage(context, "mobile-ready");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').setInputFiles({
    name: "mobile.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("mobile"),
  });
  await page.getByRole("button", { name: /Create pairing code/ }).click();
  await page.waitForSelector(".pair-ticket", { timeout: 15000 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("Ready page fits the mobile viewport", overflow <= 1, `${overflow}px`);
  await page.screenshot({ path: path.join(shotDir, "ready-mobile.png"), fullPage: true });
  await context.close();
}


// ---------------------------------------------------------------- 13. star count
{
  // A fresh count from the API is shown.
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    locale: "en-US",
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("usend:lang", "en");
    } catch {}
  });
  const page = await newPage(context, "stars-ok");
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stargazers_count: 42 }),
    }),
  );
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".gh-star-count", { timeout: 8000 }).catch(() => {});
  const badge = await page.locator(".gh-star-count").innerText().catch(() => "");
  check("Fresh star count is displayed", badge.includes("42"), `badge "${badge}"`);
  await context.close();
}

{
  // The API fails, but we already know the number — keep showing it.
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    locale: "en-US",
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("usend:lang", "en");
      window.localStorage.setItem(
        "usend:stars",
        JSON.stringify({ s: 19, t: Date.now() - 60 * 60 * 1000, f: 0 }),
      );
    } catch {}
  });
  const page = await newPage(context, "stars-cached");
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const badge = await page.locator(".gh-star-count").innerText().catch(() => "");
  check("Cached star count survives a failed API call", badge.includes("19"), `badge "${badge}"`);
  const label = await page.locator(".gh-star-btn > span").first().innerText();
  check("Failed refresh does not claim the project is unstarred", !/first/i.test(label), label);
  await context.close();
}

{
  // The API fails and we never had a number — say nothing false.
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    locale: "en-US",
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("usend:lang", "en");
    } catch {}
  });
  const page = await newPage(context, "stars-unknown");
  await page.route("https://api.github.com/**", (route) => route.abort());
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const label = await page.locator(".gh-star-btn > span").first().innerText();
  check("Unknown star count does not claim to be first", !/first/i.test(label), label);
  check("Unknown star count shows no number", (await page.locator(".gh-star-count").count()) === 0);
  await context.close();
}

{
  // The button must point at the same repository the count comes from.
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    locale: "en-US",
  });
  await context.addInitScript(() => {
    try {
      window.localStorage.setItem("usend:lang", "en");
    } catch {}
  });
  const page = await newPage(context, "stars-link");
  let requested = "";
  await page.route("https://api.github.com/**", (route) => {
    requested = route.request().url();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stargazers_count: 19 }),
    });
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".gh-star-count", { timeout: 8000 }).catch(() => {});
  const href = await page.locator(".gh-star-btn").getAttribute("href");
  const slug = requested.replace("https://api.github.com/repos/", "").replace(/\/$/, "");
  check(
    "Star count and star link point at the same repository",
    href.endsWith(`/${slug}`),
    `link ${href} vs api ${slug}`,
  );
  await context.close();
}

await browser.close();
stopServices();

check("No uncaught page errors", consoleErrors.length === 0, consoleErrors.join(" | "));

console.log(`\n${results.length - failures.length}/${results.length} checks passed`);
if (failures.length) {
  console.error("\nFAILED:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("Screenshots in .playwright-mcp/e2e");
