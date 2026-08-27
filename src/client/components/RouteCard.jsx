// One route card: identity, per-model editors, defaults, compat, advanced.

import {
  APIS,
  looksLikeLegacyGateway,
} from "../constants.js";
import { Badge, Field, Fold, Grid, Select, TextInput } from "./ui.jsx";
import { DefaultsEditor } from "./DefaultsEditor.jsx";
import { CompatEditor } from "./CompatEditor.jsx";
import { AdvancedEditor } from "./AdvancedEditor.jsx";
import { ModelEditor } from "./ModelEditor.jsx";

export function RouteCard({ store, t, route, onToast, disabled, defaultOpen }) {
  const entry = store.route(route);
  if (entry === void 0) return null;

  const toast = (result) =>
    onToast?.(
      result.ok
        ? { tone: "good", text: t("applied") }
        : { tone: "bad", text: `${t("writeFailed")} ${result.message ?? t("unknownError")}` },
    );

  const write = async (suffix, value) => {
    const result = await store.writeRouteField(route, suffix, value);
    toast(result);
  };
  const unset = async (suffix) => {
    const result = await store.writeRouteField(route, suffix, void 0, { unset: true });
    toast(result);
  };

  const legacyBad = looksLikeLegacyGateway(entry.baseURL) && entry.compat?.supportsDeveloperRole === true;
  const models = store.modelsOf(route);
  const modernGateway = looksLikeLegacyGateway(entry.baseURL) && entry.compat?.supportsDeveloperRole === false;

  return (
    <Fold
      title={entry.displayName || route}
      badge={
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
          {legacyBad ? <Badge tone="warn">!compat</Badge> : null}
          {modernGateway ? <Badge tone="neutral">{t("off")}</Badge> : null}
          <Badge tone="neutral">{`${models.length} ${t("model")}`}</Badge>
        </span>
      }
      defaultOpen={defaultOpen}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Grid columns={3}>
          <Field label={t("displayName")}>
            <TextInput
              value={entry.displayName ?? ""}
              placeholder={route}
              onCommit={(value) =>
                value.trim() === "" ? unset(["displayName"]) : write(["displayName"], value)
              }
              disabled={disabled}
            />
          </Field>
          <Field label={t("baseURL")}>
            <TextInput
              value={entry.baseURL ?? ""}
              onCommit={(value) =>
                value.trim() === "" ? unset(["baseURL"]) : write(["baseURL"], value)
              }
              disabled={disabled}
            />
          </Field>
          <Field label={t("api")}>
            <Select
              value={entry.api}
              options={APIS}
              allowUnset
              unsetLabel="—"
              disabled={disabled}
              onChange={(value) => (value === void 0 ? unset(["api"]) : write(["api"], value))}
            />
          </Field>
        </Grid>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          {t("routeId")}: <code style={{ wordBreak: "break-all" }}>{route}</code>
          {entry.apiKeyEnv ? (
            <>
              {" · "}
              {t("apiKeyEnv")}: <code>{entry.apiKeyEnv}</code>
            </>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>{`${models.length} ${t("model")}`}</div>
          {models.length === 0 ? (
            <div style={{ fontSize: 12, opacity: 0.6 }}>{t("diagNoModels").replace("{route}", route)}</div>
          ) : (
            models.map((model) =>
              model && typeof model.id === "string" ? (
                <ModelEditor
                  key={model.id}
                  store={store}
                  t={t}
                  route={route}
                  model={model}
                  onToast={onToast}
                  disabled={disabled}
                />
              ) : null,
            )
          )}
        </div>

        <Fold title={t("defaultsTitle")}>
          <DefaultsEditor store={store} t={t} route={route} entry={entry} onToast={onToast} disabled={disabled} />
        </Fold>

        <Fold title={t("compatTitle")}>
          <CompatEditor
            store={store}
            t={t}
            route={route}
            suffixPath={[]}
            compat={entry.compat}
            onToast={onToast}
            disabled={disabled}
          />
        </Fold>

        <Fold title={t("advancedFold")}>
          <AdvancedEditor store={store} t={t} route={route} entry={entry} onToast={onToast} disabled={disabled} />
        </Fold>
      </div>
    </Fold>
  );
}