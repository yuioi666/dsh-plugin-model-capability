// models.dev catalog adapter.
//
// Network access is deliberately pull-only: callers decide when to fetch.
// The last successfully validated, normalized catalog is kept in localStorage
// and may be used as a stale fallback when models.dev is unavailable.

import { MODALITIES, THINKING_LEVELS, deepClone } from "./constants.js";

export const MODELS_DEV_URL = "https://models.dev/api.json";
export const MODELS_DEV_CACHE_KEY = "dsh-model-capability:models-dev:v1";
export const MODELS_DEV_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : void 0;
}

function normalizeCachedCatalog(catalog) {
  if (!isRecord(catalog) || !isRecord(catalog.providers)) {
    throw new Error("cache-invalid");
  }
  // Rebuild the public wire shape, then pass it through the same validator as
  // network data. Never trust localStorage merely because we wrote it before.
  const raw = {};
  for (const [providerId, provider] of Object.entries(catalog.providers)) {
    if (!isRecord(provider) || !isRecord(provider.models)) continue;
    const models = {};
    for (const [modelId, model] of Object.entries(provider.models)) {
      if (!isRecord(model)) continue;
      models[modelId] = {
        id: model.id,
        name: model.name,
        reasoning: model.reasoning,
        reasoning_options: model.reasoningOptions,
        modalities: { input: model.input },
        limit: { context: model.context, output: model.output },
      };
    }
    raw[providerId] = { id: provider.id, name: provider.name, models };
  }
  return normalizeModelsDevCatalog(raw);
}

/** Keep only fields understood by the sync feature. This both validates the
 * remote shape and keeps the localStorage cache much smaller than api.json. */
export function normalizeModelsDevCatalog(raw) {
  if (!isRecord(raw)) throw new Error("catalog-invalid");
  const providers = {};
  for (const [providerKey, provider] of Object.entries(raw)) {
    if (!isRecord(provider) || !isRecord(provider.models)) continue;
    const id = typeof provider.id === "string" && provider.id ? provider.id : providerKey;
    const models = {};
    for (const [modelKey, model] of Object.entries(provider.models)) {
      if (!isRecord(model)) continue;
      const modelId = typeof model.id === "string" && model.id ? model.id : modelKey;
      const input = Array.isArray(model.modalities?.input)
        ? model.modalities.input.filter((item) => typeof item === "string")
        : [];
      const reasoningOptions = Array.isArray(model.reasoning_options)
        ? model.reasoning_options
            .filter(isRecord)
            .map((option) => ({
              type: typeof option.type === "string" ? option.type : "",
              values: Array.isArray(option.values)
                ? option.values.filter((value) => typeof value === "string")
                : [],
            }))
        : [];
      models[modelId] = {
        id: modelId,
        name: typeof model.name === "string" ? model.name : void 0,
        context: positiveInteger(model.limit?.context),
        output: positiveInteger(model.limit?.output),
        input,
        reasoning: typeof model.reasoning === "boolean" ? model.reasoning : void 0,
        reasoningOptions,
      };
    }
    if (Object.keys(models).length > 0) {
      providers[id] = {
        id,
        name: typeof provider.name === "string" ? provider.name : id,
        models,
      };
    }
  }
  if (Object.keys(providers).length === 0) throw new Error("catalog-empty");
  return { providers };
}

