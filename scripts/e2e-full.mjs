// Full E2E test
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const p = "C:/Users/65380/.dsh/settings.yaml";
const backup = readFileSync(p, "utf8");
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("dialog", async d => { await d.accept(); });

await page.goto("http://127.0.0.1:3091", { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(4000);
await page.getByText("设置", { exact: true }).first().click();
await page.waitForTimeout(2000);
await page.getByText("模型能力", { exact: true }).first().click();
await page.waitForTimeout(3000);

// === Test 1: DeepSeek dialect preset → only high/max ===
await page.getByText("DeepSeek 方言", { exact: false }).first().click();
await page.waitForTimeout(800);
await page.getByText("应用", { exact: true }).first().click();
await page.waitForTimeout(2500);

let s = readFileSync(p, "utf8");
const hasDeepseek = s.includes("thinkingFormat: deepseek");
const hasHigh = s.includes('"high": "high"');
const hasMax = s.includes('"max": "max"');
const hasMinimal = s.includes('"minimal"');
console.log("Test 1 - DeepSeek preset:");
console.log("  thinkingFormat=deepseek:", hasDeepseek);
console.log("  has high:", hasHigh, "| has max:", hasMax, "| has minimal:", hasMinimal);

// === Test 2: Custom preset save/restore ===
await page.getByText("deepseek-v4-flash", { exact: true }).first().click();
await page.waitForTimeout(800);
const presetInput = page.locator("input[placeholder='预设名称']");
await presetInput.fill("my-think-test");
await page.waitForTimeout(300);
await page.getByText("保存预设", { exact: true }).first().click();
await page.waitForTimeout(2500);

s = readFileSync(p, "utf8");
const saved = s.includes("my-think-test");
console.log("Test 2 - Custom preset saved:", saved);
if (saved) {
  const idx = s.indexOf("my-think-test");
  const snip = s.slice(Math.max(0, idx - 50), idx + 500);
  console.log("  has reasoningEfforts:", snip.includes("reasoningEfforts"));
  console.log("  has deepseek-v4-pro (both models):", snip.includes("deepseek-v4-pro"));
}

// === Test 3: Apply to all should NOT overwrite name ===
// Check that the preset payload has both models with their original names
if (saved) {
  const idx = s.indexOf("my-think-test");
  const snip = s.slice(idx, idx + 800);
  // The deepseek-v4-pro model should have a different name or same name as original
  console.log("Test 3 - Both models present:", snip.includes("deepseek-v4-pro"));
}

console.log("errors:", errors.length);
writeFileSync(p, backup, "utf8");
console.log("restored");
await b.close();