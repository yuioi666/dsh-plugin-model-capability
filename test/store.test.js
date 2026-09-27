import test from "node:test";
import assert from "node:assert/strict";
import { CapabilityStore } from "../src/client/store.js";

function scope(snapshot, outcome = true) {
  const calls = [];
  return {
    calls,
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    mutate: async (...args) => {
      calls.push(args);
      return outcome;
    },
  };
}

function makeStore(route, outcome = true) {
  const llmScope = scope({
    value: { providers: { openai: route } },
    user: { providers: { openai: route } },
    revision: 7,
    writable: true,
    mode: "host",
  }, outcome);
  const selfScope = scope({ value: {}, user: {}, revision: 2, writable: true, mode: "host" });
  return { store: new CapabilityStore({ llmScope, selfScope }), llmScope };
}

test("treats a ConfigForms false settlement as a refused write", async () => {
  const { store } = makeStore({ models: [] }, false);
  assert.deepEqual(await store.writePath(["providers", "openai", "displayName"], "OpenAI"), {
    ok: false,
    code: "settings-refused",
    message: "settings-refused",
  });
});

test("edits DSH 0.1.7 modelOverrides without materializing a models list", async () => {
  const route = {
    displayName: "OpenAI",
    models: [],
    modelOverrides: {
      "gpt-test": { contextWindow: 1000, compat: { supportsStore: true } },
    },
  };
  const { store, llmScope } = makeStore(route);
  assert.deepEqual(store.modelsOf("openai"), [{
    id: "gpt-test",
    contextWindow: 1000,
    compat: { supportsStore: true },
  }]);

  const result = await store.writeModelField("openai", "gpt-test", { contextWindow: 2000 });
  assert.equal(result.ok, true);
  const written = llmScope.calls[0][0][0].value;
  assert.equal(written.models.length, 0);
  assert.equal(written.modelOverrides["gpt-test"].contextWindow, 2000);
  assert.equal(written.modelOverrides["gpt-test"].id, undefined);
  assert.deepEqual(written.modelOverrides["gpt-test"].compat, { supportsStore: true });
});

test("writes model compat into modelOverrides and preserves sibling fields", async () => {
  const route = {
    modelOverrides: {
      "gpt-test": { name: "Test", compat: { supportsStore: true } },
    },
  };
  const { store, llmScope } = makeStore(route);
  const result = await store.writeModelCompatField(
    "openai",
    "gpt-test",
    "supportsFinishReason",
    true,
  );
  assert.equal(result.ok, true);
  assert.deepEqual(llmScope.calls[0][0][0].value.modelOverrides["gpt-test"], {
    name: "Test",
    compat: { supportsStore: true, supportsFinishReason: true },
  });
});
