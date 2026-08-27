// One-click presets: built-in recipes + saved custom presets.

import { useState } from "react";
import {
  Btn,
  Check,
  Field,
  Modal,
  TextInput,
  WarningBox,
} from "./ui.jsx";

export function PresetBar({ store, t, routes, onToast, disabled }) {
  const [dialog, setDialog] = useState(null); // { presetId, name, desc }
  const [selected, setSelected] = useState(null); // Set-like object of route names
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState("");
  const builtins = store.builtinPresets();
  const customs = store.customPresets();

  const openDialog = (preset) => {
    const all = {};
    for (const route of routes) all[route] = true;
    setSelected(all);
    setDialog(preset);
  };

  const apply = async () => {
    const routeIds = Object.keys(selected ?? {}).filter((r) => selected[r]);
    const result = await store.applyBuiltinPreset(dialog.id, routeIds);
    onToast?.(
      result.ok
        ? { tone: "good", text: t("presetApplied") }
        : { tone: "bad", text: `${t("presetFailed")} ${result.message ?? t("unknownError")}` },
    );
    setDialog(null);
  };

  const save = async () => {
    setSaving(true);
    const name = presetName.trim();
    const result = await store.saveCustomPreset(name || t("savePresetName"));
    setSaving(false);
    onToast?.(
      result.ok
        ? { tone: "good", text: t("presetSaved") }
        : {
            tone: "bad",
            text: result.message === "no-user-routes"
              ? t("noUserRoutesHint")
              : `${t("presetFailed")} ${result.message ?? t("unknownError")}`,
          },
    );
    if (result.ok) setPresetName("");
  };

  const applyCustom = async (id) => {
    if (!window.confirm(t("confirmApplyCustom"))) return;
    const result = await store.applyCustomPreset(id);
    onToast?.(
      result.ok
        ? { tone: "good", text: t("presetApplied") }
        : { tone: "bad", text: `${t("presetFailed")} ${result.message ?? t("unknownError")}` },
    );
  };

  const deleteCustom = async (id) => {
    if (!window.confirm(t("confirmDeleteCustom"))) return;
    const result = await store.deleteCustomPreset(id);
    onToast?.(
      result.ok
        ? { tone: "good", text: t("presetSaved") }
        : { tone: "bad", text: `${t("presetFailed")} ${result.message ?? t("unknownError")}` },
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{t("presetTitle")}</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{t("presetIntro")}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {builtins.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={disabled || routes.length === 0}
            onClick={() => openDialog(preset)}
            title={t(preset.descKey)}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              textAlign: "left",
              font: "inherit",
              color: "inherit",
              background: "transparent",
              border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer",
              maxWidth: 220,
              opacity: disabled || routes.length === 0 ? 0.5 : 1,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 13 }}>{t(preset.nameKey)}</span>
            <span style={{ fontSize: 11, opacity: 0.65 }}>{t(preset.descKey)}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Field label={t("savePreset")} style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <TextInput
              value={presetName}
              placeholder={t("savePresetName")}
              disabled={disabled || saving}
              onCommit={() => save()}
            />
            <Btn kind="primary" disabled={disabled || saving} onClick={save}>
              {t("savePresetBtn")}
            </Btn>
          </div>
        </Field>
      </div>
      {Object.keys(store.userProviders()).length === 0 ? (
        <WarningBox tone="neutral">{t("noUserRoutesHint")}</WarningBox>
      ) : null}

      {customs.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 600 }}>{t("customPresetsTitle")}</div>
          {customs.map((preset) => (
            <div
              key={preset.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{preset.name || preset.id}</span>
              <span style={{ fontSize: 11, opacity: 0.55 }}>
                {new Date(preset.createdAt).toLocaleString()}
              </span>
              <Btn disabled={disabled} onClick={() => applyCustom(preset.id)} title={t("applyCustom")}>
                {t("applyPreset")}
              </Btn>
              <Btn kind="danger" disabled={disabled} onClick={() => deleteCustom(preset.id)}>
                ✕
              </Btn>
            </div>
          ))}
        </div>
      ) : null}

      {dialog ? (
        <Modal title={`${t(dialog.nameKey)} — ${t("presetRoutes")}`} onClose={() => setDialog(null)}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxHeight: 320,
              overflow: "auto",
              marginBottom: 12,
            }}
          >
            {routes.map((route) => (
              <Check
                key={route}
                label={route}
                checked={selected?.[route] === true}
                onChange={(checked) => setSelected({ ...selected, [route]: checked })}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Btn
              onClick={() => {
                const all = {};
                for (const route of routes) all[route] = true;
                setSelected(all);
              }}
            >
              {t("selectAll")}
            </Btn>
            <Btn onClick={() => setSelected({})}>{t("deselectAll")}</Btn>
            <span style={{ flex: 1 }} />
            <Btn onClick={() => setDialog(null)}>{t("cancel")}</Btn>
            <Btn kind="primary" onClick={apply}>
              {t("applyPreset")}
            </Btn>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}