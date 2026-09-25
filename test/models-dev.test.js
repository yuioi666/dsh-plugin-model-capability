import test from "node:test";
import assert from "node:assert/strict";
import {
  MODELS_DEV_CACHE_KEY,
  buildModelsDevSync,
  loadModelsDevCatalog,
  normalizeModelsDevCatalog,
} from "../src/client/models-dev.js";

const raw = {
  openai: {
    id: "openai",
    name: "OpenAI",
    models: {
      "gpt-test": {
        id: "gpt-test",
        name: "GPT Test",
        reasoning: true,
        reasoning_options: [{ type: "effort", values: ["low", "high", "vendor-only"] }],
        modalities: { input: ["text", "image", "audio"] },
        limit: { context: 128000, output: 16000 },
      },
      plain: {
        id: "plain",
        reasoning: false,
        modalities: { input: ["text"] },
        limit: { context: 32000 },
      },
    },
  },
};

function memoryStorage(initial) {
  const values = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("normalizes the documented provider/model shape", () => {
  const catalog = normalizeModelsDevCatalog(raw);
  assert.equal(catalog.providers.openai.models["gpt-test"].context, 128000);
  assert.deepEqual(catalog.providers.openai.models["gpt-test"].input, ["text", "image", "audio"]);
  assert.throws(() => normalizeModelsDevCatalog([]), /catalog-invalid/);
});

test("sync updates selected fields while preserving manual and unknown data", () => {
  const current = {
    openai: {
      api: "openai-responses",
      custom: "keep-me",
      models: [
        { id: "gpt-test", name: "Old", compat: { supportsStore: true } },
        { id: "local-only", contextWindow: 42 },
      ],
    },
  };
  const built = buildModelsDevSync(
    current,
    normalizeModelsDevCatalog(raw),
    { openai: "openai" },
    { name: true, contextWindow: true, maxTokens: true, input: true, reasoningEfforts: true },
  );
  const route = built.replacements.openai;
  assert.equal(route.custom, "keep-me");
  assert.equal(route.models[0].contextWindow, 128000);
  assert.equal(route.models[0].maxTokens, 16000);
  assert.deepEqual(route.models[0].input, ["text", "image"]);
  assert.deepEqual(route.models[0].reasoningEfforts, { off: null, low: "low", high: "high" });
  assert.deepEqual(route.models[0].compat, { supportsStore: true });
  assert.equal(route.models[1].contextWindow, 42);
  assert.deepEqual(built.stats, {
    selectedRoutes: 1,
    changedRoutes: 1,
    matchedModels: 1,
    changedModels: 1,
    unmatchedModels: 1,
    skippedReasoning: 0,
  });
  assert.equal(current.openai.models[0].name, "Old");
});

test("reasoning synchronization stays opt-in", () => {
  const current = { openai: { models: [{ id: "plain", reasoningEfforts: { high: "h" } }] } };
  const catalog = normalizeModelsDevCatalog(raw);
  const off = buildModelsDevSync(current, catalog, { openai: "openai" }, {
    name: false, contextWindow: false, maxTokens: false, input: false, reasoningEfforts: false,
  });
  assert.equal(off.stats.changedRoutes, 0);
  const on = buildModelsDevSync(current, catalog, { openai: "openai" }, {
    name: false, contextWindow: false, maxTokens: false, input: false, reasoningEfforts: true,
  });
  assert.equal(on.replacements.openai.models[0].reasoningEfforts, false);
});

test("uses a fresh cache without fetching", async () => {
  const now = 10_000;
  const catalog = normalizeModelsDevCatalog(raw);
  const storage = memoryStorage({
    [MODELS_DEV_CACHE_KEY]: JSON.stringify({ savedAt: now - 100, catalog }),
  });
  const result = await loadModelsDevCatalog({
    storage,
    now,
    fetchImpl: () => assert.fail("fetch should not run"),
  });
  assert.equal(result.source, "cache");
  assert.equal(result.stale, false);
  assert.equal(result.catalog.providers.openai.models["gpt-test"].context, 128000);
  assert.deepEqual(result.catalog.providers.openai.models["gpt-test"].input, ["text", "image", "audio"]);
});

test("falls back to stale validated cache after a network failure", async () => {
  const catalog = normalizeModelsDevCatalog(raw);
  const storage = memoryStorage({
    [MODELS_DEV_CACHE_KEY]: JSON.stringify({ savedAt: 1, catalog }),
  });
  const result = await loadModelsDevCatalog({
    storage,
    now: 100_000_000,
    force: true,
    fetchImpl: async () => { throw new Error("offline"); },
  });
  assert.equal(result.source, "fallback");
  assert.equal(result.stale, true);
  assert.equal(result.warning, "offline");
});

test("does not hide a fetch failure when no valid cache exists", async () => {
  await assert.rejects(
    loadModelsDevCatalog({
      storage: memoryStorage(),
      force: true,
      fetchImpl: async () => ({ ok: false, status: 503 }),
    }),
    (error) => error.code === "models-dev-unavailable" && /http-503/.test(error.message),
  );
});
