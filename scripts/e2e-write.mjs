// End-to-end write smoke test: edits one real field (kimi-k2.5
// contextWindow in route qwen) through the UI, then reports whether the
// change landed in settings.yaml. The caller restores a backup afterwards.
//
// Run: node scripts/e2e-write.mjs [baseURL]

import { chromium } from "playwright-core";
import { existsSync, readFileSync } from "node:fs";

const baseURL = process.argv[2] ?? "http://127.0.0.1:3091";
const SETTINGS_PATH = "C:/Users/65380/.dsh/settings.yaml";
const NEW_VALUE = "64000";
const DISPLAY = "64K";

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(baseURL, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4000);

async function clickFirst(texts) {
  for (const label of texts) {
    const el = page.getByText(label, { exact: true }).first();
    if ((await el.count()) > 0) {
      await el.click({ timeout: 5000 });
      return label;
    }
  }
  return null;
}

const clickedSettings = await clickFirst(["Settings", "设置"]);
await page.waitForTimeout(2000);
const clickedSection = await clickFirst(["Model Capability", "模型能力"]);
await page.waitForTimeout(3000);

const before = readFileSync(SETTINGS_PATH, "utf8");
let result = { clickedSettings, clickedSection, step: "no-op", beforeHas64k: before.includes(NEW_VALUE) };

if (clickedSection) {
  const modelCard = page
    .getByText("kimi-k2.5", { exact: true })
    .first()
    .locator("xpath=ancestor::div[.//input]");
  const inputs = modelCard.locator("input");
  const count = await inputs.count();
  const textInputs = [];
  for (let i = 0; i < count; i++) {
    const type = await inputs.nth(i).getAttribute("type");
    if (type === null || type === "text") textInputs.push(i);
  }
  // order inside a model card: [name, contextWindow, maxTokens, ...levels]
  const contextIndex = textInputs[1];
  if (contextIndex === undefined) {
    result.step = "contextWindow input not found";
  } else {
    const input = inputs.nth(contextIndex);
    await input.fill(DISPLAY);
    await input.press("Enter");
    await page.waitForTimeout(1600);
    const after = readFileSync(SETTINGS_PATH, "utf8");
    result = {
      ...result,
      step: "filled",
      inputIndex: contextIndex,
      inputCount: count,
      textInputIndexes: textInputs,
      landed: after.includes(NEW_VALUE),
      beforeHas64k: before.includes(NEW_VALUE),
    };
  }
}

result.consoleErrors = errors;
console.log(JSON.stringify(result, null, 2));
await browser.close();