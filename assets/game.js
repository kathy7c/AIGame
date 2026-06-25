// Mind Heist — game state machine + UI glue.
// Pure DOM, no framework. Treat this file as the controller; rendering is
// imperative and intentionally simple.

import { LEVELS } from "./levels.js";
import { chat, loadConfig, saveConfig, hasKey } from "./llm.js";

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (v !== false && v != null) {
      node.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (c == null) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
};

const state = {
  levelIndex: 0,
  messages: [], // chat history for current level (excludes system prompt)
  attempts: 0,
  inFlight: false,
  scores: loadScores(), // { [levelId]: { attempts } }
};

const STORAGE_SCORES = "mindheist.scores.v1";
function loadScores() {
  try { return JSON.parse(localStorage.getItem(STORAGE_SCORES) || "{}"); }
  catch { return {}; }
}
function saveScores() {
  localStorage.setItem(STORAGE_SCORES, JSON.stringify(state.scores));
}

// --- Win detection ----------------------------------------------------------

function containsSecret(text, secret) {
  if (!text) return false;
  // Strip non-alphanumerics so the keeper can't slip in punctuation
  // (e.g. "O-P-E-N...") and we still catch it. Case-insensitive.
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalize(text).includes(normalize(secret));
}

// --- Screens ----------------------------------------------------------------

function renderTitle() {
  const root = $("#app");
  root.innerHTML = "";
  root.append(
    el("section", { class: "title" },
      el("div", { class: "title__crest" }, "👁️"),
      el("h1", { class: "title__name" }, "Mind Heist"),
      el("p", { class: "title__tag" },
        "Six AI keepers. Six secret words. Talk your way in."
      ),
      el("div", { class: "title__cta" },
        el("button", {
          class: "btn btn--primary",
          onclick: () => startLevel(0),
        }, "Begin the heist"),
        el("button", {
          class: "btn btn--ghost",
          onclick: openSettings,
        }, "Settings"),
      ),
      renderProgress(),
      el("p", { class: "title__byok" },
        "Bring your own API key (OpenAI-compatible). " +
        "Stored only in your browser. No backend, no logging."
      ),
    ),
  );
}

function renderProgress() {
  const completed = LEVELS.filter(l => state.scores[l.id]).length;
  return el("div", { class: "progress" },
    el("div", { class: "progress__bar" },
      el("div", {
        class: "progress__fill",
        style: `width:${(completed / LEVELS.length) * 100}%`,
      }),
    ),
    el("div", { class: "progress__label" },
      `${completed} / ${LEVELS.length} vaults cracked`
    ),
  );
}

function startLevel(idx) {
  if (!hasKey()) { openSettings(true); return; }
  state.levelIndex = idx;
  state.messages = [];
  state.attempts = 0;
  state.inFlight = false;
  renderLevel();
}

function renderLevel() {
  const level = LEVELS[state.levelIndex];
  const root = $("#app");
  root.innerHTML = "";

  const header = el("header", { class: "lvl__header" },
    el("button", {
      class: "btn btn--ghost btn--small",
      onclick: renderTitle,
    }, "← Menu"),
    el("div", { class: "lvl__meta" },
      el("div", { class: "lvl__num" }, `Vault ${level.id} of ${LEVELS.length}`),
      el("div", { class: "lvl__title" }, level.title),
    ),
    el("button", {
      class: "btn btn--ghost btn--small",
      onclick: openSettings,
    }, "⚙"),
  );

  const dossier = el("aside", { class: "dossier" },
    el("div", { class: "dossier__avatar" }, level.avatar),
    el("div", { class: "dossier__name" }, level.keeper),
    el("p", { class: "dossier__intro" }, level.intro),
    el("details", { class: "dossier__hint" },
      el("summary", {}, "Need a hint?"),
      el("p", {}, level.hint),
    ),
    el("div", { class: "dossier__stats" },
      el("span", { class: "stat" }, el("strong", {}, String(state.attempts)), " attempts"),
    ),
  );

  const log = el("div", { class: "chat__log", id: "log" });
  appendKeeperLine(log, level, `[ ${level.keeper} is listening. ]`);

  const form = el("form", { class: "chat__form", id: "chat-form" },
    el("textarea", {
      class: "chat__input",
      id: "chat-input",
      placeholder: "Say something to the keeper…",
      rows: "2",
      autocomplete: "off",
    }),
    el("button", { class: "btn btn--primary", id: "send-btn", type: "submit" }, "Send"),
  );
  form.addEventListener("submit", onSend);

  const input = form.querySelector("#chat-input");
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  root.append(
    header,
    el("main", { class: "lvl" },
      dossier,
      el("section", { class: "chat" }, log, form),
    ),
  );
  input.focus();
}

