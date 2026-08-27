// dsh-plugin-model-capability — Web client half.
//
// Registers the "Model Capability" settings section and wires the page to the
// `llm-pi-ai` settings namespace (read via the settings mirror, write via
// `api.settings.mutate` path ops with revision fencing).

import { en, zh } from "./dict.js";
import { CapabilityStore } from "./store.js";
import { Section } from "./components/Section.jsx";

const NS = "settings.model-capability";

const inject = [
  "slots",
  "locale",
  "connection",
  "remote",
  "settingsScope",
  "settingsSchema",
];

function apply(ctx) {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "model-capability: copy dictionaries",
  );
  const t = ctx.locale.bind(NS);
  const connection = ctx.get("connection");
  const locale = ctx.get("locale");
  const settingsScope = ctx.get("settingsScope");

  const llmScope = settingsScope.bind({ namespace: "llm-pi-ai" });
  const selfScope = settingsScope.bind({ namespace: "model-capability" });
  const store = new CapabilityStore({
    api: connection.api,
    llmScope,
    selfScope,
    locale,
  });

  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "model-capability",
        order: 11,
        label: () => t("nav"),
        inject: () => ({ store }),
      },
      Section,
    ),
  );
}

export { inject, apply };