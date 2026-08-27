// Minimal presentational primitives for the Model Capability page.
//
// Styling is theme-agnostic: no hard-coded colors beyond mixing with
// `currentColor`, so the page reads correctly in both light and dark DSH
// themes without depending on theme token names.

import { useEffect, useState } from "react";
import { formatCapacity, parseCapacity } from "../constants.js";

const border = "1px solid color-mix(in srgb, currentColor 22%, transparent)";
const borderStrong = "1px solid color-mix(in srgb, currentColor 45%, transparent)";

const inputStyle = {
  font: "inherit",
  color: "inherit",
  background: "transparent",
  border,
  borderRadius: 6,
  padding: "4px 8px",
  outline: "none",
  minWidth: 0,
  width: "100%",
  boxSizing: "border-box",
};

export function Btn({ children, onClick, disabled, title, kind = "default", style }) {
  const base = {
    font: "inherit",
    color: "inherit",
    background: "transparent",
    border,
    borderRadius: 6,
    padding: "4px 10px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
  const kinds = {
    default: {},
    primary: {
      border: borderStrong,
      background: "color-mix(in srgb, currentColor 10%, transparent)",
    },
    danger: {
      border,
      color: "color-mix(in srgb, #dc2626 80%, currentColor)",
    },
  };
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...kinds[kind], ...style }}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, ...style }}>
      <span style={{ fontSize: 12, opacity: 0.75 }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 11, opacity: 0.55 }}>{hint}</span> : null}
    </label>
  );
}

/** Text input that commits on blur or Enter. */
export function TextInput({ value, onCommit, placeholder, disabled, style, width }) {
  const [draft, setDraft] = useState(String(value ?? ""));
  useEffect(() => {
    setDraft(String(value ?? ""));
  }, [value]);
  const commit = () => {
    if (draft !== String(value ?? "") && typeof onCommit === "function") onCommit(draft);
  };
  return (
    <input
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={{ ...inputStyle, width: width ?? "100%", ...style }}
    />
  );
}

/** Capacity input: "256K"/"1M" spellings, committed as plain counts.
 * Empty commit → onCommit(null) (caller decides unset); unreadable → ignored. */
export function CapacityInput({ value, onCommit, placeholder, disabled, hint, style }) {
  const [draft, setDraft] = useState(() => formatCapacity(value));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (!bad) setDraft(formatCapacity(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, bad]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== void 0 && value !== null && typeof onCommit === "function") onCommit(null);
      return;
    }
    const parsed = parseCapacity(trimmed);
    if (Number.isNaN(parsed)) {
      setBad(true);
      setDraft(formatCapacity(value));
      setTimeout(() => setBad(false), 900);
      return;
    }
    if (parsed !== value && typeof onCommit === "function") onCommit(parsed);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", ...style }}>
      <input
        value={draft}
        disabled={disabled}
        placeholder={placeholder ?? hint}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        style={{
          ...inputStyle,
          borderColor: bad ? "color-mix(in srgb, #dc2626 70%, currentColor)" : undefined,
        }}
      />
      {hint ? (
        <span style={{ fontSize: 11, opacity: 0.55 }}>{hint}</span>
      ) : null}
    </div>
  );
}

/** Plain-count numeric input; empty commit → onCommit(null). */
export function NumberInput({ value, onCommit, placeholder, disabled, style }) {
  const [draft, setDraft] = useState(value === void 0 || value === null ? "" : String(value));
  useEffect(() => {
    setDraft(value === void 0 || value === null ? "" : String(value));
  }, [value]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== void 0 && value !== null && typeof onCommit === "function") onCommit(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setDraft(value === void 0 || value === null ? "" : String(value));
      return;
    }
    if (parsed !== value && typeof onCommit === "function") onCommit(parsed);
  };
  return (
    <input
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      style={{ ...inputStyle, ...style }}
    />
  );
}

