// dsh-plugin-model-capability — Web client half.
//
// Registers the "Model Capability" settings section and wires the page to the
// `llm-pi-ai` settings namespace (read and written through DSH's shared
// ConfigForms mirror with revision fencing).

import { en, zh } from "./dict.js";
import { CapabilityStore } from "./store.js";
import { Section } from "./components/Section.jsx";

const NS = "settings.model-capability";

const inject = [
  "slots",
  "locale",
  "configForms",
];

function apply(ctx) {
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    "model-capability: copy dictionaries",
  );
  const t = ctx.locale.bind(NS);
  const locale = ctx.locale;
  const configForms = ctx.configForms;

  const llmScope = configForms.get("llm-pi-ai");
  const selfScope = configForms.get("model-capability");
  const store = new CapabilityStore({
    llmScope,
    selfScope,
    locale,
  });

  // A companion page that edits another plugin's namespace must disappear if
  // that namespace is not served by the active composition.
  ctx.effect(
    () => configForms.whileServed(["llm-pi-ai"], () =>
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
      )),
    "model-capability: settings page",
  );
}

export { inject, apply };
