// Debug: check writable state and save behavior
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";

const settingsPath = "C:/Users/65380/.dsh/settings.yaml";
const backup = readFileSync(settingsPath, "utf8");
const exe = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const b = await chromium.launch({ executablePath: exe, headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
p.on("console", m => logs.push(m.type() + ":" + m.text().slice(0, 150)));

await p.goto("http://127.0.0.1:3091", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(4000);
await p.getByText("设置", { exact: true }).first().click();
await p.waitForTimeout(2000);
await p.getByText("模型能力", { exact: true }).first().click();
await p.waitForTimeout(3000);

// Check writable state
const writable = await p.evaluate(() => {
  // Try to find store via React fiber
  const all = document.querySelectorAll("*");
  for (const el of all) {
    const keys = Object.keys(el);
    const fKey = keys.find(k => k.startsWith("__reactFiber"));
    if (fKey) {
      let fiber = el[fKey];
      while (fiber) {
        if (fiber.memoizedState?.queue) {
          const q = fiber.memoizedState.queue;
          if (q && q.lastRenderedState) {
            const s = q.lastRenderedState;
            if (s && typeof s === "object" && s.writable !== undefined) {
              return { writable: s.writable, ok: true };
            }
          }
        }
        fiber = fiber.return;
      }
    }
  }
  return { ok: false };
});
console.log("writable check:", JSON.stringify(writable));

// Check if save button is enabled
const saveBtn = p.getByText("保存预设", { exact: true }).first();
const isDisabled = await saveBtn.getAttribute("disabled");
console.log("save btn disabled attr:", isDisabled);

// Check button's parent element
const btnParent = p.locator("button:has-text('保存预设')").first();
const btnDisabled = await btnParent.getAttribute("disabled");
console.log("button has disabled:", btnDisabled);

// Try to click the save button directly
const presetInput = p.locator("input[placeholder='预设名称']");
await presetInput.fill("my-test");
await p.waitForTimeout(500);
await btnParent.click();
await p.waitForTimeout(3000);

const after = readFileSync(settingsPath, "utf8");
console.log("saved my-test:", after.includes("my-test"));
console.log("saved 预设名称:", after.includes("预设名称"));
console.log("saved customPresets:", after.includes("customPresets"));

logs.filter(l => l.startsWith("error") || l.startsWith("warn")).forEach(l => console.log("LOG:", l));
writeFileSync(settingsPath, backup, "utf8");
console.log("restored");
await b.close();