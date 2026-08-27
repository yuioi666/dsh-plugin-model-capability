// Final README screenshot capture. Each shot scrolls its target element into
// view first, so the PNG content is deterministic regardless of layout order.
//   01-app-landing          app home
//   02-settings-nav         settings page with the Model Capability entry
//   03-top-en               section top incl. one-click presets, English
//   04-model-en             a model editor scrolled into view
//   05-compat-zh            route-level Gateway compatibility fold open, zh
//   06-top-zh               section top incl. presets, Chinese
// Run: node scripts/screenshots.mjs [baseURL] [outDir]

import { chromium } from "playwright-core";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const baseURL = process.argv[2] ?? "http://127.0.0.1:3091";
const outDir = resolve(process.argv[3] ?? "img");
mkdirSync(outDir, { recursive: true });

const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));
if (!executablePath) throw new Error("no Chrome/Edge found");

const errors = [];
const steps = [];
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

async function shot(name) {
  await page.screenshot({ path: join(outDir, name) });
  console.log("  saved", name);
}

async function clickFirst(texts, { exact = true } = {}) {
  for (const label of texts) {
    const el = page.getByText(label, { exact }).first();
    if ((await el.count()) > 0 && (await el.isVisible().catch(() => false))) {
      await el.click({ timeout: 5000 });
      return label;
    }
  }
  return null;
}

/** scroll the first match of any text into view; returns the matched text */
async function scrollInto(texts, { exact = false } = {}) {
  for (const label of texts) {
    const el = page.getByText(label, { exact }).first();
    if ((await el.count()) > 0) {
      // native scrollIntoView walks every scrollable ancestor (including the
      // settings surface's own scroller inside shadow DOM)
      await el.evaluate((n) => n.scrollIntoView({ block: "center", inline: "nearest" }));
      await page.waitForTimeout(600);
      return label;
    }
  }
  return null;
}

async function setOurLanguage(value) {
  const selects = page.locator("select");
  const n = await selects.count();
  for (let i = 0; i < n; i++) {
    const values = await selects.nth(i).evaluate((s) => [...s.options].map((o) => o.value));
    if (values.includes("follow") && values.includes("en") && values.includes("zh")) {
      await selects.nth(i).selectOption(value);
      await page.waitForTimeout(1200);
      console.log(`  language select[${i}] -> ${value}`);
      return true;
    }
  }
  throw new Error("language select not found");
}

console.log("opening", baseURL);
await page.goto(baseURL, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4500);
await shot("01-app-landing.png");

await clickFirst(["Settings", "设置"]);
await page.waitForTimeout(2500);
await shot("02-settings-nav.png");
steps.push({ shot: "02-settings-nav.png", navEntry: await page.getByText("模型能力", { exact: true }).first().isVisible().catch(() => false) || undefined });

await clickFirst(["Model Capability", "模型能力"]);
await page.waitForTimeout(3000);

// --- EN top with presets ---
await setOurLanguage("en");
const enScroll = await scrollInto(["One-click presets", "一键把精选配置", "One-click apply curated"]);
await scrollInto(["Advisory checks", "建议检查"]);
const enProbe = {
  presets: await page.getByText("One-click presets", { exact: false }).first().isVisible().catch(() => false),
  diagnostics: await page.getByText("Advisory checks", { exact: false }).first().isVisible().catch(() => false),
  route: await page.getByText("Route ID", { exact: false }).first().isVisible().catch(() => false),
};
await shot("03-top-en.png");
steps.push({ shot: "03-top-en.png", scrolledTo: enScroll, ...enProbe });

// --- a model editor scrolled into view (EN): pick a mid-list model so the
// view pans well past the presets block into the model cards ---
const modelId = await scrollInto(["qwen3-coder-next", "glm-5", "qwen3.5-397b-a17b", "kimi-k2.5"]);
const modelProbe = {
  model: modelId,
  levelHint: await page.getByText("Key = selectable level", { exact: false }).first().isVisible().catch(() => false),
};
await shot("04-model-en.png");
steps.push({ shot: "04-model-en.png", ...modelProbe });

// --- ZH: route-level Gateway compatibility fold open ---
await setOurLanguage("zh");
const compatScroll = await scrollInto(["网关兼容性", "Gateway compatibility"]);
const compatTitle = await clickFirst(["网关兼容性", "Gateway compatibility (advanced)", "Gateway compatibility"]);
await page.waitForTimeout(900);
const compatProbe = {
  compatTitle,
  compatScrolled: compatScroll,
  compatRow: await page.getByText("supportsDeveloperRole", { exact: false }).first().isVisible().catch(() => false),
};
// re-scroll the fold header so the opened body is in frame
await scrollInto(["网关兼容性", "Gateway compatibility"]);
await page.waitForTimeout(400);
await shot("05-compat-zh.png");
steps.push({ shot: "05-compat-zh.png", ...compatProbe });

// --- ZH top with presets ---
await scrollInto(["一键预设", "One-click presets", "一键把精选配置"]);
const zhProbe = {
  presets: await page.getByText("一键预设", { exact: false }).first().isVisible().catch(() => false),
  diagnostics: await page.getByText("建议检查", { exact: false }).first().isVisible().catch(() => false),
};
await shot("06-top-zh.png");
steps.push({ shot: "06-top-zh.png", ...zhProbe });

await browser.close();
writeFileSync(join(outDir, "screenshot-report.json"), JSON.stringify({ steps, errors }, null, 2));
console.log("console/page errors:", errors.length);
for (const e of errors) console.log("  -", e.slice(0, 200));
console.log("report:", join(outDir, "screenshot-report.json"));
console.log(JSON.stringify(steps, null, 2));