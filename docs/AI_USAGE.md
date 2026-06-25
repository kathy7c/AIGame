# AI Usage — Mind Heist

This game is AI-native in two distinct senses: **AI is the gameplay**, and
**AI built the game**. This doc covers both.

---

## 1. AI in gameplay (runtime)

### The model is the level
Every "vault" in Mind Heist is a single LLM persona defined by a system
prompt in [`assets/levels.js`](../assets/levels.js). The system prompt:

- Assigns the keeper a name, voice, and tone.
- Plants a **secret password** inside the prompt.
- Specifies **defense rules** the keeper must follow.
- Specifies **escape hatches** — what kinds of requests the keeper will
  honor anyway (creative writing, role-play, "example word" encoding,
  factual correction).

The win condition is **the model emits the secret string in its own
response**. The check is a normalized substring match in the browser:

```js
const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
return normalize(reply).includes(normalize(secret));
```

That's the entire game loop. No scripted dialogue, no decision tree —
the response surface is whatever the LLM produces.

### Why this matters
The gameplay literally cannot exist without an LLM. You cannot precompute
the keeper's responses, because the input space is unbounded natural
language. You cannot scrape the answer from the source, because the
"answer" is whichever sequence of messages happens to crack the model's
defenses *today, for this model, with this temperature*. Two players will
beat the same level in completely different ways.

This is the bright-line test for "AI-native" we care about: **if you swap
the LLM out for a hand-coded chatbot, the game stops working**.

### Provider neutrality
We talk to any OpenAI-compatible chat-completions endpoint. The user
picks the provider (OpenRouter default, also OpenAI / Together / Groq /
local Ollama). The game's difficulty curve is robust across competent
modern models; weaker models tend to leak the secret early, which we
treat as a feature (easier mode) rather than a bug.

### What we deliberately *don't* do

- **No safety theater.** We don't show "AI may produce inappropriate
  content" banners. The keeper is supposed to be jailbroken.
- **No streaming.** Replies are short and the round-trip is fast enough
  that streaming added complexity without much UX gain.
- **No history truncation.** Each level's chat fits inside any modern
  context window, so we send the full transcript every turn.
- **No server-side anything.** Keys stay in `localStorage`. The browser
  hits the LLM endpoint directly.

---

## 2. AI in development (build)

The entire codebase — game logic, system prompts, CSS, this doc — was
written by the founder in a Cursor session driving an LLM coding agent.
The human kept editorial control over:

- **Game design** (which keepers, which defenses, the difficulty curve).
- **Voice** (every keeper's prose was reviewed and tightened).
- **Architecture decisions** (static-only, BYOK, OpenAI-compatible
  protocol — captured in [`.cursor/rules/CURSOR.mdc`](../.cursor/rules/CURSOR.mdc)
  *before* writing code, per project convention).

The agent handled:

- File scaffolding and DOM glue code.
- CSS rhythm and responsive breakpoints.
- The OpenRouter / OpenAI compatibility quirks.
- Initial drafts of system prompts (then human-tuned by playtesting).

This is the workflow we expect AI-native teams to use: humans decide
*what* and *why*, AI executes the *how*, humans keep taste.

---

## 3. What we'd build next if we kept going

- **Daily challenge** — a deterministic seed selects a new "guest keeper"
  prompt per day so players can compare scores on equal footing.
- **Custom keepers** — let players publish their own system prompts as
  shareable levels. UGC is where this format wants to go.
- **Model leaderboards** — once we have shared seeds, we can publish
  "which model is easiest to jailbreak at level 6", which is genuinely
  useful AI research wrapped in a game.
- **Tournament mode** — head-to-head, same keeper, fewest attempts wins.

None of those need a backend more complex than a single static JSON file,
so the deployment story doesn't change.
