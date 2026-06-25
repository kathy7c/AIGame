// Thin OpenAI-compatible chat-completions client.
// Works with OpenAI, OpenRouter, Together, Groq, Ollama, etc.
// No SDK, no dependencies — just fetch.

const STORAGE_KEY = "mindheist.config.v1";

const DEFAULTS = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: "",
  model: "google/gemini-2.0-flash-exp:free",
};

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(cfg) {
  const clean = {
    baseUrl: (cfg.baseUrl || DEFAULTS.baseUrl).trim().replace(/\/+$/, ""),
    apiKey: (cfg.apiKey || "").trim(),
    model: (cfg.model || DEFAULTS.model).trim(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

export function hasKey(cfg = loadConfig()) {
  return Boolean(cfg.apiKey && cfg.apiKey.length > 8);
}

// Returns the assistant message string.
// `messages` is an OpenAI-format array: [{role, content}, ...]
export async function chat(messages, { signal } = {}) {
  const cfg = loadConfig();
  if (!hasKey(cfg)) {
    throw new Error("Missing API key. Open Settings and paste one to begin.");
  }

  const url = `${cfg.baseUrl}/chat/completions`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.apiKey}`,
  };
  // OpenRouter recommends these for attribution; harmless elsewhere.
  if (cfg.baseUrl.includes("openrouter.ai")) {
    headers["HTTP-Referer"] = location.origin || "https://kathy7c.github.io/AIGame/";
    headers["X-Title"] = "Mind Heist";
  }

  const body = {
    model: cfg.model,
    messages,
    temperature: 0.8,
    max_tokens: 350,
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LLM error ${res.status}. ${text.slice(0, 200) || "Check your key, model name, and endpoint in Settings."}`
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("LLM returned an empty reply. Try a different model.");
  }
  return content.trim();
}