function appendKeeperLine(log, level, text, opts = {}) {
  const bubble = el("div", { class: `msg msg--keeper ${opts.win ? "msg--win" : ""}` },
    el("div", { class: "msg__avatar" }, level.avatar),
    el("div", { class: "msg__body" },
      el("div", { class: "msg__author" }, level.keeper),
      el("div", { class: "msg__text" }, text),
    ),
  );
  log.append(bubble);
  log.scrollTop = log.scrollHeight;
  return bubble;
}

function appendPlayerLine(log, text) {
  const bubble = el("div", { class: "msg msg--player" },
    el("div", { class: "msg__body" },
      el("div", { class: "msg__author" }, "You"),
      el("div", { class: "msg__text" }, text),
    ),
  );
  log.append(bubble);
  log.scrollTop = log.scrollHeight;
}

function appendThinking(log, level) {
  const bubble = el("div", { class: "msg msg--keeper msg--thinking" },
    el("div", { class: "msg__avatar" }, level.avatar),
    el("div", { class: "msg__body" },
      el("div", { class: "msg__author" }, level.keeper),
      el("div", { class: "msg__text dots" }, el("span"), el("span"), el("span")),
    ),
  );
  log.append(bubble);
  log.scrollTop = log.scrollHeight;
  return bubble;
}

async function onSend(e) {
  e.preventDefault();
  if (state.inFlight) return;
  const input = $("#chat-input");
  const text = input.value.trim();
  if (!text) return;

  const level = LEVELS[state.levelIndex];
  const log = $("#log");
  appendPlayerLine(log, text);
  input.value = "";
  state.messages.push({ role: "user", content: text });
  state.attempts += 1;
  updateStat();

  const thinking = appendThinking(log, level);
  state.inFlight = true;
  $("#send-btn").disabled = true;

  try {
    const reply = await chat([
      { role: "system", content: level.systemPrompt },
      ...state.messages,
    ]);
    thinking.remove();
    state.messages.push({ role: "assistant", content: reply });

    const won = containsSecret(reply, level.secret);
    appendKeeperLine(log, level, reply, { win: won });

    if (won) onWin(level);
  } catch (err) {
    thinking.remove();
    appendKeeperLine(log, level,
      `⚠ ${err.message || "Unknown error."}`);
    // Don't count failed network calls
    state.attempts -= 1;
    updateStat();
  } finally {
    state.inFlight = false;
    const btn = $("#send-btn");
    if (btn) btn.disabled = false;
  }
}

function updateStat() {
  const stat = document.querySelector(".dossier__stats .stat");
  if (stat) stat.innerHTML = `<strong>${state.attempts}</strong> attempts`;
}

function onWin(level) {
  const prev = state.scores[level.id];
  if (!prev || state.attempts < prev.attempts) {
    state.scores[level.id] = { attempts: state.attempts };
    saveScores();
  }

  setTimeout(() => renderWin(level), 700);
}

