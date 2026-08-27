// Built-in one-click presets.
//
// Every preset is data + an op builder. Ops are `settings.mutate` path ops
// against the `llm-pi-ai` namespace, so one click = one atomic write that the
// Host schema validates. Building needs the RESOLVED providers (for model
// indexes); materialization of the target routes into the user layer happens
// right before the write (see CapabilityStore.applyBuiltinPreset).

import { deepClone } from "./constants.js";

/** The full seven-level reasoningEfforts map (off sends nothing). */
export function fullThinkingLevels() {
  return {
    off: null,
    minimal: "minimal",
    low: "low",
    medium: "medium",
    high: "high",
    xhigh: "xhigh",
    max: "max",
  };
}

/** Model index by id inside a route's resolved models array; -1 when absent. */
function modelIndex(routeEntry, modelId) {
  const models = routeEntry?.models;
  if (!Array.isArray(models)) return -1;
  return models.findIndex((m) => m && m.id === modelId);
}

function routeBase(route) {
  return ["providers", route];
}

function modelBase(route, entry, modelId) {
  return [...routeBase(route), "models", modelIndex(entry, modelId)];
}

function modelOps(route, entry, build) {
  // Returns a single op that writes the entire route with the models patched.
  // Writing individual model paths fails because DSH applyPathOp does not
  // handle arrays — the `models` field gets replaced by an object.
  const models = Array.isArray(entry?.models) ? deepClone(entry.models) : [];
  for (const model of models) {
    if (!model || typeof model.id !== "string") continue;
    build(model);
  }
  const patched = deepClone(entry);
  patched.models = models;
  return [{ op: "set", path: routeBase(route), value: patched }];
}

/** Ordered list of built-in presets. */
export const BUILTIN_PRESETS = [
  {
    id: "safe-gateway",
    nameKey: "builtinSafeGateway",
    descKey: "builtinSafeGatewayDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      return [
        { op: "set", path: [...base, "compat", "supportsDeveloperRole"], value: false },
        { op: "set", path: [...base, "compat", "supportsReasoningEffort"], value: true },
      ];
    },
  },
  {
    id: "openai-native",
    nameKey: "builtinOpenaiNative",
    descKey: "builtinOpenaiNativeDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      return [
        { op: "set", path: [...base, "compat", "supportsDeveloperRole"], value: true },
        { op: "set", path: [...base, "compat", "supportsReasoningEffort"], value: true },
        { op: "set", path: [...base, "compat", "thinkingFormat"], value: "openai" },
        { op: "set", path: [...base, "compat", "maxTokensField"], value: "max_completion_tokens" },
      ];
    },
  },
  {
    id: "deepseek-dialect",
    nameKey: "builtinDeepseekDialect",
    descKey: "builtinDeepseekDialectDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      return [
        { op: "set", path: [...base, "compat", "thinkingFormat"], value: "deepseek" },
        { op: "set", path: [...base, "compat", "supportsDeveloperRole"], value: true },
        { op: "set", path: [...base, "compat", "supportsReasoningEffort"], value: true },
      ];
    },
  },
  {
    id: "qwen-dialect",
    nameKey: "builtinQwenDialect",
    descKey: "builtinQwenDialectDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      return [
        { op: "set", path: [...base, "compat", "thinkingFormat"], value: "qwen" },
        { op: "set", path: [...base, "compat", "supportsDeveloperRole"], value: false },
        { op: "set", path: [...base, "compat", "supportsReasoningEffort"], value: true },
      ];
    },
  },
  {
    id: "max-thinking",
    nameKey: "builtinMaxThinking",
    descKey: "builtinMaxThinkingDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      const levels = fullThinkingLevels();
      return [
        ...modelOps(route, entry, (patched) => {
          patched.reasoningEfforts = levels;
        }),
        { op: "set", path: [...base, "reasoning"], value: "high" },
        {
          op: "set",
          path: [...base, "thinkingBudgets"],
          value: { minimal: 256, low: 1024, medium: 4096, high: 16384 },
        },
      ];
    },
  },
  {
    id: "text-only",
    nameKey: "builtinTextOnly",
    descKey: "builtinTextOnlyDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      return [
        { op: "set", path: [...base, "defaultInput"], value: ["text"] },
        ...modelOps(route, entry, (patched) => {
          patched.input = ["text"];
        }),
      ];
    },
  },
  {
    id: "image-ready",
    nameKey: "builtinImageReady",
    descKey: "builtinImageReadyDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      return [
        { op: "set", path: [...base, "defaultInput"], value: ["text", "image"] },
        ...modelOps(route, entry, (patched) => {
          patched.input = ["text", "image"];
        }),
      ];
    },
  },
];