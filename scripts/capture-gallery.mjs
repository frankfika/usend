#!/usr/bin/env node

// Product Hunt gallery shots at the required 1270×760. English UI.
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(scriptDir, "..");
const outputDir = path.join(projectDir, "docs", "assets", "gallery");
const baseUrl = process.env.USEND_URL || "http://localhost:5173";

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1270, height: 760 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  locale: "en-US",
});
await context.addInitScript(() => {
  try {
    window.localStorage.setItem("usend:lang", "en");
  } catch {}
});
const page = await context.newPage();

async function capture(name) {
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    type: "png",
    animations: "disabled",
  });
  console.log(`Captured docs/assets/gallery/${name}.png`);
}

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await capture("1-home");

  await page.getByRole("button", { name: "Text" }).click();
  await page
    .getByPlaceholder("Paste some text, an address, or any temporary note…")
    .fill("A short note that briefly exists only between two devices.");
  await capture("2-text");

  await page.getByRole("button", { name: /Transfer settings/ }).click();
  await page.getByText("Same network only", { exact: true }).click();
  await page.getByText("Set a receive password", { exact: true }).click();
  await page.getByPlaceholder("At least 8 characters").fill("usend-demo-passphrase");
  await capture("3-settings");

  await page.getByRole("button", { name: /Create pairing code/ }).click();
  await page.waitForSelector(".pair-code", { timeout: 15000 });
  await capture("4-pairing-code");

  await page.getByRole("button", { name: "Send something new" }).click();
  await page.getByRole("button", { name: "Receive", exact: true }).click();
  await page.getByPlaceholder("0000 0000").fill("48273165");
  await capture("5-receive");
} finally {
  await browser.close();
}
