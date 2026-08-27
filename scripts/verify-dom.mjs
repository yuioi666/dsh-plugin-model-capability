// DOM verification v3: shadow-DOM-aware. Playwright locators pierce open
// shadow roots; the evaluate helper additionally walks shadow roots to find
// the section and dump its text with real vizibility data.

import { chromium } from "playwright-core";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const baseURL = process.argv[2] ?? "http://127.0.0.1:3091";
const outDir = resolve("img");
const CHROME_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = CHROME_PATHS.find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
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
await page.waitForTimeout(3500);

// 1) Locator-based presence checks (pierce shadow DOM).
const probe = {};
for (const [key, texts] of Object.entries({
  presetTitle: ["One-click presets", "一键预设"],
  safeGateway: ["Safe gateway mode", "安全网关模式"],
  pageIntro: [
    "Manage the llm-pi-ai provider routes",
    "管理 llm-pi-ai 提供商路由",
  ],
  langField: ["Page language", "页面语言"],
  routeTitle: ["Route ID", "路由 ID"],
  compatIntro: [
    "compat fields describe what the gateway understands",
    "compat 字段描述网关能理解什么",
  ],
  qwenRoute: ["qwen-token-plan", "qwen"],
  deepseekModel: ["deepseek-v4-flash-0731", "kimi-k2.5", "Qwen3.8-Max"],
  thinkingHint: [
    "Key = selectable level",
    "键 = 可选等级",
  ],
  diagnosticsTitle: ["Advisory checks", "建议检查"],
})) {
  probe[key] = {};
  for (const text of texts) {
    const locator = page.getByText(text, { exact: false }).first();
    const count = await locator.count();
    if (count > 0) {
      const visible = await locator.isVisible().catch(() => false);
      probe[key][text] = { count, visible };
    }
  }
}

// 2) Shadow-piercing text dump of the settings surface.
const dump = await page.evaluate(() => {
  const results = [];
  const seen = new Set();
  const visit = (root, depth) => {
    if (depth > 12 || results.length > 60) return;
    for (const el of root.querySelectorAll("*")) {
      if (results.length > 60) return;
      if (seen.has(el)) continue;
      seen.add(el);
      if (el.shadowRoot) visit(el.shadowRoot, depth + 1);
      const own = el.childNodes.length === 1 && el.childNodes[0].nodeType === 3;
      if (own) {
        const text = el.textContent.trim();
        if (text && text.length < 80) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            results.push(`${el.tagName}:${text}`);
          }
        }
      }
    }
  };
  visit(document.body, 0);
  return results;
});

const report = {
  baseURL,
  clickedSettings,
  clickedSection,
  probe,
  shadowTextSample: dump.slice(0, 80),
  consoleErrors: errors,
};
writeFileSync(join(outDir, "verify-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();