/** Select with an optional "(default)" unset entry. */
export function Select({ value, options, onChange, allowUnset, unsetLabel, disabled, style }) {
  const present = value !== void 0 && value !== null;
  return (
    <select
      value={present ? String(value) : ""}
      disabled={disabled}
      onChange={(e) => {
        const text = e.target.value;
        if (text === "__unset__") onChange(void 0);
        else onChange(text);
      }}
      style={{ ...inputStyle, cursor: "pointer", ...style }}
    >
      {!present && allowUnset ? <option value="">{unsetLabel}</option> : null}
      {present && allowUnset ? <option value="__unset__">{unsetLabel}</option> : null}
      {!present && !allowUnset ? <option value="">—</option> : null}
      {options.map((option) => {
        const label = typeof option === "string" ? option : option.label;
        const value_ = typeof option === "string" ? option : option.value;
        return (
          <option key={value_} value={String(value_)}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

export function Check({ label, checked, onChange, disabled, hint }) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1 }}>
      <input
        type="checkbox"
        checked={checked === true}
        disabled={disabled}
        onChange={(e) => typeof onChange === "function" && onChange(e.target.checked)}
        style={{ marginTop: 3, accentColor: "currentColor" }}
      />
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span>{label}</span>
        {hint ? <span style={{ fontSize: 11, opacity: 0.55 }}>{hint}</span> : null}
      </span>
    </label>
  );
}

export function Fold({ title, badge, defaultOpen = false, children, right }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border, borderRadius: 8, overflow: "hidden" }}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          cursor: "pointer",
          userSelect: "none",
          background: "color-mix(in srgb, currentColor 5%, transparent)",
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.7, width: 14, display: "inline-block" }}>
          {open ? "▾" : "▸"}
        </span>
        <span style={{ fontWeight: 600 }}>{title}</span>
        {badge ? <Badge tone="neutral">{badge}</Badge> : null}
        <span style={{ flex: 1 }} />
        {right}
      </div>
      {open ? <div style={{ padding: 12 }}>{children}</div> : null}
    </div>
  );
}

const badgeTones = {
  neutral: {},
  good: { color: "color-mix(in srgb, #16a34a 80%, currentColor)" },
  warn: { color: "color-mix(in srgb, #d97706 85%, currentColor)" },
  bad: { color: "color-mix(in srgb, #dc2626 80%, currentColor)" },
};

export function Badge({ children, tone = "neutral" }) {
  return (
    <span
      style={{
        fontSize: 11,
        padding: "1px 7px",
        borderRadius: 999,
        border,
        opacity: 0.9,
        whiteSpace: "nowrap",
        ...badgeTones[tone],
      }}
    >
      {children}
    </span>
  );
}

export function WarningBox({ children, tone = "warn" }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        border,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        ...(tone === "warn"
          ? { borderColor: "color-mix(in srgb, #d97706 45%, transparent)" }
          : tone === "bad"
            ? { borderColor: "color-mix(in srgb, #dc2626 50%, transparent)" }
            : {}),
      }}
    >
      <span style={{ opacity: 0.8 }}>{tone === "bad" ? "✕" : tone === "good" ? "✓" : "ℹ"}</span>
      <span>{children}</span>
    </div>
  );
}

export function Grid({ columns = 2, gap = 12, children, style }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "Canvas",
          color: "CanvasText",
          border,
          borderRadius: 12,
          padding: 16,
          maxWidth: 540,
          width: "100%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontWeight: 700, flex: 1 }}>{title}</span>
          <Btn onClick={onClose} title="close" style={{ padding: "2px 8px" }}>
            ✕
          </Btn>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Small inline toast used for write results. */
export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      style={{
        border,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 13,
        ...(toast.tone === "bad"
          ? { borderColor: "color-mix(in srgb, #dc2626 50%, transparent)" }
          : toast.tone === "good"
            ? { borderColor: "color-mix(in srgb, #16a34a 50%, transparent)" }
            : {}),
      }}
    >
      {toast.text}
    </div>
  );
}