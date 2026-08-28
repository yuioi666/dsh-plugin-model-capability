// One model's editor: identity, capacities, input modalities and the
// 7-level reasoning efforts matrix (plus a per-model compat fold).

import { useState } from "react";
import { MODALITIES, THINKING_LEVELS } from "../constants.js";
import { fullThinkingLevels } from "../presets.js";
import { UNSET } from "../store.js";
import {
  Badge,
  Btn,
  CapacityInput,
  Check,
  Field,
  Fold,
  Grid,
  TextInput,
} from "./ui.jsx";
import { CompatEditor } from "./CompatEditor.jsx";

const CAPACITY_FIELDS = ["contextWindow", "maxTokens"];

export function ModelEditor({ store, t, route, model, onToast, disabled }) {
  const [confirmAll, setConfirmAll] = useState(false);
  const modelId = model.id;
  const thinkingOff = model.reasoningEfforts === false;
  const efforts =
    thinkingOff || model.reasoningEfforts === void 0
      ? {}
      : model.reasoningEfforts && typeof model.reasoningEfforts === "object"
        ? model.reasoningEfforts
        : {};

  const toast = (result, okKey, failKey) => {
    onToast?.(
      result.ok
        ? { tone: "good", text: t(okKey ?? "applied") }
        : { tone: "bad", text: `${t(failKey ?? "writeFailed")} ${result.message ?? t("unknownError")}` },
    );
  };

  const writeFields = async (fields) => {
    const result = await store.writeModelField(route, modelId, fields);
    toast(result);
  };

  const setCapacity = (field, parsedOrNull) => {
    const fields = {};
    fields[field] = parsedOrNull === null ? UNSET : parsedOrNull;
    writeFields(fields);
  };

  const setName = (text) => {
    writeFields({ name: text.trim() === "" ? UNSET : text });
  };

  const toggleInput = (modality, checked) => {
    const current = Array.isArray(model.input) ? model.input : [];
    const next = checked
      ? [...current, modality]
      : current.filter((m) => m !== modality);
    writeFields({ input: next });
  };

  const toggleThinking = (enabled) => {
    writeFields({ reasoningEfforts: enabled ? fullThinkingLevels() : false });
  };

  const setLevel = async (level, wireOrNull) => {
    // Rebuild the whole dict from the current one; validate that at least
    // one thinking level other than 'off' carries a wire value (the Host
    // rejects exactly this shape as unserviceable).
    const next = { ...efforts };
    if (wireOrNull === UNSET) delete next[level];
    else next[level] = wireOrNull;
    const nonOff = Object.entries(next).filter(([key, value]) => key !== "off" && typeof value === "string" && value.length > 0);
    if (nonOff.length === 0) {
      onToast?.({ tone: "bad", text: `${t("writeFailed")} ${t("reasoningNeedsOneLevel")}` });
      return;
    }
    const result = await store.writeModelField(route, modelId, { reasoningEfforts: next });
    toast(result);
  };

  const fillLevels = () => writeFields({ reasoningEfforts: fullThinkingLevels() });

  const applyToAll = async () => {
    const result = await store.applyModelToAll(route, modelId, [
      ...CAPACITY_FIELDS,
      "input",
      "reasoningEfforts",
    ]);
    toast(result);
    setConfirmAll(false);
  };

  return (
    <div
      style={{
        border,
        borderRadius: 8,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600, wordBreak: "break-all" }}>{modelId}</span>
        {thinkingOff ? <Badge tone="neutral">{t("off")}</Badge> : null}
        <span style={{ flex: 1 }} />
        <Btn
          kind={confirmAll ? "danger" : "default"}
          onClick={() => (confirmAll ? applyToAll() : setConfirmAll(true))}
          title={t("applyToAllModels")}
        >
          {confirmAll ? `${t("applyToAllModels")} ✓` : "↳"}
        </Btn>
      </div>

      <Grid columns={3}>
        <Field label={t("modelName")}>
          <TextInput
            value={model.name ?? ""}
            placeholder={modelId}
            onCommit={setName}
            disabled={disabled}
          />
        </Field>
        <Field label={t("contextWindow")} hint={t("capacityHint")}>
          <CapacityInput
            value={model.contextWindow}
            onCommit={(parsed) => setCapacity("contextWindow", parsed)}
            disabled={disabled}
          />
        </Field>
        <Field label={t("maxTokens")} hint={t("capacityHint")}>
          <CapacityInput
            value={model.maxTokens}
            onCommit={(parsed) => setCapacity("maxTokens", parsed)}
            disabled={disabled}
          />
        </Field>
      </Grid>

      <Grid columns={2}>
        <Field label={t("inputModalities")}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {MODALITIES.map((modality) => (
              <Check
                key={modality}
                label={t(modality === "text" ? "modalityText" : "modalityImage")}
                checked={Array.isArray(model.input) && model.input.includes(modality)}
                disabled={disabled}
                onChange={(checked) => toggleInput(modality, checked)}
              />
            ))}
          </div>
        </Field>
        <Field label={t("thinkingEnabled")}>
          <Check
            label={t("thinkingEnabled")}
            checked={!thinkingOff}
            disabled={disabled}
            onChange={toggleThinking}
            hint={thinkingOff ? t("reasoningFalseHint") : void 0}
          />
        </Field>
      </Grid>

      {!thinkingOff ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{t("thinkingHint")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {THINKING_LEVELS.map((level) => {
              const raw = efforts[level];
              const value = raw === void 0 || raw === null ? "" : String(raw);
              const isOff = level === "off";
              return (
                <div key={level} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 110, fontSize: 13, opacity: 0.9, flexShrink: 0 }}>
                    {t(`level${level[0].toUpperCase()}${level.slice(1)}`)}
                  </span>
                  <TextInput
                    value={value}
                    placeholder={isOff ? t("offPlaceholder") : t("wirePlaceholder")}
                    disabled={disabled}
                    onCommit={(text) =>
                      setLevel(
                        level,
                        text.trim() === "" ? (isOff ? null : UNSET) : text,
                      )
                    }
                    width="100%"
                  />
                  {isOff ? <span style={{ fontSize: 11, opacity: 0.5 }}>{t("offPlaceholder")}</span> : null}
                </div>
              );
            })}
          </div>
          <div>
            <Btn onClick={fillLevels} disabled={disabled} title={t("fillLevels")}>
              {t("fillLevels")}
            </Btn>
          </div>
        </div>
      ) : null}

      <Fold title={t("modelCompat")} defaultOpen={false}>
        <CompatEditor
          store={store}
          t={t}
          route={route}
          compat={model.compat}
          onToast={onToast}
          disabled={disabled}
          modelId={modelId}
        />
      </Fold>
    </div>
  );
}

function modelIndexFor(store, route, modelId) {
  const index = store.modelIndexById(route, modelId);
  return String(index < 0 ? 0 : index);
}

const border = "1px solid color-mix(in srgb, currentColor 22%, transparent)";