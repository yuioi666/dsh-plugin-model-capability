// Data access layer for the Model Capability page.
//
// Reads come from the settings mirror through the bound scopes; writes go
// through the scopes' own `mutate` method (SettingsScope.mutate) which queues
// path-addressed operations with automatic serialization and revision fencing
// — no need to go through the raw Typert Remote layer.
//
// Robustness rules:
//   - a route that only exists in the composition base (or in the pi-ai
//     catalog) is materialized into the user layer BEFORE the first nested
//     write, by copying its current effective entry wholesale — this never
//     drops fields the page does not render;
//   - model indexes are resolved from the CURRENT resolved list on every
//     write (drafts are keyed by model id, never by index);
//   - every write is one atomic mutate call, so the Host either accepts the
//     whole edit or rejects it naming the offending field (settings-rejected)
//     / the stale revision (settings-conflict).

import { deepClone, stripHeadersFromProviders } from "./constants.js";
import { BUILTIN_PRESETS } from "./presets.js";

export class CapabilityStore {
  constructor({ llmScope, selfScope, locale, remote }) {
    this.llmScope = llmScope;
    this.selfScope = selfScope;
    this.locale = locale;
    this.remote = remote;
    /** Routes we already materialized into the user layer this session. */
    this.materialized = new Set();
  }

  // ——— read faces ———

  llmSnapshot() {
    return this.llmScope.getSnapshot();
  }

  selfSnapshot() {
    return this.selfScope.getSnapshot();
  }

  providers() {
    const value = this.llmSnapshot().value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value.providers && typeof value.providers === "object"
      ? value.providers
      : {};
  }

  userProviders() {
    const user = this.llmSnapshot().user;
    if (!user || typeof user !== "object" || Array.isArray(user)) return {};
    return user.providers && typeof user.providers === "object"
      ? user.providers
      : {};
  }

  routeNames() {
    return Object.keys(this.providers());
  }

  route(route) {
    return this.providers()[route];
  }

  modelsOf(route) {
    const models = this.route(route)?.models;
    return Array.isArray(models) ? models : [];
  }

  modelIndexById(route, modelId) {
    return this.modelsOf(route).findIndex((m) => m && m.id === modelId);
  }

  /** Effective UI language: own preference, else the DSH locale. */
  effectiveLanguage() {
    const self = this.selfSnapshot().value;
    const pref =
      self && typeof self === "object" && self.language !== void 0
        ? self.language
        : "follow";
    if (pref === "follow") {
      const active = this.locale?.getSnapshot?.().active;
      return active === "zh" ? "zh" : "en";
    }
    return pref === "zh" ? "zh" : "en";
  }

  writable() {
    return this.llmSnapshot().writable === true;
  }

  mode() {
    return this.llmSnapshot().mode;
  }

  // ——— low-level writes ———

  /** Write ops through the llm-pi-ai scope. */
  async writeOps(ops) {
    const snap = this.llmSnapshot();
    try {
      await this.llmScope.mutate(ops, snap.revision);
      return { ok: true, revision: snap.revision };
    } catch (err) {
      return {
        ok: false,
        code: err?.code ?? "unknown",
        message: err?.message ?? String(err),
      };
    }
  }

  async writePath(path, value) {
    return this.writeOps([{ op: "set", path, value }]);
  }

  async unsetPath(path) {
    return this.writeOps([{ op: "unset", path }]);
  }

