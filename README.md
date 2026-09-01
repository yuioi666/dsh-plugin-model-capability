# dsh-plugin-model-capability

[![npm version](https://img.shields.io/npm/v/dsh-plugin-model-capability.svg)](https://www.npmjs.com/package/dsh-plugin-model-capability)
[![npm downloads](https://img.shields.io/npm/dm/dsh-plugin-model-capability.svg)](https://www.npmjs.com/package/dsh-plugin-model-capability)
[![License](https://img.shields.io/npm/l/dsh-plugin-model-capability.svg)](https://github.com/yuioi666/dsh-plugin-model-capability/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/yuioi666/dsh-plugin-model-capability?style=social)](https://github.com/yuioi666/dsh-plugin-model-capability)
[![dsh](https://img.shields.io/badge/DSH-plugin-blue.svg)](https://github.com/yuioi666/dsh-plugin-model-capability)

**Model Capability Manager** — manage the `llm-pi-ai` provider routes of DeepSeek Harness (DSH Web) from a dedicated **Model Capability** page in the in-app settings: per-model thinking levels, context window, output cap, input modalities, per-route defaults, gateway compatibility fields, one-click presets, and an EN/中文 switchable UI.

[简体中文说明](./docs/README-zh.md) · [Report Bug](https://github.com/yuioi666/dsh-plugin-model-capability/issues) · [Request Feature](https://github.com/yuioi666/dsh-plugin-model-capability/issues/new?template=feature_request.md)

---

## Table of Contents

- [Why this plugin exists](#why-this-plugin-exists)
- [Screenshots](#screenshots)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Uninstall](#uninstall)
- [FAQ / Troubleshooting](#faq--troubleshooting)
- [How it works](#how-it-works)
- [Development](#development)
- [Publishing](#publishing)
- [Contributing](#contributing)
- [License](#license)

---

## Why this plugin exists

DSH stores provider configuration in `llm-pi-ai.providers` inside `settings.yaml`. Editing it by hand is error-prone, and two classes of problems bite people often:

1. **Gateway incompatibility** — not every vendor accepts the same protocol dialect. For example Alibaba Cloud (DashScope) in `compatible-mode`, Moonshot/Kimi, Zhipu/BigModel, MiniMax, Volcengine Ark, SiliconFlow, Baidu Qianfan and other gateways may reject `developer` role messages or `reasoning_effort` echoes the way the OpenAI/Anthropic dialects expect. Turning `compat.supportsDeveloperRole` on against such a gateway produces 400-style errors.
2. **Thinking-level wiring** — the 7 levels (`off / minimal / low / medium / high / xhigh / max`) each need a wire value the upstream provider understands (e.g. `low` → `"low"` for one vendor, `"h3"` for another). Max-thinking configs and per-model `reasoningEfforts` are tedious to author by hand.

This plugin gives you a GUI for all of it, plus **one-click presets** that bake in dialect-safe configurations (see [Presets](#presets)).

## Screenshots

| Settings entry | Section overview (EN) |
| --- | --- |
| ![Settings entry](img/02-settings-nav.png) | ![Section overview EN](img/03-top-en.png) |

| Model editor (EN) | Gateway compatibility fold (ZH) | Section overview (ZH) |
| --- | --- | --- |
| ![Model editor EN](img/04-model-en.png) | ![Compat editor ZH](img/05-compat-zh.png) | ![Section overview ZH](img/06-top-zh.png) |

## Features

- **Per-model editor** for every route:
  - `name`, `contextWindow`, `maxTokens` — capacity fields accept plain numbers or `K`/`M` suffixes (`262144`, `256K`, `1M`).
  - `input` modalities — `text` / `image` checkboxes with de-duplication.
  - Thinking toggle — switch the whole model between reasoning off and the full 7-level matrix (`off/minimal/low/medium/high/xhigh/max`), each level with its own wire value. Empty non-`off` levels are prevented (the Host rejects them), and a one-click **fill all levels with the same value** button is included.
  - **Apply field to all models** of the route (name / contextWindow / maxTokens / input / reasoningEfforts).
  - Per-model `compat` editor (folded away by default).
- **Per-route editor**:
  - `displayName`, `baseURL`, `api` (openai-completions / openai-responses / anthropic-messages).
  - Defaults: `defaultContextWindow`, `defaultMaxTokens`, `defaultInput`, `reasoning`, `thinkingBudgets` (minimal/low/medium/high), `cacheRetention`, `transport`.
  - Route-level `compat` editor and an **Advanced** fold: timeouts, max image bytes / pixel budget, `headers`, plus a read-only raw JSON view.
- **One-click presets** — 7 built-in recipes plus your own saved presets:
  | Preset | What it does |
  | --- | --- |
  | Safe gateway | `compat.supportsDeveloperRole=false`, `supportsReasoningEffort=true` — for gateways that reject `developer` role messages (DashScope compatible-mode, Kimi/Moonshot, Zhipu, MiniMax, Ark, SiliconFlow, Qianfan, …) |
  | OpenAI native | `developer` role + `reasoning_effort` + `thinkingFormat=openai` + `maxTokensField=max_completion_tokens` |
  | DeepSeek dialect | `thinkingFormat=deepseek`, `developer` role on, `reasoning_effort` on |
  | Qwen dialect | `thinkingFormat=qwen`, `developer` role off, `reasoning_effort` on |
  | Max thinking (7 levels) | every model declares all 7 levels, `reasoning=high`, generous `thinkingBudgets` |
  | Text only | `defaultInput=['text']` and per-model `input=['text']` |
  | Image ready | `defaultInput=['text','image']` and per-model `input=['text','image']` |
  - Apply any preset to a **selected subset of routes**. Save your current configuration as a custom preset; apply and delete them anytime. Custom presets are stored under `model-capability.customPresets` in `settings.yaml`.
  - **Applying a custom preset replaces the whole `llm-pi-ai` user section** via `settings.replace`, not a merge. Any route that was added to the user section *after* the preset was saved will be **deleted**. This is not an additive recipe — treat the preset as a full snapshot.
  - **Header credential protection** — credential-shaped header names (`authorization`, `api-key`, etc.) are **blocked** in the headers editor, and the `headers` dict is **stripped** from every provider route when saving a custom preset (credentials travel as `apiKeyEnv` reference names, never as literal header values). Existing presets that were saved before this safeguard are detected at startup and reported in the advisory checks.
- **Advisory checks** — the page shows diagnostics about your current setup: legacy-gateway lookalike URLs with `supportsDeveloperRole` on (hint: use Safe gateway), reasoning levels that map to no wire value, models without an explicit `contextWindow`, and routes without models.
- **Language switch** — the page follows the DSH UI language, and a select in the page header lets you pin **English / 中文 / follow DSH**. The choice persists into `settings.yaml` (`model-capability.language`), not just to the browser session.

All writes go through the DSH settings service with revision fencing (`expectedRevision`), the same pattern the built-in Models page uses; conflicting concurrent edits are retried via the live mirror. If the page is opened from a non-loopback origin (where writes are not allowed), every control is disabled with a hint.

## Installation

Requires a DSH installation with the web app (any profile that serves the browser UI), DSH ≥ 0.1.1-rc.2.

### Install the latest version

```bash
dsh plugin --profile web add dsh-plugin-model-capability   # latest stable, or pin @<version>
```

Then **restart `dsh --profile web`** (the running Web UI is not hot-reloaded on plugin install). The **Model Capability** entry appears under **Settings**.

For other profiles, replace `web` with your profile name.

> **Pin the exact version** when you need a specific release — see [Getting the latest version](#getting-the-latest-version) below. Installing without a version may resolve to an older release cached locally or on the registry CDN.

### Getting the latest version (cache / publish-delay caveats)

A new release is only picked up when **all three caches** agree — the npm registry
CDN metadata, your local pnpm store, and the profile's lockfile. Any one of them
stale means `dsh plugin add dsh-plugin-model-capability` (no version) keeps
installing the old build. To guarantee you get the newest version:

1. **Check what the registry currently has:**
   ```bash
   npm view dsh-plugin-model-capability version
   ```
   If this does not show the version you expect, the registry CDN still serves
   stale metadata — wait ~1–2 minutes and retry (npm publishes are usually
   visible in seconds, but the `packument` metadata is cached per-TTL).

2. **Uninstall any previously installed copy first** (see [Uninstall](#uninstall)
   below). The profile lockfile (`node_modules/.pnpm/lock.yaml` /
   `pnpm-lock.yaml`) otherwise keeps the old version pinned.

3. **Install with the exact version** — this bypasses metadata resolution:
   ```bash
   dsh plugin --profile web add dsh-plugin-model-capability@<version>
   # e.g. dsh plugin --profile web add dsh-plugin-model-capability@1.1.1
   ```

4. **Clear stale local caches if the profile still reports an old version:**
   ```bash
   pnpm store prune                 # remove unreferenced store packages
   ```
   or, for the profile itself:
   ```bash
   cd "$HOME/.dsh/profiles/web"
   pnpm store prune
   ```

5. **Verify what actually got installed:**
   ```bash
   grep -A2 '"dependencies"' "$HOME/.dsh/profiles/web/package.json"
   ```
   (Windows PowerShell: `Select-String -Path "$HOME\.dsh\profiles\web\package.json" -Pattern "model-capability"`)
   The version shown next to `dsh-plugin-model-capability` must match the version you intended to install.

6. **Restart the web UI** — the plugin is loaded at startup, never hot-reloaded:
   ```bash
   dsh --profile web
   ```

Registry note: an already-published version can **never be overwritten**. If a bad
build got released under `0.1.2`, the fix is a new version (`0.1.3`, `1.1.1`, …),
not a re-publish — which is exactly why "install the latest" means **pin the
version**, not `npm update`.

### Uninstall

```bash
dsh plugin --profile web remove dsh-plugin-model-capability
```

If the command reports `no such dependency found` (a broken install whose
dependency entry is missing from `package.json`), remove it directly inside the
profile:

```bash
cd "$HOME/.dsh/profiles/web"
pnpm remove dsh-plugin-model-capability
```

After either step, **restart `dsh --profile web`**.

To verify the plugin is fully gone:

- `"$HOME/.dsh/profiles/web/package.json"` — no `dsh-plugin-model-capability`
  entry under `dependencies`
- `"$HOME/.dsh/profiles/web/node_modules/dsh-plugin-model-capability"` — directory
  no longer exists
- `"$HOME/.dsh/profiles/web/pnpm-lock.yaml"` — no `dsh-plugin-model-capability`
  reference (0 hits)

> The host half also loads headlessly (it registers the settings schema); the settings UI itself needs the web app.

## Quick Start

After installing the plugin and restarting DSH, the **Model Capability** page is available under **Settings** in the sidebar. Here is how to get started in three steps:

### 1. Open the page

Navigate to **Settings → Model Capability**. You will see a list of all configured provider routes (e.g. `openai`, `anthropic`, `dashscope`, etc.), each with its models listed underneath.

### 2. Apply a preset (recommended first step)

The fastest way to get a working configuration is to use a **one-click preset**:

1. Click the **Presets** button in the page header.
2. Select a preset that matches your gateway type (e.g. **Safe gateway** for DashScope/Moonshot/Zhipu, **OpenAI native** for official OpenAI, **DeepSeek dialect** for DeepSeek API).
3. Choose the routes you want to apply it to (or leave all selected).
4. Click **Apply**.

The preset fills in the recommended `compat` fields, thinking levels, and defaults automatically.

### 3. Fine-tune individual models

Click any model row to expand its editor. From there you can:

- Set the **context window** and **max tokens** (supports `K`/`M` suffixes, e.g. `128K`, `1M`).
- Toggle **thinking** on/off and configure each of the 7 reasoning levels.
- Change **input modalities** (`text` / `image`).
- Open the **compat** fold to adjust gateway-specific fields per model.

All changes are saved immediately through the DSH settings service with revision fencing — no manual YAML editing required.

> **Tip:** If the page shows "Advisory checks" at the top, review them — they flag common misconfigurations like legacy gateways with `supportsDeveloperRole` enabled.

## How it works

One npm package with two halves, installed as a **profile bundle** by `dsh plugin add`:

- `lib/index.js` — the **host half**: registers the `model-capability` settings namespace (language + custom presets) with schemastery so the Host round-trips it like any native setting.
- `lib/client.js` — the **web client half**: a classic-script bundle registered with the web shell's module loader (`window.__ModuleLoader__.load({ id, factory })`), exactly like every shipped `@deepseek-ai` client bundle. It injects a section into the `settings.section` slot, binds both the `llm-pi-ai` and `model-capability` settings scopes, and drives all edits through `api.settings.mutate` with path ops and revision fencing.
- `cordis.patch.yml` — declares the bundle row, so `dsh plugin add` wires the whole thing automatically (no manual patch editing).

The `llm-pi-ai` schema itself is owned by DSH — this plugin only edits its *values*, so the Host keeps validating every write (`assertServiceable` etc.).

## Development

```bash
pnpm install
npm run build        # esbuild → lib/client.js (loader-wrapped) + lib/index.js
```

Local testing: create a dev profile (e.g. `web-dev`), add the web app and the plugin, and restart the server on a separate port:

```bash
dsh plugin --profile web-dev add @deepseek-ai/dsh-web-app@0.1.1-rc.2
# add the local package, then note: `file:` dependencies are snapshotted —
# re-add after every rebuild, or replace the installed copy with a junction:
dsh plugin --profile web-dev add file:D:/path/to/dsh-plugin-model-capability
dsh --profile web-dev --port 3091 --no-open
```

Screenshots are captured with the included script (needs `playwright-core` and a local Chrome/Edge):

```bash
node scripts/screenshots.mjs [baseURL] [outDir]
node scripts/verify-dom.mjs  [baseURL]   # shadow-DOM-aware rendering checks
node scripts/e2e-write.mjs   [baseURL]   # end-to-end write smoke test (back up settings.yaml first!)
```

## FAQ / Troubleshooting

### Why are my changes not saved?

The DSH settings service only accepts writes from **loopback origins** (i.e. `http://127.0.0.1:3080` or `http://localhost:3080`). If you are accessing the web UI from a different IP address or through a reverse proxy, every control on the page is disabled automatically and a hint is shown. Connect via localhost to make changes.

### What does the "Safe gateway" preset do?

It sets `compat.supportsDeveloperRole=false` and `supportsReasoningEffort=true`. This is the safest choice for Chinese cloud gateways — DashScope (compatible-mode), Moonshot/Kimi, Zhipu/BigModel, MiniMax, Volcengine Ark, SiliconFlow, Baidu Qianfan, and others that do not accept the `developer` role message that OpenAI/Anthropic dialects send.

### Why do I see a credential warning?

The plugin detects credential-shaped header names (e.g. `authorization`, `api-key`) in the `headers` field of a provider route. This is a **safety advisory**, not a block — but credentials should be stored as `apiKeyEnv` environment variable references instead of literal header values, especially when saving custom presets (the preset system strips `headers` automatically).

### Can I add a new provider route?

The plugin edits existing routes in the `llm-pi-ai` providers section. To add a brand-new provider, you still need to edit `settings.yaml` manually or use the DSH CLI. Once added, this plugin will pick it up on the next page load.

### How do I reset a single model to defaults?

Click the model row to expand its editor and clear the fields you want to reset. The route-level defaults (set in the route editor) are used as fallbacks when a per-model value is empty.

### Why is the "Language" setting not persisting?

The language choice (`model-capability.language`) is stored in `settings.yaml` and survives restarts. If it keeps resetting, check that the settings file is writable and that no other process is overwriting it.

### Why does `thinkingBudgets` only have minimal/low/medium/high when there are 6 thinking levels?

This is not a bug — it is a deliberate schema design. DSH's thinking capability has two separate layers:

**1. Thinking Levels (6 levels)** — defined by `pi-ai` core:
`minimal | low | medium | high | xhigh | max`
All 6 levels can be configured with wire values in each model's `reasoningEfforts`.

**2. Thinking Budgets (4 levels)** — defined by `dsh-llm-pi-ai` schema:
`minimal | low | medium | high`
There is no `xhigh` or `max` budget field.

The `thinkingBudgets` controls custom token budgets for token-based providers (e.g. Anthropic/Bedrock). At runtime, when `xhigh` or `max` levels are used, the system falls back to default budgets:

```js
const budget = options.thinkingBudgets?.[level] ?? defaultBudgets[options.reasoning];
```

So if you set `thinkingBudgets.minimal/low/medium/high`, those levels use your custom values, while `xhigh` and `max` use the provider's default token allocation strategy — no custom budget is needed for those levels.

## Publishing

Full step-by-step instructions (including a post-release checklist) are in
[`PUBLISHING.md`](./PUBLISHING.md). Summary:

- `npm publish` — run after `npm run build` (the `prepublishOnly` hook rebuilds automatically). The package ships `lib/`, `cordis.patch.yml`, `img/`, license, the English README and the Chinese guide in `docs/`.
- GitHub — repository + releases; tag versions to match `package.json`.

## Contributing

Contributions are welcome! Here is how you can help:

- **Report bugs** — open an [issue](https://github.com/yuioi666/dsh-plugin-model-capability/issues) with a clear description and reproduction steps.
- **Suggest features** — use the [feature request template](https://github.com/yuioi666/dsh-plugin-model-capability/issues/new?template=feature_request.md).
- **Submit pull requests** — fork the repository, make your changes, and open a PR. Please follow the existing code style and include tests where applicable.

The plugin is built with esbuild; run `npm run build` after making changes to the `src/` files. See the [Development](#development) section for local testing instructions.

## License

[MIT](./LICENSE)