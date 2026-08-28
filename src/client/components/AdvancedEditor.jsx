// Route-level advanced fields: numeric limits, extra headers, raw section.

import { useState } from "react";
import { isCredentialHeader, PROVIDER_NUMBER_FIELDS } from "../constants.js";
import { Btn, Field, Grid, NumberInput, TextInput, WarningBox } from "./ui.jsx";

export function AdvancedEditor({ store, t, route, entry, onToast, disabled }) {
  const [rawOpen, setRawOpen] = useState(false);

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

  const setNumber = (field, parsedOrNull) => {
    if (parsedOrNull === null) unset([field]);
    else write([field], parsedOrNull);
  };

  // Headers: rendered as rows; any change rebuilds the whole dict.
  const headerRows = Object.entries(entry.headers ?? {});
  const [draftHeaders, setDraftHeaders] = useState(() =>
    headerRows.map(([key, value]) => ({ key, value: String(value) })),
  );

  /** Which current header rows look like credentials. */
  const credentialKeys = draftHeaders
    .map((r) => r.key.trim())
    .filter((k) => k !== "" && isCredentialHeader(k));
  const hasCredentialHeaders = credentialKeys.length > 0;

  /** Rebuild the headers dict, filtering out any credential-shaped names. */
  const syncHeaders = (rows) => {
    setDraftHeaders(rows);
    const next = {};
    for (const row of rows) {
      const key = row.key.trim();
      if (key === "") continue;
      // Block credential-shaped header names — they are NOT redacted by the
      // Settings service and would leak into custom presets.
      if (isCredentialHeader(key)) continue;
      next[key] = row.value;
    }
    if (Object.keys(next).length === 0) unset(["headers"]);
    else write(["headers"], next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Grid columns={3}>
        {PROVIDER_NUMBER_FIELDS.map((field) => (
          <Field key={field} label={t(field) ?? field}>
            <NumberInput
              value={entry[field]}
              disabled={disabled}
              onCommit={(parsed) => setNumber(field, parsed)}
            />
          </Field>
        ))}
      </Grid>

      <Field label={t("headers")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {hasCredentialHeaders ? (
            <WarningBox tone="bad">
              {t("credentialHeaderWarning").replace("{names}", credentialKeys.join(", "))}
            </WarningBox>
          ) : null}
          {draftHeaders.map((row, index) => (
            <div key={index} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <TextInput
                value={row.key}
                placeholder={t("headerKey")}
                disabled={disabled}
                onCommit={(key) => {
                  const rows = draftHeaders.map((r, i) => (i === index ? { ...r, key } : r));
                  syncHeaders(rows);
                }}
              />
              <TextInput
                value={row.value}
                placeholder={t("headerValue")}
                disabled={disabled}
                onCommit={(value) => {
                  const rows = draftHeaders.map((r, i) => (i === index ? { ...r, value } : r));
                  syncHeaders(rows);
                }}
              />
              <Btn
                kind="danger"
                disabled={disabled}
                onClick={() => syncHeaders(draftHeaders.filter((_, i) => i !== index))}
              >
                ✕
              </Btn>
            </div>
          ))}
          <div>
            <Btn
              disabled={disabled}
              onClick={() => syncHeaders([...draftHeaders, { key: "", value: "" }])}
            >
              + {t("addHeader")}
            </Btn>
          </div>
        </div>
      </Field>

      <div>
        <Btn kind="default" onClick={() => setRawOpen(!rawOpen)}>
          {rawOpen ? `▾ ${t("rawView")}` : `▸ ${t("rawView")}`}
        </Btn>
        {rawOpen ? (
          <pre
            style={{
              marginTop: 8,
              fontSize: 12,
              lineHeight: 1.5,
              overflow: "auto",
              maxHeight: 320,
              border: "1px solid color-mix(in srgb, currentColor 22%, transparent)",
              borderRadius: 8,
              padding: 10,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {JSON.stringify(entry ?? {}, null, 2)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}