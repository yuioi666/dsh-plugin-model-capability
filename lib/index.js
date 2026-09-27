// dsh-plugin-model-capability — Host half.
//
// A deliberately small host plugin. DSH >= 0.1.7 projects editable settings
// from this plugin's exported Config, so the browser page has a durable home
// for:
//   - `language`          — the page's own UI language preference
//     ('follow' | 'en' | 'zh'; 'follow' tracks the DSH UI language)
//   - `customPresets`     — user-saved provider snapshots (JSON strings)
//
// The heavy lifting (editing the `llm-pi-ai` namespace, rendering the
// settings page) happens in the Web client half (`./client`), which shares
// these constants through the source plane.

import z from "@deepseek-ai/schemastery";

/** Settings namespace owned by this plugin. */
export const SETTINGS_NS = "model-capability";

/** Values for the `language` field. */
export const LANGUAGES = ["follow", "en", "zh"];

/** Default language: follow the DSH UI language. */
export const DEFAULT_LANGUAGE = "follow";

/** Field names of the plugin's own namespace. */
export const LANGUAGE_FIELD = "language";
export const CUSTOM_PRESETS_FIELD = "customPresets";

/** One saved custom preset. `payload` is the JSON snapshot of the
 * `llm-pi-ai` user section's `providers` dict (the client strips all
 * `headers` dicts before storing, so literal credentials like
 * Authorization / api-key are never persisted; credentials travel as
 * `apiKeyEnv` reference names). */
const customPreset = z
  .object({
    id: z.string(),
    name: z.string().required(),
    createdAt: z.string(),
    payload: z.string().required(),
  })
  .required();

/** Durable configuration of this plugin's own entry. Only volatile fields are
 * exposed through DSH's settings forms. */
export const Config = z
  .object({
    [LANGUAGE_FIELD]: z.union(LANGUAGES).default(DEFAULT_LANGUAGE).volatile(),
    [CUSTOM_PRESETS_FIELD]: z.array(customPreset).default([]).volatile(),
  })
  .default({});

/** Kept as an export alias for consumers that inspected the old schema. */
export const SettingsSchema = Config;

const name = "model-capability";

const inject = [];

function apply(ctx) {
  // 0.1.7 derives the namespace from this entry's Config. Disable the generic
  // auto-generated form because the bundle supplies its own settings page.
  ctx.inject(["settings"], (child) => {
    child.effect(
      () => child.settings.configure({ auto: false }, ctx.fiber),
      "model-capability: custom settings page",
    );
  });
}

export { name, inject, apply };
