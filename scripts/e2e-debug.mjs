// E2E test: debug custom preset save
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const settingsPath = "C:/Users/65380/.dsh/settings.yaml";
const backup = readFileSync(settingsPath, "utf8");
const exe = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
p.on("console", m => logs.push(m.type() + ":" + m.text().slice(0, 120)));
p.on("dialog", async d => { logs.push("DIALOG:" + d.message().slice(0, 80)); await d.accept(); });

await p.goto("http://127.0.0.1:3091", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(4000);
await p.getByText("设置", { exact: true }).first().click();
await p.waitForTimeout(2000);
await p.getByText("模型能力", { exact: true }).first().click();
await p.waitForTimeout(3000);

// Check if preset input exists
const presetInput = p.locator("input[placeholder='预设名称']");
const inputCount = await presetInput.count();
console.log("preset input count:", inputCount);

// Check if save button exists
const saveBtn = p.getByText("保存预设", { exact: true }).first();
const saveVisible = await saveBtn.isVisible().catch(() => false);
console.log("save btn visible:", saveVisible);

// Capture the page body text to see what's there
const bodyText = await p.evaluate(() => document.body.innerText);
console.log("page has '预设名称':", bodyText.includes("预设名称"));
console.log("page has '保存预设':", bodyText.includes("保存预设"));

// Try saving
if (inputCount > 0) {
  await presetInput.fill("test-preset");
  await p.waitForTimeout(300);
  await saveBtn.click();
  await p.waitForTimeout(3000);
  const after = readFileSync(settingsPath, "utf8");
  console.log("saved:", after.includes("test-preset"));
}
console.log("--- console logs ---");
logs.forEach(l => console.log("  " + l));
writeFileSync(settingsPath, backup, "utf8");
console.log("restored");
await b.close();