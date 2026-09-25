import { useState } from "react";
import {
  DEFAULT_SYNC_FIELDS,
  buildModelsDevSync,
  guessModelsDevProvider,
  loadModelsDevCatalog,
} from "../models-dev.js";
import { Btn, Check, Fold, Select, WarningBox } from "./ui.jsx";

export function ModelsDevSync({ store, t, routes, onToast, disabled }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selections, setSelections] = useState({});
  const [fields, setFields] = useState(DEFAULT_SYNC_FIELDS);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const loaded = await loadModelsDevCatalog({ force: result !== null });
      setResult(loaded);
      const next = {};
      for (const route of routes) {
        next[route] = guessModelsDevProvider(route, store.route(route), loaded.catalog);
      }
      setSelections(next);
    } catch (err) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  // Recompute on every settings-scope render as the store is an external
  // mutable mirror whose object identity does not change with revisions.
  const preview = result
    ? buildModelsDevSync(store.providers(), result.catalog, selections, fields)
    : null;

  const apply = async () => {
    const built = buildModelsDevSync(store.providers(), result.catalog, selections, fields);
    const response = await store.applyModelsDevSync(built.replacements);
    onToast?.(
      response.ok
        ? { tone: "good", text: t("syncApplied", { count: built.stats.changedModels }) }
        : { tone: "bad", text: `${t("syncFailed")} ${response.message ?? t("unknownError")}` },
    );
  };

  const providerOptions = Object.values(result?.catalog?.providers ?? {})
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((provider) => ({ value: provider.id, label: `${provider.name} (${provider.id})` }));

  return (
    <Fold title={t("syncTitle")} defaultOpen={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.72 }}>{t("syncIntro")}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Btn onClick={load} disabled={loading}>
            {loading ? t("syncLoading") : t(result ? "syncRefresh" : "syncLoad")}
          </Btn>
          {result ? (
            <span style={{ fontSize: 11, opacity: 0.65 }}>
              {t(`syncSource_${result.source}`)} · {new Date(result.savedAt).toLocaleString()}
            </span>
          ) : null}
        </div>
        {error ? <WarningBox tone="bad">{t("syncUnavailable")} {error}</WarningBox> : null}
        {result?.stale ? (
          <WarningBox tone="warn">{t("syncStaleFallback")} {result.warning}</WarningBox>
        ) : null}

        {result ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{t("syncFields")}</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {Object.keys(DEFAULT_SYNC_FIELDS).map((field) => (
                <Check
                  key={field}
                  label={t(`syncField_${field}`)}
                  checked={fields[field] === true}
                  onChange={(checked) => setFields({ ...fields, [field]: checked })}
                />
              ))}
            </div>
            {fields.reasoningEfforts ? (
              <WarningBox tone="neutral">{t("syncReasoningHint")}</WarningBox>
            ) : null}

            <div style={{ fontSize: 12, fontWeight: 600 }}>{t("syncRouteMapping")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {routes.map((route) => (
                <div key={route} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(220px, 2fr)", gap: 8, alignItems: "center" }}>
                  <code style={{ fontSize: 12 }}>{route}</code>
                  <Select
                    value={selections[route]}
                    options={providerOptions}
                    allowUnset
                    unsetLabel={t("syncDoNotSync")}
                    onChange={(value) => setSelections({ ...selections, [route]: value })}
                  />
                </div>
              ))}
            </div>

            <WarningBox tone="neutral">
              {t("syncPreview", preview?.stats)}
              {preview?.stats.skippedReasoning > 0
                ? ` ${t("syncSkippedReasoning", { count: preview.stats.skippedReasoning })}`
                : ""}
            </WarningBox>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Btn
                kind="primary"
                disabled={disabled || !preview || preview.stats.changedRoutes === 0}
                onClick={apply}
              >
                {t("syncApply")}
              </Btn>
            </div>
          </>
        ) : null}
      </div>
    </Fold>
  );
}
