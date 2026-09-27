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

/**
 * Official thinking-level maps per provider catalog (pi-ai data/*.json),
 * used by the dialect presets — a preset must declare exactly the levels
 * the vendor supports, not the full seven.
 *
 * NOTE: the Host validates that any EXPLICITLY present non-"off" level has
 * a wire value (`reasoningEfforts.<level>` with `null` is rejected), so an
 * unsupported level must be OMITTED (its key absent), never `null`.
 *
 * deepseek (deepseek.json / qwen-token-plan.json): only high/max.
 * openai (openai.json, gpt-5 family): off/minimal/low/medium/high.
 */
export const OFFICIAL_LEVELS = {
  deepseek: { off: null, low: "low", high: "high", max: "max" },
  openai: { off: null, minimal: "minimal", low: "low", medium: "medium", high: "high" },
  qwen: { off: null, low: "low", medium: "medium", xhigh: "xhigh" },
};

function routeBase(route) {
  return ["providers", route];
}

function modelOps(route, entry, build) {
  // Returns a single op that writes the entire route, preserving whether DSH
  // serves an explicit model list or 0.1.7 catalog modelOverrides.
  const patched = deepClone(entry);
  const models = Array.isArray(patched?.models) ? patched.models : [];
  if (models.length > 0) {
    for (const model of models) {
      if (!model || typeof model.id !== "string") continue;
      build(model);
    }
    patched.models = models;
  } else if (patched?.modelOverrides && typeof patched.modelOverrides === "object") {
    for (const [id, value] of Object.entries(patched.modelOverrides)) {
      const model = { ...(value ?? {}), id };
      build(model);
      const { id: _id, ...next } = model;
      patched.modelOverrides[id] = next;
    }
  }
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
      const levels = OFFICIAL_LEVELS.openai;
      return [
        { op: "set", path: [...base, "compat", "supportsDeveloperRole"], value: true },
        { op: "set", path: [...base, "compat", "supportsReasoningEffort"], value: true },
        { op: "set", path: [...base, "compat", "thinkingFormat"], value: "openai" },
        { op: "set", path: [...base, "compat", "maxTokensField"], value: "max_completion_tokens" },
        ...modelOps(route, entry, (patched) => {
          patched.reasoningEfforts = levels;
        }),
      ];
    },
  },
  {
    id: "deepseek-dialect",
    nameKey: "builtinDeepseekDialect",
    descKey: "builtinDeepseekDialectDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      const levels = OFFICIAL_LEVELS.deepseek;
      return [
        { op: "set", path: [...base, "compat", "thinkingFormat"], value: "deepseek" },
        { op: "set", path: [...base, "compat", "supportsDeveloperRole"], value: true },
        { op: "set", path: [...base, "compat", "supportsReasoningEffort"], value: true },
        ...modelOps(route, entry, (patched) => {
          patched.reasoningEfforts = levels;
        }),
      ];
    },
  },
  {
    id: "qwen-dialect",
    nameKey: "builtinQwenDialect",
    descKey: "builtinQwenDialectDesc",
    buildOps(route, entry) {
      const base = routeBase(route);
      const levels = OFFICIAL_LEVELS.qwen;
      return [
        { op: "set", path: [...base, "compat", "thinkingFormat"], value: "qwen" },
        { op: "set", path: [...base, "compat", "supportsDeveloperRole"], value: false },
        { op: "set", path: [...base, "compat", "supportsReasoningEffort"], value: true },
        ...modelOps(route, entry, (patched) => {
          patched.reasoningEfforts = levels;
        }),
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