function readCache(storage, now) {
  if (!storage?.getItem) return null;
  try {
    const value = JSON.parse(storage.getItem(MODELS_DEV_CACHE_KEY));
    if (!isRecord(value) || !Number.isFinite(value.savedAt)) return null;
    const catalog = normalizeCachedCatalog(value.catalog);
    return {
      catalog,
      savedAt: value.savedAt,
      fresh: now - value.savedAt <= MODELS_DEV_CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
}

function writeCache(storage, catalog, savedAt) {
  if (!storage?.setItem) return false;
  try {
    storage.setItem(MODELS_DEV_CACHE_KEY, JSON.stringify({ savedAt, catalog }));
    return true;
  } catch {
    // Quota/security failures must not turn a successful fetch into a failure.
    return false;
  }
}

/** Fetch a catalog, with a 24-hour cache and stale-on-error fallback. */
export async function loadModelsDevCatalog({
  fetchImpl = globalThis.fetch,
  storage,
  now = Date.now(),
  force = false,
  timeoutMs = 10_000,
} = {}) {
  let cacheStorage = storage;
  if (cacheStorage === void 0) {
    try {
      cacheStorage = globalThis.localStorage;
    } catch {
      // Privacy/sandboxed browser contexts may deny localStorage completely.
      cacheStorage = null;
    }
  }
  const cached = readCache(cacheStorage, now);
  if (!force && cached?.fresh) {
    return { ...cached, source: "cache", stale: false };
  }
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  try {
    if (typeof fetchImpl !== "function") throw new Error("fetch-unavailable");
    const response = await fetchImpl(MODELS_DEV_URL, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller?.signal,
    });
    if (!response?.ok) throw new Error(`http-${response?.status ?? "unknown"}`);
    const catalog = normalizeModelsDevCatalog(await response.json());
    const cachedLocally = writeCache(cacheStorage, catalog, now);
    return { catalog, savedAt: now, source: "network", stale: false, cachedLocally };
  } catch (error) {
    if (cached) {
      return {
        ...cached,
        source: "fallback",
        stale: true,
        warning: error?.message ?? String(error),
      };
    }
    const wrapped = new Error(error?.message ?? String(error));
    wrapped.code = "models-dev-unavailable";
    throw wrapped;
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

/** Conservative automatic mapping. Ambiguous/fuzzy routes are left unmapped. */
export function guessModelsDevProvider(route, routeEntry, catalog) {
  const providers = catalog?.providers ?? {};
  if (providers[route]) return route;
  const needle = String(route).toLowerCase();
  const exactIds = Object.keys(providers).filter((id) => id.toLowerCase() === needle);
  if (exactIds.length === 1) return exactIds[0];
  const display = String(routeEntry?.displayName ?? "").toLowerCase();
  const exactNames = Object.values(providers).filter(
    (provider) => display && String(provider.name).toLowerCase() === display,
  );
  return exactNames.length === 1 ? exactNames[0].id : void 0;
}

function findSourceModel(models, id) {
  if (models[id]) return models[id];
  const needle = String(id).toLowerCase();
  const matches = Object.values(models).filter(
    (model) => String(model.id).toLowerCase() === needle,
  );
  return matches.length === 1 ? matches[0] : void 0;
}

function reasoningEfforts(source) {
  if (source.reasoning === false) return false;
  if (source.reasoning !== true) return void 0;
  const effort = source.reasoningOptions.find((option) => option.type === "effort");
  if (!effort) return void 0;
  const allowed = new Set(THINKING_LEVELS.filter((level) => level !== "off"));
  const values = effort.values.filter((value) => allowed.has(value));
  if (values.length === 0) return void 0;
  return Object.fromEntries([["off", null], ...values.map((value) => [value, value])]);
}

export const DEFAULT_SYNC_FIELDS = {
  name: true,
  contextWindow: true,
  maxTokens: true,
  input: true,
  reasoningEfforts: false,
};

/** Build complete route replacements without mutating the current settings.
 * Missing source values never erase manual values. */
export function buildModelsDevSync(currentProviders, catalog, selections, fields) {
  const replacements = {};
  const stats = {
    selectedRoutes: 0,
    changedRoutes: 0,
    matchedModels: 0,
    changedModels: 0,
    unmatchedModels: 0,
    skippedReasoning: 0,
  };
  for (const [route, providerId] of Object.entries(selections ?? {})) {
    if (!providerId) continue;
    const current = currentProviders?.[route];
    const sourceProvider = catalog?.providers?.[providerId];
    if (!isRecord(current) || !sourceProvider) continue;
    stats.selectedRoutes += 1;
    const next = deepClone(current);
    const models = Array.isArray(next.models) ? next.models : [];
    let routeChanged = false;
    for (const model of models) {
      if (!isRecord(model) || typeof model.id !== "string") continue;
      const source = findSourceModel(sourceProvider.models, model.id);
      if (!source) {
        stats.unmatchedModels += 1;
        continue;
      }
      stats.matchedModels += 1;
      const before = JSON.stringify(model);
      if (fields.name && source.name) model.name = source.name;
      if (fields.contextWindow && source.context) model.contextWindow = source.context;
      if (fields.maxTokens && source.output) model.maxTokens = source.output;
      if (fields.input) {
        const input = source.input.filter((item) => MODALITIES.includes(item));
        if (input.length > 0) model.input = [...new Set(input)];
      }
      if (fields.reasoningEfforts) {
        const mapped = reasoningEfforts(source);
        if (mapped !== void 0) model.reasoningEfforts = mapped;
        else if (source.reasoning === true) stats.skippedReasoning += 1;
      }
      if (JSON.stringify(model) !== before) {
        routeChanged = true;
        stats.changedModels += 1;
      }
    }
    if (routeChanged) {
      replacements[route] = next;
      stats.changedRoutes += 1;
    }
  }
  return { replacements, stats };
}
