// Minimal presentational primitives for the Model Capability page.
//
// Styling is theme-agnostic: no hard-coded colors beyond mixing with
// `currentColor`, so the page reads correctly in both light and dark DSH
// themes without depending on theme token names.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatCapacity, parseCapacity } from "../constants.js";

const border = "1px solid color-mix(in srgb, currentColor 22%, transparent)";
const borderStrong = "1px solid color-mix(in srgb, currentColor 45%, transparent)";

const inputStyle = {
  font: "inherit",
  color: "inherit",
  background: "transparent",
  border,
  borderRadius: 6,
  padding: "5px 10px",
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
    padding: "5px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
    transition: "background 0.15s, border-color 0.15s",
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
      <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 500 }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.4 }}>{hint}</span> : null}
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
    <div style={{ display: "flex", flexDirection: "column", gap: 3, width: "100%", ...style }}>
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
        <span style={{ fontSize: 11, opacity: 0.55, lineHeight: 1.4 }}>{hint}</span>
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

/** Custom dropdown select that renders in the DOM instead of using a native
 * <select>. Native <select> dropdowns are rendered as OS-level popups which
 * ignore page styles — they show a white background with invisible light text
 * in dark mode (Chrome on Windows). This custom version uses theme-aware CSS
 * system colors so the popup reads correctly in both light and dark DSH themes.
 */
export function Select({ value, options, onChange, allowUnset, unsetLabel, disabled, style }) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const triggerRef = useRef(null);
  const wrapperRef = useRef(null);
  const dropdownRef = useRef(null);

  const present = value !== void 0 && value !== null;

  // Build the full item list (unset option + user options) for navigation.
  const allItems = [];
  if (!present && allowUnset) allItems.push({ label: unsetLabel, val: void 0, isUnset: true });
  if (present && allowUnset) allItems.push({ label: unsetLabel, val: void 0, isUnset: true });
  if (!present && !allowUnset) allItems.push({ label: "—", val: void 0, isDisabled: true });
  for (const option of options) {
    const label = typeof option === "string" ? option : option.label;
    const val = typeof option === "string" ? option : option.value;
    allItems.push({ label, val: String(val), raw: val });
  }

  // Current display label.
  let currentLabel = present ? String(value) : (unsetLabel || "—");
  if (present) {
    const match = options.find((opt) => {
      const val = typeof opt === "string" ? opt : opt.value;
      return String(val) === String(value);
    });
    if (match) currentLabel = typeof match === "string" ? match : match.label;
  }

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inTrigger = wrapperRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      // The listbox is rendered through a portal under document.body, so it
      // is not a DOM descendant of wrapperRef. Treat both trees as inside;
      // otherwise mousedown unmounts the option before its click can commit.
      if (!inTrigger && !inDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close / navigate on keyboard.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIdx((prev) => {
          let next = prev < 0 ? 0 : prev + 1;
          if (next >= allItems.length) next = 0;
          return next;
        });
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIdx((prev) => {
          let next = prev <= 0 ? allItems.length - 1 : prev - 1;
          return next;
        });
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const item = allItems[focusedIdx];
        if (item && !item.isDisabled) {
          setOpen(false);
          onChange(item.raw);
          triggerRef.current?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, focusedIdx, allItems, onChange]);

  // Reset focused index when opening.
  useEffect(() => {
    if (open) {
      const defaultIdx = present
        ? allItems.findIndex((item) => !item.isUnset && String(item.raw) === String(value))
        : 0;
      setFocusedIdx(defaultIdx >= 0 ? defaultIdx : 0);
    } else {
      setFocusedIdx(-1);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClickOption = (item) => {
    if (item.isDisabled) return;
    setOpen(false);
    onChange(item.raw);
    triggerRef.current?.focus();
  };

  const triggerStyle = {
    ...inputStyle,
    cursor: disabled ? "not-allowed" : "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    opacity: disabled ? 0.5 : 1,
    ...style,
  };

  const dropdownStyle = {
    position: "fixed",
    zIndex: 9999,
    background: "Canvas",
    color: "CanvasText",
    border,
    borderRadius: 6,
    maxHeight: 220,
    overflow: "auto",
    boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
    minWidth: 120,
  };

  const optionBase = {
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "inherit",
    lineHeight: 1.4,
    transition: "background 0.08s",
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", ...style }}>
      <div
        ref={triggerRef}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={open}
        aria-disabled={disabled}
        aria-haspopup="listbox"
        onClick={() => { if (!disabled) setOpen((v) => !v); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            if (!disabled) setOpen(true);
          }
        }}
        style={triggerStyle}
      >
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: present ? 1 : 0.5,
          }}
        >
          {currentLabel}
        </span>
        <span style={{ fontSize: 9, opacity: 0.45, flexShrink: 0, lineHeight: 1 }}>▾</span>
      </div>

      {open &&
        createPortal(
          <div
            role="listbox"
            style={dropdownStyle}
            ref={(el) => {
              dropdownRef.current = el;
              if (el && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                el.style.top = `${rect.bottom + 2}px`;
                el.style.left = `${rect.left}px`;
                el.style.width = `${rect.width}px`;
              }
            }}
          >
            {allItems.map((item, idx) => (
              <div
                key={idx}
                role="option"
                aria-selected={present && String(item.raw) === String(value)}
                onClick={() => handleClickOption(item)}
                onMouseEnter={() => setFocusedIdx(idx)}
                style={{
                  ...optionBase,
                  fontWeight: present && String(item.raw) === String(value) ? 600 : 400,
                  opacity: item.isDisabled ? 0.4 : 1,
                  cursor: item.isDisabled ? "default" : "pointer",
                  background:
                    focusedIdx === idx
                      ? "color-mix(in srgb, currentColor 14%, transparent)"
                      : present && String(item.raw) === String(value)
                        ? "color-mix(in srgb, currentColor 7%, transparent)"
                        : "transparent",
                  borderBottom: idx < allItems.length - 1 ? border : "none",
                }}
              >
                {item.label}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
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
        style={{ marginTop: 3, accentColor: "currentColor", flexShrink: 0 }}
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
        <span style={{ fontSize: 11, opacity: 0.6, width: 14, display: "inline-flex", justifyContent: "center", flexShrink: 0 }}>
          {open ? "▾" : "▸"}
        </span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
        {badge ? <Badge tone="neutral">{badge}</Badge> : null}
        <span style={{ flex: 1 }} />
        {right}
      </div>
      {open ? <div style={{ padding: "10px 12px" }}>{children}</div> : null}
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
        opacity: 0.85,
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
        lineHeight: 1.5,
        ...(tone === "warn"
          ? { borderColor: "color-mix(in srgb, #d97706 45%, transparent)" }
          : tone === "bad"
            ? { borderColor: "color-mix(in srgb, #dc2626 50%, transparent)" }
            : {}),
      }}
    >
      <span style={{ opacity: 0.8, flexShrink: 0 }}>{tone === "bad" ? "✕" : tone === "good" ? "✓" : "ℹ"}</span>
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
          <span style={{ fontWeight: 700, flex: 1, fontSize: 14 }}>{title}</span>
          <Btn onClick={onClose} title="close" style={{ padding: "2px 8px", fontSize: 13 }}>
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
        lineHeight: 1.5,
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
