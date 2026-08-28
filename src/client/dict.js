// UI copy for the Model Capability page — en (source of truth) + zh.
// Keys are referenced by the components; keep the two dictionaries in sync.

/** Default placeholder substitution — never show raw keys. */
export function localize(dicts, lang, key, params) {
  let text = dicts[lang]?.[key];
  if (text === void 0) text = dicts.en[key];
  if (text === void 0) text = key;
  if (params !== void 0) {
    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

export const en = {
  nav: "Model Capability",
  pageIntro:
    "Manage the llm-pi-ai provider routes: per-model thinking levels, context / output capacity, input modalities, gateway compatibility, and route defaults. Edits are written to settings.yaml and validated by the Host.",
  writableHost: "Edits are persisted to settings.yaml.",
  notWritable: "Settings are read-only in this browser (remote access).",
  memoryMode: "This browser cannot persist settings (loopback required).",

  langField: "Page language",
  langFollow: "Follow DSH",
  langEn: "English",
  langZh: "中文",

  route: "Route",
  routeId: "Route ID",
  model: "Model",
  modelId: "Model ID",
  expand: "Expand",
  collapse: "Collapse",
  advanced: "Advanced",
  advancedFold: "Advanced fields",
  rawView: "Raw section (read-only)",

  modelName: "Display name",
  contextWindow: "Context window",
  maxTokens: "Max output",
  inputModalities: "Input modalities",
  modalityText: "text",
  modalityImage: "image",
  capacityHint: "e.g. 262144, 256K, 1M",
  remove: "Remove",

  thinkingEnabled: "This model supports thinking (reasoning efforts)",
  thinkingHint:
    "Key = selectable level, value = the wire spelling sent for that level. Only 'off' may stay empty (send nothing).",
  levelOff: "off",
  levelMinimal: "minimal",
  levelLow: "low",
  levelMedium: "medium",
  levelHigh: "high",
  levelXhigh: "xhigh",
  levelMax: "max",
  offPlaceholder: "nothing is sent",
  wirePlaceholder: "wire value",
  fillLevels: "Fill all levels with their own name",
  reasoningFalseHint:
    "Setting thinking off stores reasoningEfforts: false — DSH will not offer thinking levels for this model.",
  reasoningNeedsOneLevel:
    "At least one thinking level besides 'off' needs a wire value.",

  compatTitle: "Gateway compatibility",
  compatIntro:
    "compat fields describe what the gateway understands. Mismatches are the most common cause of 400 errors (e.g. the message role 'developer').",
  applyToAllModels: "Apply this model's settings to all models in this route",
  applied: "Applied",
  modelCompat: "Per-model compat",

  defaultsTitle: "Route defaults",
  defaultsIntro: "Fallbacks used for models/turns that do not declare a value.",
  defaultContextWindow: "Default context window",
  defaultMaxTokens: "Default max output",
  defaultInput: "Default input modalities",
  reasoningDefault: "Default thinking level",
  thinkingBudgets: "Thinking budgets (chars)",
  thinkingBudgetsHint: "DSH defines budgets for minimal/low/medium/high; the xhigh and max levels are folded into high by the host.",
  cacheRetention: "Prompt-cache retention",
  transport: "Stream transport",
  headers: "Extra headers",
  headerKey: "Header",
  headerValue: "Value",
  addHeader: "Add header",

  apiKeyEnv: "API key environment variable",
  baseURL: "Base URL",
  api: "API protocol",
  displayName: "Display name",

  timeoutMs: "Request timeout (ms)",
  websocketConnectTimeoutMs: "WebSocket connect timeout (ms)",
  streamIdleTimeoutMs: "Stream idle timeout (ms)",
  maxRequestImageBytes: "Max request image bytes",
  requestImagePixelBudget: "Image pixel budget",
  requestImageMaxBytes: "Max inline image bytes",

  transportSse: "sse",
  transportWebsocket: "websocket",
  transportWebsocketCached: "websocket-cached",
  transportAuto: "auto",
  cacheNone: "none",
  cacheShort: "short",
  cacheLong: "long",

  // Compat field labels
  supportsDeveloperRole: "Accepts the 'developer' message role",
  supportsDeveloperRoleHint:
    "Off for older gateways (DashScope / Kimi / Zhipu / MiniMax / SiliconFlow …) that only understand 'system'.",
  supportsReasoningEffort: "Accepts a reasoning_effort parameter",
  supportsStore: "Accepts a 'store' flag",
  supportsUsageInStreaming: "Reports usage in streaming chunks",
  supportsTemperature: "Accepts temperature",
  supportsStrictMode: "Supports strict JSON mode",
  supportsStrictTools: "Supports strict tool schemas",
  supportsLongCacheRetention: "Supports long cache retention",
  supportsEagerToolInputStreaming: "Streams tool input eagerly",
  supportsCacheControlOnTools: "Supports cache_control on tools",
  requiresToolResultName: "Requires a name on tool results",
  requiresAssistantAfterToolResult: "Requires assistant msgs after tool results",
  requiresThinkingAsText: "Thinks via plain text",
  requiresReasoningContentOnAssistantMessages: "Needs reasoning_content on assistant messages",
  forceAdaptiveThinking: "Force adaptive thinking",
  allowEmptySignature: "Allows empty signatures",
  thinkingFormat: "Thinking wire format (dialect)",
  maxTokensField: "Max-output wire field",
  cacheControlFormat: "Cache-control format",

  // Presets
  presetTitle: "One-click presets",
  presetIntro:
    "Apply a curated configuration to selected routes in one click (writes are validated by the Host).",
  builtinsTitle: "Built-in recipes",
  builtinSafeGateway: "Safe gateway mode",
  builtinSafeGatewayDesc:
    "compat: supportsDeveloperRole=false — for gateways that reject the 'developer' role (DashScope, Kimi, Zhipu, MiniMax …).",
  builtinOpenaiNative: "OpenAI-native",
  builtinOpenaiNativeDesc:
    "compat: developer role on, thinkingFormat=openai, maxTokensField=max_completion_tokens.",
  builtinDeepseekDialect: "DeepSeek dialect",
  builtinDeepseekDialectDesc: "compat: thinkingFormat=deepseek, developer role on.",
  builtinQwenDialect: "Qwen dialect",
  builtinQwenDialectDesc: "compat: thinkingFormat=qwen, developer role off.",
  builtinMaxThinking: "Max thinking (7 levels)",
  builtinMaxThinkingDesc:
    "Declare all seven thinking levels (off→max) on every model and set high default thinking.",
  builtinTextOnly: "Text-only",
  builtinTextOnlyDesc: "Input modalities = text everywhere.",
  builtinImageReady: "Text + image",
  builtinImageReadyDesc: "Input modalities = text + image everywhere.",
  presetRoutes: "Apply to routes",
  selectAll: "Select all",
  deselectAll: "Deselect all",
  applyPreset: "Apply",
  cancel: "Cancel",
  presetApplied: "Preset applied.",
  presetFailed: "Preset was rejected by the settings service:",
  savePreset: "Save current settings as a preset",
  savePresetName: "Preset name",
  savePresetBlurb:
    "Stores a snapshot of the current llm-pi-ai user section into the model-capability settings namespace.",
  savePresetBtn: "Save preset",
  noUserRoutesHint: "Nothing to save — no routes have been edited yet.",
  presetSaved: "Preset saved.",
  customPresetsTitle: "My presets",
  presetEmpty: "No custom presets yet.",
  applyCustom: "Apply (replaces the current llm-pi-ai user section)",
  deleteCustom: "Delete",
  confirmApplyCustom: "Apply this preset? It replaces the current user section of the llm-pi-ai settings.",
  confirmDeleteCustom: "Delete this preset?",
  presetCorrupt: "This preset contains invalid data and could not be applied.",
  presetNotFound: "Preset not found.",

  // Diagnostics
  diagTitle: "Advisory checks",
  diagNone: "No advisories for the current configuration.",
  diagDeveloperRole:
    "{route}: baseURL looks like a legacy gateway but compat.supportsDeveloperRole is on — safe-gateway preset or manual off avoids 400 errors.",
  diagEmptyEffort:
    "{route} / {model}: reasoningEfforts.{level} is empty (only 'off' may send nothing) — the Host will reject the write.",
  diagLooseEfforts:
    "{route} / {model}: declares reasoningEfforts but thinking is disabled for the model entry (reasoningEfforts: false keeps it disabled).",
  diagNoContext: "{route} / {model}: no contextWindow — DSH falls back to the route default.",
  diagNoModels: "{route}: declares no models — the route serves its built-in catalog.",

  // Status / errors
  conflict:
    "Another change landed first (settings conflict). The page reloaded your view — please re-apply any draft.",
  writeFailed: "Write was rejected:",
  routeNotFound: "Route not found in the resolved settings.",
  modelNotFound: "Model not found in this route.",
  unknownError: "Unexpected failure.",

  // Generic
  show: "Show",
  hide: "Hide",
  on: "on",
  off: "off",
};

export const zh = {
  nav: "模型能力",
  pageIntro:
    "管理 llm-pi-ai 提供商路由:每个模型的思考等级、上下文/输出容量、输入模态、网关兼容性和路由默认值。修改会写入 settings.yaml 并经 Host 校验。",
  writableHost: "修改会持久化到 settings.yaml。",
  notWritable: "此浏览器中设置为只读(远程访问)。",
  memoryMode: "此浏览器无法持久化设置(需要本机回环访问)。",

  langField: "页面语言",
  langFollow: "跟随 DSH",
  langEn: "English",
  langZh: "中文",

  route: "路由",
  routeId: "路由 ID",
  model: "模型",
  modelId: "模型 ID",
  expand: "展开",
  collapse: "收起",
  advanced: "高级",
  advancedFold: "高级字段",
  rawView: "原始配置段(只读)",

  modelName: "显示名称",
  contextWindow: "上下文窗口",
  maxTokens: "最大输出",
  inputModalities: "输入模态",
  modalityText: "文本",
  modalityImage: "图像",
  capacityHint: "例:262144、256K、1M",
  remove: "删除",

  thinkingEnabled: "该模型支持思考(推理等级)",
  thinkingHint:
    "键 = 可选等级,值 = 该等级发送到网关的线上参数。只有 off 可以留空(表示不发送)。",
  levelOff: "off",
  levelMinimal: "minimal",
  levelLow: "low",
  levelMedium: "medium",
  levelHigh: "high",
  levelXhigh: "xhigh",
  levelMax: "max",
  offPlaceholder: "不发送内容",
  wirePlaceholder: "线上值",
  fillLevels: "全部等级填为同名",
  reasoningFalseHint:
    "关闭思考会写入 reasoningEfforts: false——DSH 将不再为该模型提供思考等级选项。",
  reasoningNeedsOneLevel: "除 off 之外至少需要一个思考等级并填写线上值。",

  compatTitle: "网关兼容性",
  compatIntro:
    "compat 字段描述网关能理解什么。不匹配是 400 报错最常见的来源(例如消息角色 'developer')。",
  applyToAllModels: "把本模型设置应用到本路由全部模型",
  applied: "已应用",
  modelCompat: "模型级兼容",

  defaultsTitle: "路由默认值",
  defaultsIntro: "模型/请求未声明时的回退值。",
  defaultContextWindow: "默认上下文窗口",
  defaultMaxTokens: "默认最大输出",
  defaultInput: "默认输入模态",
  reasoningDefault: "默认思考等级",
  thinkingBudgets: "思考预算(字符)",
  thinkingBudgetsHint: "DSH 为 minimal/low/medium/high 定义预算;xhigh 和 max 档由宿主并入 high 处理。",
  cacheRetention: "提示词缓存保留",
  transport: "流式传输方式",
  headers: "额外请求头",
  headerKey: "请求头",
  headerValue: "值",
  addHeader: "添加请求头",

  apiKeyEnv: "API 密钥环境变量名",
  baseURL: "Base URL",
  api: "API 协议",
  displayName: "显示名称",

  timeoutMs: "请求超时(ms)",
  websocketConnectTimeoutMs: "WebSocket 连接超时(ms)",
  streamIdleTimeoutMs: "流空闲超时(ms)",
  maxRequestImageBytes: "最大请求图片字节数",
  requestImagePixelBudget: "图片像素预算",
  requestImageMaxBytes: "最大内联图片字节数",

  transportSse: "sse",
  transportWebsocket: "websocket",
  transportWebsocketCached: "websocket-cached",
  transportAuto: "auto",
  cacheNone: "none",
  cacheShort: "short",
  cacheLong: "long",

  supportsDeveloperRole: "接受 'developer' 消息角色",
  supportsDeveloperRoleHint:
    "旧式网关(DashScope / Kimi / 智谱 / MiniMax / 硅基流动……)只认 'system',需要关闭。",
  supportsReasoningEffort: "接受 reasoning_effort 参数",
  supportsStore: "接受 'store' 标记",
  supportsUsageInStreaming: "流式分块中上报用量",
  supportsTemperature: "接受 temperature",
  supportsStrictMode: "支持严格 JSON 模式",
  supportsStrictTools: "支持严格工具结构",
  supportsLongCacheRetention: "支持长缓存保留",
  supportsEagerToolInputStreaming: "工具输入即时流式",
  supportsCacheControlOnTools: "工具上支持 cache_control",
  requiresToolResultName: "工具结果需要 name",
  requiresAssistantAfterToolResult: "工具结果后需要 assistant 消息",
  requiresThinkingAsText: "以纯文本思考",
  requiresReasoningContentOnAssistantMessages: "assistant 消息需要 reasoning_content",
  forceAdaptiveThinking: "强制自适应思考",
  allowEmptySignature: "允许空签名",
  thinkingFormat: "思考线上格式(方言)",
  maxTokensField: "最大输出字段",
  cacheControlFormat: "缓存控制格式",

  presetTitle: "一键预设",
  presetIntro:
    "一键把精选配置应用到所选路由(写入由 Host 校验)。",
  builtinsTitle: "内置配方",
  builtinSafeGateway: "安全网关模式",
  builtinSafeGatewayDesc:
    "compat: supportsDeveloperRole=false——给不接受 'developer' 角色的网关(DashScope、Kimi、智谱、MiniMax……)使用。",
  builtinOpenaiNative: "OpenAI 原生",
  builtinOpenaiNativeDesc:
    "compat: 开启 developer 角色、thinkingFormat=openai、maxTokensField=max_completion_tokens。",
  builtinDeepseekDialect: "DeepSeek 方言",
  builtinDeepseekDialectDesc: "compat: thinkingFormat=deepseek,开启 developer 角色。",
  builtinQwenDialect: "Qwen 方言",
  builtinQwenDialectDesc: "compat: thinkingFormat=qwen,关闭 developer 角色。",
  builtinMaxThinking: "全力思考(7 档)",
  builtinMaxThinkingDesc:
    "为每个模型声明全部七个思考等级(off→max),默认思考设为 high。",
  builtinTextOnly: "仅文本",
  builtinTextOnlyDesc: "所有位置输入模态 = text。",
  builtinImageReady: "文本 + 图像",
  builtinImageReadyDesc: "所有位置输入模态 = text + image。",
  presetRoutes: "应用到路由",
  selectAll: "全选",
  deselectAll: "全不选",
  applyPreset: "应用",
  cancel: "取消",
  presetApplied: "预设已应用。",
  presetFailed: "预设被设置服务拒绝:",
  savePreset: "把当前设置保存为预设",
  savePresetName: "预设名称",
  savePresetBlurb:
    "把当前 llm-pi-ai 用户配置段快照存入 model-capability 设置命名空间。",
  savePresetBtn: "保存预设",
  noUserRoutesHint: "没有可保存的内容——还没有编辑过任何路由。",
  presetSaved: "预设已保存。",
  customPresetsTitle: "我的预设",
  presetEmpty: "还没有自定义预设。",
  applyCustom: "应用(替换当前 llm-pi-ai 用户配置段)",
  deleteCustom: "删除",
  confirmApplyCustom: "应用该预设?它将替换 llm-pi-ai 设置的当前用户配置段。",
  confirmDeleteCustom: "删除该预设?",
  presetCorrupt: "该预设包含无效数据,无法应用。",
  presetNotFound: "未找到该预设。",

  diagTitle: "建议检查",
  diagNone: "当前配置没有需要提示的地方。",
  diagDeveloperRole:
    "{route}:baseURL 看起来像旧式网关,但 compat.supportsDeveloperRole 处于开启——建议安全网关预设或手动关闭,避免 400 报错。",
  diagEmptyEffort:
    "{route} / {model}:reasoningEfforts.{level} 为空(只有 off 可以不发送)——Host 会拒绝该写入。",
  diagLooseEfforts:
    "{route} / {model}:声明了 reasoningEfforts,但该模型条目的思考是关闭的(reasoningEfforts: false 会保持禁用)。",
  diagNoContext: "{route} / {model}:未设置 contextWindow——DSH 将回退到路由默认值。",
  diagNoModels: "{route}:未声明任何模型——路由将使用其内置目录。",

  conflict:
    "另有修改先落盘(设置冲突)。页面已重新加载视图——如有未提交草稿请重新应用。",
  writeFailed: "写入被拒绝:",
  routeNotFound: "在解析后的设置中找不到该路由。",
  modelNotFound: "该路由中找不到该模型。",
  unknownError: "发生意外错误。",

  show: "显示",
  hide: "隐藏",
  on: "开",
  off: "关",
};