// dsh-plugin-model-capability — Host half.
//
// A deliberately small host plugin. Its only job is to register the
// `model-capability` settings namespace so the browser page has a durable
// home for:
//   - `language`          — the page's own UI language preference
//     ('follow' | 'en' | 'zh'; 'follow' tracks the DSH UI language)
//   - `customPresets`     — user-saved provider snapshots (JSON strings)
//
// The heavy lifting (editing the `llm-pi-ai` namespace, rendering the
// settings page) happens in the Web client half (`./client`), which shares
// these constants through the source plane.

import { settingsNamespace } from "@deepseek-ai/dsh-settings";
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

/** Durable schema of this plugin's own namespace. */
export const SettingsSchema = z
  .object({
    [LANGUAGE_FIELD]: z.union(LANGUAGES).default(DEFAULT_LANGUAGE),
    [CUSTOM_PRESETS_FIELD]: z.array(customPreset).default([]),
  })
  .default({});

const name = "model-capability";

/** No hard service dependencies; the settings service is optional. */
const inject = [];

function apply(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(SETTINGS_NS, SettingsSchema);
  });
}

export { name, inject, apply };