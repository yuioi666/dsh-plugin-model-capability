// Route-level defaults editor: fallbacks used when a model/turn does not
// declare a value.

import { MODALITIES, THINKING_LEVELS } from "../constants.js";
import { UNSET } from "../store.js";
import {
  CapacityInput,
  Check,
  Field,
  Grid,
  NumberInput,
  Select,
} from "./ui.jsx";

export function DefaultsEditor({ store, t, route, entry, onToast, disabled }) {
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

  const setCapacity = (suffix, parsedOrNull) => {
    if (parsedOrNull === null) unset(suffix);
    else write(suffix, parsedOrNull);
  };
  const setPlain = (suffix, parsedOrNull) => {
    if (parsedOrNull === null) unset(suffix);
    else write(suffix, parsedOrNull);
  };

  const toggleDefaultInput = (modality, checked) => {
    const current = Array.isArray(entry.defaultInput) ? entry.defaultInput : [];
    const next = checked
      ? [...current, modality]
      : current.filter((m) => m !== modality);
    write(["defaultInput"], next);
  };

  const budgets = entry.thinkingBudgets ?? {};
  const setBudget = (key, parsedOrNull) => {
    const next = { ...budgets };
    if (parsedOrNull === null) delete next[key];
    else next[key] = parsedOrNull;
    if (Object.keys(next).length === 0) unset(["thinkingBudgets"]);
    else write(["thinkingBudgets"], next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Grid columns={3}>
        <Field label={t("defaultContextWindow")} hint={t("capacityHint")}>
          <CapacityInput
            value={entry.defaultContextWindow}
            onCommit={(parsed) => setCapacity(["defaultContextWindow"], parsed)}
            disabled={disabled}
          />
        </Field>
        <Field label={t("defaultMaxTokens")} hint={t("capacityHint")}>
          <CapacityInput
            value={entry.defaultMaxTokens}
            onCommit={(parsed) => setCapacity(["defaultMaxTokens"], parsed)}
            disabled={disabled}
          />
        </Field>
        <Field label={t("reasoningDefault")}>
          <Select
            value={entry.reasoning}
            options={THINKING_LEVELS}
            allowUnset
            unsetLabel="—"
            disabled={disabled}
            onChange={(value) => (value === void 0 ? unset(["reasoning"]) : write(["reasoning"], value))}
          />
        </Field>
      </Grid>
      <Grid columns={2}>
        <Field label={t("defaultInput")}>
          <div style={{ display: "flex", gap: 16 }}>
            {MODALITIES.map((modality) => (
              <Check
                key={modality}
                label={t(modality === "text" ? "modalityText" : "modalityImage")}
                checked={Array.isArray(entry.defaultInput) && entry.defaultInput.includes(modality)}
                disabled={disabled}
                onChange={(checked) => toggleDefaultInput(modality, checked)}
              />
            ))}
          </div>
        </Field>
        <Field label={t("thinkingBudgets")}>
          <Grid columns={4} gap={8}>
            {["minimal", "low", "medium", "high"].map((key) => (
              <Field key={key} label={key}>
                <NumberInput
                  value={budgets[key]}
                  disabled={disabled}
                  onCommit={(parsed) => setBudget(key, parsed)}
                />
              </Field>
            ))}
          </Grid>
        </Field>
      </Grid>
      <Grid columns={2}>
        <Field label={t("cacheRetention")}>
          <Select
            value={entry.cacheRetention}
            options={["none", "short", "long"]}
            allowUnset
            unsetLabel="—"
            disabled={disabled}
            onChange={(value) => (value === void 0 ? unset(["cacheRetention"]) : write(["cacheRetention"], value))}
          />
        </Field>
        <Field label={t("transport")}>
          <Select
            value={entry.transport}
            options={["sse", "websocket", "websocket-cached", "auto"]}
            allowUnset
            unsetLabel="—"
            disabled={disabled}
            onChange={(value) => (value === void 0 ? unset(["transport"]) : write(["transport"], value))}
          />
        </Field>
      </Grid>
    </div>
  );
}