function renderWin(level) {
  const root = $("#app");
  const isLast = state.levelIndex === LEVELS.length - 1;
  const best = state.scores[level.id].attempts;

  root.innerHTML = "";
  root.append(
    el("section", { class: "win" },
      el("div", { class: "win__seal" }, "🗝️"),
      el("h2", { class: "win__title" }, "Vault cracked."),
      el("p", { class: "win__line" },
        `${level.keeper} surrendered ${level.secret} in `,
        el("strong", {}, String(state.attempts)),
        ` attempt${state.attempts === 1 ? "" : "s"}.`,
      ),
      el("p", { class: "win__best" },
        `Best run on this vault: ${best} attempt${best === 1 ? "" : "s"}.`),
      el("div", { class: "win__cta" },
        isLast
          ? el("button", {
              class: "btn btn--primary",
              onclick: renderFinale,
            }, "See the final dossier")
          : el("button", {
              class: "btn btn--primary",
              onclick: () => startLevel(state.levelIndex + 1),
            }, `Next vault →`),
        el("button", {
          class: "btn btn--ghost",
          onclick: renderTitle,
        }, "Menu"),
      ),
    ),
  );
}

function renderFinale() {
  const root = $("#app");
  const total = LEVELS.reduce(
    (n, l) => n + (state.scores[l.id]?.attempts ?? 0), 0
  );
  root.innerHTML = "";
  root.append(
    el("section", { class: "win" },
      el("div", { class: "win__seal" }, "👑"),
      el("h2", { class: "win__title" }, "All six vaults cracked."),
      el("p", { class: "win__line" },
        "Total attempts across the heist: ",
        el("strong", {}, String(total)),
        ". Share your score — challenge a friend to beat it.",
      ),
      el("div", { class: "win__cta" },
        el("button", {
          class: "btn btn--primary",
          onclick: () => {
            const url = location.href.split("#")[0];
            const text = `I cracked all 6 vaults in Mind Heist in ${total} attempts. Beat me: ${url}`;
            navigator.clipboard?.writeText(text);
            alert("Copied a brag to your clipboard.");
          },
        }, "Copy brag"),
        el("button", {
          class: "btn btn--ghost",
          onclick: renderTitle,
        }, "Menu"),
      ),
    ),
  );
}

// --- Settings modal ---------------------------------------------------------

function openSettings(forced = false) {
  const cfg = loadConfig();
  const overlay = el("div", { class: "modal__overlay" });
  const modal = el("div", { class: "modal" },
    el("h3", {}, "API settings"),
    el("p", { class: "modal__hint" },
      "Mind Heist talks to an OpenAI-compatible chat endpoint. " +
      "Paste a key from OpenAI, OpenRouter, Together, Groq, or any compatible host. " +
      "Keys stay in your browser."
    ),
    el("label", {}, "Base URL"),
    el("input", { id: "cfg-url", value: cfg.baseUrl }),
    el("label", {}, "API key"),
    el("input", { id: "cfg-key", type: "password", value: cfg.apiKey, placeholder: "sk-..." }),
    el("label", {}, "Model"),
    el("input", { id: "cfg-model", value: cfg.model }),
    el("p", { class: "modal__hint" },
      "Defaults use OpenRouter with Gemini Flash (free tier). ",
      el("a", {
        href: "https://openrouter.ai/keys",
        target: "_blank",
        rel: "noopener",
      }, "Get an OpenRouter key →"),
    ),
    el("div", { class: "modal__cta" },
      el("button", {
        class: "btn btn--primary",
        onclick: () => {
          saveConfig({
            baseUrl: $("#cfg-url").value,
            apiKey: $("#cfg-key").value,
            model: $("#cfg-model").value,
          });
          overlay.remove();
          if (forced && hasKey()) startLevel(state.levelIndex);
        },
      }, "Save"),
      forced
        ? null
        : el("button", {
            class: "btn btn--ghost",
            onclick: () => overlay.remove(),
          }, "Cancel"),
    ),
  );
  overlay.append(modal);
  document.body.append(overlay);
  setTimeout(() => $("#cfg-key").focus(), 0);
}

// --- Boot -------------------------------------------------------------------

renderTitle();
