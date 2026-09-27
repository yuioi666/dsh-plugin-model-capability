import test from "node:test";
import assert from "node:assert/strict";
import { Config, apply } from "../src/host/index.js";

test("host Config exposes only the plugin-owned fields as volatile", () => {
  const serialized = Config.toJSON();
  const root = serialized.refs[String(serialized.uid)];
  const language = serialized.refs[String(root.dict.language)];
  const customPresets = serialized.refs[String(root.dict.customPresets)];
  assert.equal(language.meta.volatile, true);
  assert.equal(language.meta.default, "follow");
  assert.equal(customPresets.meta.volatile, true);
  assert.deepEqual(customPresets.meta.default, []);
});

test("host disables the generated settings form for its own fiber", () => {
  const fiber = { id: "model-capability" };
  let configured;
  let effectLabel;
  const ctx = {
    fiber,
    inject(deps, mount) {
      assert.deepEqual(deps, ["settings"]);
      mount({
        settings: {
          configure(policy, owner) {
            configured = { policy, owner };
            return () => {};
          },
        },
        effect(run, label) {
          effectLabel = label;
          run();
        },
      });
    },
  };
  apply(ctx);
  assert.deepEqual(configured, { policy: { auto: false }, owner: fiber });
  assert.equal(effectLabel, "model-capability: custom settings page");
});
