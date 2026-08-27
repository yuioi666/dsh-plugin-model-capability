// The Model Capability settings section (root component).

import { useSyncExternalStore, useState } from "react";
import { localize, en as enDict, zh as zhDict } from "../dict.js";
import { looksLikeLegacyGateway, THINKING_LEVELS } from "../constants.js";
import { Badge, Select, Toast, WarningBox } from "./ui.jsx";
import { PresetBar } from "./PresetBar.jsx";
import { RouteCard } from "./RouteCard.jsx";

const dicts = { en: enDict, zh: zhDict };

function useScope(scope) {
  return useSyncExternalStore(
    (callback) => scope.subscribe(callback),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  );
}

export function Section({ store, owner }) {
  const [toast, setToast] = useState(null);
  // Re-render whenever either scope changes (revision/new value).
  useScope(store.llmScope);
  useScope(store.selfScope);

  const lang = store.effectiveLanguage();
  const t = (key, params) => localize(dicts, lang, key, params);
  const disabled = !store.writable();
  const snap = store.llmSnapshot();

  const notify = (next) => {
    setToast(next);
    if (next?.tone === "good") {
      window.setTimeout(() => setToast((current) => (current === next ? null : current)), 2600);
    }
  };

  const routes = store.routeNames();
  const diagnostics = computeDiagnostics(t, store);
  const language = store.selfSnapshot().value?.language ?? "follow";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxWidth: 980,
        paddingBottom: 48,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, opacity: 0.75, flex: 1 }}>{t("pageIntro")}</div>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.75 }}>{t("langField")}</span>
          <Select
            value={language}
            options={[
              { value: "follow", label: t("langFollow") },
              { value: "en", label: t("langEn") },
              { value: "zh", label: t("langZh") },
            ]}
            onChange={(value) => store.setLanguage(value === void 0 ? "follow" : value)}
          />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {store.writable() ? <Badge tone="good">{t("writableHost")}</Badge> : null}
        {!store.writable() ? <Badge tone="warn">{t("notWritable")}</Badge> : null}
        {snap.mode === "memory" ? <Badge tone="warn">{t("memoryMode")}</Badge> : null}
      </div>

      <Toast toast={toast} />

      {diagnostics.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>{t("diagTitle")}</div>
          {diagnostics.map((item, i) => (
            <WarningBox key={i} tone={item.tone}>
              {item.text}
            </WarningBox>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.55 }}>{t("diagNone")}</div>
      )}

      <div style={{ border: "1px solid color-mix(in srgb, currentColor 22%, transparent)", borderRadius: 10, padding: 14 }}>
        <PresetBar store={store} t={t} routes={routes} onToast={notify} disabled={disabled} />
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>
        {`${routes.length} ${t("route")}`}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {routes.map((route, index) => (
          <RouteCard
            key={route}
            store={store}
            t={t}
            route={route}
            onToast={notify}
            disabled={disabled}
            defaultOpen={index === 0}
          />
        ))}
        {routes.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.65 }}>
            {t("routeNotFound")} — settings.yaml (llm-pi-ai.providers)
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Lightweight advisory checks over the resolved section. */
function computeDiagnostics(t, store) {
  const out = [];
  const providers = store.providers();
  for (const [route, entry] of Object.entries(providers)) {
    if (!entry || typeof entry !== "object") continue;
    if (looksLikeLegacyGateway(entry.baseURL) && entry.compat?.supportsDeveloperRole === true) {
      out.push({ tone: "warn", text: t("diagDeveloperRole").replace("{route}", route) });
    }
    const models = Array.isArray(entry.models) ? entry.models : [];
    for (const model of models) {
      if (!model || typeof model.id !== "string") continue;
      const label = `${route} / ${model.id}`;
      if (model.reasoningEfforts !== false && model.reasoningEfforts) {
        for (const level of THINKING_LEVELS) {
          const value = model.reasoningEfforts[level];
          if (level !== "off" && (value === null || value === "")) {
            out.push({
              tone: "warn",
              text: t("diagEmptyEffort")
                .replace("{route}", route)
                .replace("{model}", model.id)
                .replace("{level}", level),
            });
          }
        }
      }
      if (model.contextWindow === void 0) {
        out.push({ tone: "info", text: t("diagNoContext").replace("{route}", route).replace("{model}", model.id) });
      }
    }
    if (models.length === 0) {
      out.push({ tone: "info", text: t("diagNoModels").replace("{route}", route) });
    }
  }
  return out;
}