  /** Write ops through the model-capability (self) scope. */
  async writeSelfOps(ops) {
    const snap = this.selfSnapshot();
    try {
      await this.selfScope.mutate(ops, snap.revision);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        code: err?.code ?? "unknown",
        message: err?.message ?? String(err),
      };
    }
  }

  // ——— materialization ———

  /** Make sure the route exists in the USER layer before nested writes. */
  async ensureRouteMaterialized(route) {
    if (this.materialized.has(route)) return { ok: true };
    const snap = this.llmSnapshot();
    const user = snap.user;
    if (
      user &&
      typeof user === "object" &&
      user.providers &&
      user.providers[route] !== void 0
    ) {
      this.materialized.add(route);
      return { ok: true };
    }
    const effective = snap.value?.providers?.[route];
    if (effective === void 0) return { ok: false, message: "route-not-found" };
    const copy = deepClone(effective);
    const result = await this.writeOps([
      { op: "set", path: ["providers", route], value: copy },
    ]);
    if (result.ok) this.materialized.add(route);
    return result;
  }

  // ——— field writers used by the UI ———

  /** Materialize first (if needed), then run the ops on one route. */
  async writeRouteField(route, suffixPath, value, { unset = false } = {}) {
    const materialized = await this.ensureRouteMaterialized(route);
    if (!materialized.ok) return materialized;
    const path = ["providers", route, ...suffixPath];
    return unset ? this.unsetPath(path) : this.writePath(path, value);
  }

  async writeModelField(route, modelId, fields) {
    // fields: { [fieldName]: value } — set each; value === UNSET marks unset
    // IMPORTANT: The DSH settings `applyPathOp` does NOT handle arrays, so
    // ANY path going through `models` will replace the array with an object.
    // We work around this by reading the whole route, patching the model in
    // its models array, and writing the entire route object back.
    const materialized = await this.ensureRouteMaterialized(route);
    if (!materialized.ok) return materialized;
    const routeEntry = this.route(route);
    if (!routeEntry) return { ok: false, message: "route-not-found" };
    const index = this.modelIndexById(route, modelId);
    if (index < 0) return { ok: false, message: "model-not-found" };
    const models = Array.isArray(routeEntry.models) ? deepClone(routeEntry.models) : [];
    if (index >= models.length) return { ok: false, message: "model-not-found" };
    for (const [field, value] of Object.entries(fields)) {
      if (value === UNSET) delete models[index][field];
      else models[index][field] = value;
    }
    const patched = deepClone(routeEntry);
    patched.models = models;
    return this.writePath(["providers", route], patched);
  }

  /** Write a single compat field on one model, preserving the whole route array. */
  async writeModelCompatField(route, modelId, field, value, { unset = false } = {}) {
    const materialized = await this.ensureRouteMaterialized(route);
    if (!materialized.ok) return materialized;
    const routeEntry = this.route(route);
    if (!routeEntry) return { ok: false, message: "route-not-found" };
    const index = this.modelIndexById(route, modelId);
    if (index < 0) return { ok: false, message: "model-not-found" };
    const models = Array.isArray(routeEntry.models) ? deepClone(routeEntry.models) : [];
    if (index >= models.length) return { ok: false, message: "model-not-found" };
    const compat = models[index].compat ? deepClone(models[index].compat) : {};
    if (unset) {
      delete compat[field];
    } else {
      compat[field] = value;
    }
    if (Object.keys(compat).length === 0) {
      delete models[index].compat;
    } else {
      models[index].compat = compat;
    }
    const patched = deepClone(routeEntry);
    patched.models = models;
    return this.writePath(["providers", route], patched);
  }

  /** Copy one model's visible settings to every model of the same route. */
  async applyModelToAll(route, modelId, fieldNames) {
    const source = this.modelsOf(route).find((m) => m && m.id === modelId);
    if (!source) return { ok: false, message: "model-not-found" };
    const materialized = await this.ensureRouteMaterialized(route);
    if (!materialized.ok) return materialized;
    const routeEntry = this.route(route);
    if (!routeEntry) return { ok: false, message: "route-not-found" };
    const models = Array.isArray(routeEntry.models) ? deepClone(routeEntry.models) : [];
    for (const model of models) {
      if (model.id === modelId) continue;
      for (const field of fieldNames) {
        if (!(field in source)) continue;
        model[field] = deepClone(source[field]);
      }
    }
    const patched = deepClone(routeEntry);
    patched.models = models;
    return this.writePath(["providers", route], patched);
  }

  // ——— presets ———

  builtinPresets() {
    return BUILTIN_PRESETS;
  }

  /** Apply a built-in preset to the selected routes in one atomic write. */
  async applyBuiltinPreset(presetId, routeIds) {
    const preset = BUILTIN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return { ok: false, message: "preset-not-found" };
    const providers = this.providers();
    const routes = routeIds.filter((r) => providers[r] !== void 0);
    if (routes.length === 0) return { ok: false, message: "route-not-found" };
    const ops = [];
    for (const route of routes) {
      ops.push(...preset.buildOps(route, providers[route]));
    }
    for (const route of routes) {
      const materialized = await this.ensureRouteMaterialized(route);
      if (!materialized.ok) return materialized;
    }
    return this.writeOps(ops);
  }

  customPresets() {
    const self = this.selfSnapshot().value;
    if (!self || typeof self !== "object") return [];
    return Array.isArray(self.customPresets) ? self.customPresets : [];
  }

  /** Save the current user providers as a custom preset. */
  async saveCustomPreset(name) {
    const rawProviders = this.userProviders();
    if (Object.keys(rawProviders).length === 0) {
      return { ok: false, message: "no-user-routes" };
    }
    const providers = stripHeadersFromProviders(rawProviders);
    const id = `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const item = {
      id,
      name: String(name || "preset").trim(),
      createdAt: new Date().toISOString(),
      payload: JSON.stringify({ providers }),
    };
    const next = [...this.customPresets(), item];
    return this.writeSelfOps([
      { op: "set", path: ["customPresets"], value: next },
    ]);
  }

  async deleteCustomPreset(id) {
    const next = this.customPresets().filter((p) => p.id !== id);
    return this.writeSelfOps([
      { op: "set", path: ["customPresets"], value: next },
    ]);
  }

  /** Apply a custom preset: replaces the whole llm-pi-ai user section. */
  async applyCustomPreset(id) {
    const preset = this.customPresets().find((p) => p.id === id);
    if (!preset) return { ok: false, message: "preset-not-found" };
    let parsed;
    try {
      parsed = JSON.parse(preset.payload);
    } catch {
      return { ok: false, message: "preset-corrupt" };
    }
    const section =
      parsed && typeof parsed === "object" && parsed.providers
        ? parsed
        : { providers: parsed };
    const snap = this.llmSnapshot();
    try {
      await this.llmScope.mutate(
        [{ op: "set", path: [], value: section }],
        snap.revision,
      );
      this.materialized.clear();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        code: err?.code ?? "unknown",
        message: err?.message ?? String(err),
      };
    }
  }

  // ——— self namespace (language) ———

  /** Persist the page language preference. */
  async setLanguage(value) {
    return this.writeSelfOps([
      { op: "set", path: ["language"], value },
    ]);
  }
}

/** Sentinel value meaning "remove this field from the user layer". */
export const UNSET = Symbol("unset");