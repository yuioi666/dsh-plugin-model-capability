// Shared constants for the Model Capability page.
// Mirrors the field vocabulary of the `llm-pi-ai` settings namespace
// (see @deepseek-ai/dsh-llm-pi-ai), so the UI can render and edit exactly
// the fields the Host schema validates.

/** All thinking levels DSH / pi-ai support, in escalation order. */
export const THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

/** All request modalities a provider profile may declare. */
export const MODALITIES = ["text", "image"];

/** Our own page language preference values. */
export const LANGUAGES = ["follow", "en", "zh"];

/** thinkingFormat dialects the pi-ai adapter ships, most-reached first. */
export const THINKING_FORMATS = [
  "openai",
  "deepseek",
  "openrouter",
  "together",
  "zai",
  "qwen",
  "chat-template",
  "qwen-chat-template",
  "string-thinking",
  "ant-ling",
];

/** maxTokens wire-field spellings. */
export const MAX_TOKENS_FIELDS = ["max_completion_tokens", "max_tokens"];

/** cache-control marker conventions. */
export const CACHE_CONTROL_FORMATS = ["anthropic"];

/** transport choices of the provider profile. */
export const TRANSPORTS = ["sse", "websocket", "websocket-cached", "auto"];

/** cacheRetention choices. */
export const CACHE_RETENTIONS = ["none", "short", "long"];

/** Known proxy protocol identifiers the adapter can serve. */
export const APIS = ["openai-completions", "openai-responses", "anthropic-messages"];

/** Boolean compat fields, in display order. */
export const COMPAT_BOOLEAN_FIELDS = [
  "supportsDeveloperRole",
  "supportsReasoningEffort",
  "supportsStore",
  "supportsUsageInStreaming",
  "supportsTemperature",
  "supportsStrictMode",
  "supportsStrictTools",
  "supportsLongCacheRetention",
  "supportsEagerToolInputStreaming",
  "supportsCacheControlOnTools",
  "requiresToolResultName",
  "requiresAssistantAfterToolResult",
  "requiresThinkingAsText",
  "requiresReasoningContentOnAssistantMessages",
  "forceAdaptiveThinking",
  "allowEmptySignature",
];

/** Select-style compat fields. */
export const COMPAT_SELECT_FIELDS = [
  { key: "thinkingFormat", options: THINKING_FORMATS },
  { key: "maxTokensField", options: MAX_TOKENS_FIELDS },
  { key: "cacheControlFormat", options: CACHE_CONTROL_FORMATS },
];

/** Provider-level default/behavior fields grouped for the UI. */
export const PROVIDER_SELECT_FIELDS = [
  { key: "reasoning", options: THINKING_LEVELS },
  { key: "transport", options: TRANSPORTS },
  { key: "cacheRetention", options: CACHE_RETENTIONS },
];

/** Provider-level numeric fields edited as plain counts (not K/M). */
export const PROVIDER_NUMBER_FIELDS = [
  "timeoutMs",
  "websocketConnectTimeoutMs",
  "streamIdleTimeoutMs",
  "maxRequestImageBytes",
  "requestImagePixelBudget",
  "requestImageMaxBytes",
];

/** Headers/gateway host names that typically reject the `developer` role. */
const NO_DEVELOPER_ROLE_HINTS = [
  "aliyun",
  "dashscope",
  "moonshot",
  "kimi",
  "zhipu",
  "bigmodel",
  "minimax",
  "volces",
  "ark",
  "siliconflow",
  "baidu",
  "qianfan",
  "maas",
];

/** Guess whether a gateway baseURL is likely an older-compat gateway that
 * rejects the `developer` message role. Pure string heuristics — advisory
 * only; the real authority is the Host schema validation. */
export function looksLikeLegacyGateway(baseURL = "") {
  const host = String(baseURL).toLowerCase();
  return NO_DEVELOPER_ROLE_HINTS.some((hint) => host.includes(hint));
}

/**
 * Format a token count for an input box ("256K", "1M", or the plain number).
 * The stored value is always the plain count (1K = 1000, like the official
 * Models page).
 */
export function formatCapacity(value) {
  if (!Number.isInteger(value) || value <= 0) return "";
  if (value % 1e6 === 0) return `${String(value / 1e6)}M`;
  if (value % 1e3 === 0) return `${String(value / 1e3)}K`;
  return String(value);
}

/** Parse a K/M-suffixed capacity text into a plain count; NaN when unreadable. */
export function parseCapacity(text) {
  const trimmed = String(text).trim();
  if (trimmed === "") return void 0;
  const match = /^(\d+(?:\.\d+)?)\s*([km])?$/i.exec(trimmed);
  if (!match) return NaN;
  const value = Number(match[1]);
  const suffix = (match[2] || "").toLowerCase();
  if (suffix === "k") return Math.round(value * 1e3);
  if (suffix === "m") return Math.round(value * 1e6);
  return value;
}

/** Deep clone of JSON-safe settings data (resolved values are frozen). */
export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/** Namespace path helpers for the settings schema (client mirror). */
export function getPath(root, path) {
  let node = root;
  for (const key of path) {
    if (node === void 0 || node === null || typeof node !== "object") return void 0;
    node = node[key];
  }
  return node;
}