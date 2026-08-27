// Gateway compatibility editor — shared by route-level and model-level
// compat profiles. Edits commit immediately as settings.mutate ops.

import {
  COMPAT_BOOLEAN_FIELDS,
  COMPAT_SELECT_FIELDS,
} from "../constants.js";
import { en as enDict } from "../dict.js";
import { Check, Field, Grid, Select } from "./ui.jsx";

export function CompatEditor({ store, t, route, suffixPath, compat, onToast, disabled }) {
  const bool = (field) => compat?.[field] === true;
  const setBool = async (field, value) => {
    const result = await store.writeRouteField(route, [...suffixPath, "compat", field], value);
    onToast?.(
      result.ok
        ? { tone: "good", text: t("applied") }
        : { tone: "bad", text: `${t("writeFailed")} ${result.message ?? t("unknownError")}` },
    );
  };
  const selectValue = (field) => compat?.[field];
  const setSelect = async (field, value) => {
    if (value === void 0) {
      const result = await store.writeRouteField(route, [...suffixPath, "compat", field], void 0, { unset: true });
      onToast?.(
        result.ok
          ? { tone: "good", text: t("applied") }
          : { tone: "bad", text: `${t("writeFailed")} ${result.message ?? t("unknownError")}` },
      );
      return;
    }
    const result = await store.writeRouteField(route, [...suffixPath, "compat", field], value);
    onToast?.(
      result.ok
        ? { tone: "good", text: t("applied") }
        : { tone: "bad", text: `${t("writeFailed")} ${result.message ?? t("unknownError")}` },
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{t("compatIntro")}</div>
      <Grid columns={2}>
        {COMPAT_BOOLEAN_FIELDS.map((field) => {
          const hintKey = `${field}Hint`;
          return (
            <Check
              key={field}
              label={t(field) ?? field}
              hint={hintKey in enDict ? t(hintKey) : void 0}
              checked={bool(field)}
              disabled={disabled}
              onChange={(value) => setBool(field, value)}
            />
          );
        })}
      </Grid>
      <Grid columns={3}>
        {COMPAT_SELECT_FIELDS.map(({ key, options }) => (
          <Field key={key} label={t(key) ?? key}>
            <Select
              value={selectValue(key)}
              options={options}
              allowUnset
              unsetLabel="—"
              disabled={disabled}
              onChange={(value) => setSelect(key, value)}
            />
          </Field>
        ))}
      </Grid>
    </div>
  );
}