// E2E test: custom preset save/restore + dialect preset levels
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const settingsPath = "C:/Users/65380/.dsh/settings.yaml";
const backup = readFileSync(settingsPath, "utf8");
const exe = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
p.on("pageerror", e => errors.push(String(e)));
p.on("dialog", async d => { await d.accept(); });

await p.goto("http://127.0.0.1:3091", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(4000);
await p.getByText("设置", { exact: true }).first().click();
await p.waitForTimeout(2000);
await p.getByText("模型能力", { exact: true }).first().click();
await p.waitForTimeout(3000);
await p.getByText("deepseek-v4-flash", { exact: true }).first().click();
await p.waitForTimeout(800);

// Fill preset name input
const input = p.locator("input[placeholder='预设名称']");
await input.fill("my-preset-test");
await p.waitForTimeout(300);

// Click Save preset button
await p.getByText("保存预设", { exact: true }).first().click();
await p.waitForTimeout(2500);

const after = readFileSync(settingsPath, "utf8");
const saved = after.includes("my-preset-test");
console.log("preset saved:", saved);
if (saved) {
  const idx = after.indexOf("my-preset-test");
  const snippet = after.slice(Math.max(0, idx - 50), idx + 500);
  console.log("  has reasoningEfforts:", snippet.includes("reasoningEfforts"));
  console.log("  has high:", snippet.includes('"high"'));
  console.log("  has max:", snippet.includes('"max"'));
  console.log("  has minimal:", snippet.includes('"minimal"'));
  console.log("  has deepseek-v4-pro:", snippet.includes("deepseek-v4-pro"));
}
console.log("errors:", errors.length);
writeFileSync(settingsPath, backup, "utf8");
console.log("restored");
await b.close();