# Problem & Validation — Mind Heist

The AINative Challenge asks teams to identify a real problem, define a
real customer, and validate demand before building. This is that doc.
We kept it short on purpose — Day 1 work should fit on one screen.

---

## The problem

> **"AI games" today aren't games. They're tech demos with a UI."**

Browse any 2026 AI game jam and you'll see three patterns:

1. **AI-as-asset-factory.** Procedural sprites, dialogue text, music.
   The AI is invisible to the player — it could've been a Unity asset
   pack. The game would play identically without it.
2. **AI-as-NPC.** A chat window in the corner where you can "talk to
   the merchant". Players ask one question and leave. The AI is a side
   feature, not a mechanic.
3. **AI-as-content-firehose.** Endless dungeon, endless story. Novel for
   30 seconds, then exhausting, because there are no stakes — the AI
   will accommodate anything you ask.

None of these are AI-native by the only definition that matters:
**if you replaced the AI with a deterministic script, would the game
still work?** For nearly every shipped AI game in 2026, the answer is yes.

That's the gap.

---

## The customer

**Primary:** people who already enjoy LLMs and have spent at least an
hour trying to jailbreak ChatGPT, Claude, or Gemini "for fun".

This audience is bigger than it looks. The Lakera "Gandalf" challenge
(a single-page LLM-jailbreak puzzle) had **>1M plays in 2023** with zero
marketing. r/ChatGPTJailbreak has 130k+ subscribers as of 2026. There is
a clear, established appetite for "social-engineer the model" as a play
pattern. Nobody has shipped a *game* around it — only one-off web toys.

**Secondary:** AI researchers, security folks, prompt engineers — people
who treat prompt injection as a craft. A leaderboard for "fewest tokens
to jailbreak Vault 6" is genuinely interesting professional content for
them, the same way Advent of Code is interesting to backend engineers.

**Tertiary:** the general curious. People who've heard of jailbreaking
but never tried it. The tutorial level is built for them.

---

## The hypothesis

> **People who enjoy LLMs will play a focused, ~10-minute game where
> the core verb is "talk a model into breaking its rules", and will
> share their score.**

Three sub-hypotheses, each falsifiable:

| Hypothesis | How we'd kill it |
|---|---|
| Players finish all 6 levels in one sitting | Cohort completion rate <30% in first 100 sessions |
| Players share their score | Share rate <5% of completions |
| Players come back | Day-2 return <10% of completers |

---

## What we validated before building (Day 1)

The challenge's day-1 deliverable is "evidence of traction". We have:

- **Pre-existing analog.** Lakera Gandalf demonstrates the play pattern
  works at scale with a single level. We're shipping 6 levels with
  difficulty progression and a meta-loop on top of the same primitive.
- **Concept tests in Kathy's network** (informal). Six people, all
  LLM-fluent, all said "yes, I'd play that for ten minutes". Two asked
  to play before it shipped. (Sample is small and biased; treat this as
  signal-not-proof.)
- **The reference experience is universally recognized.** Showing the
  six-line pitch ("Six AI keepers. Six secret words. Talk your way in.")
  did not require explanation in any of the conversations. That's the
  threshold the AINative Challenge asks for: a problem people recognize
  without coaching.

---

## What we'll learn after launching (Day 2 → onward)

The instrumentation we'd add first, in priority order:

1. **Completion funnel** — vault N reached / vault N solved, per level.
   Tells us which keeper is too hard, which is too easy.
2. **Attempts-to-solve distribution** per vault. Tells us whether the
   difficulty curve is real or the secret is just leaking.
3. **Time-to-first-play** after landing. If users bounce at the API key
   modal, BYOK is the wrong default and we need a server-side proxy.
4. **Share rate** — does anyone click "Copy brag"? If no, our viral
   loop is dead and we need a different one (replays? gif export?).

None of those need a backend more invasive than a single static
event-log endpoint, so we can ship them incrementally without
restructuring the project.

---

## What would make us pivot

- Completion rate >70% with median <5 attempts: game is too easy →
  add harder vaults, lower defaults to weaker models.
- Completion rate <10%: game is too punishing → tutorial level needs
  more hand-holding, level 2 needs to be the *real* level 1.
- Share rate near zero: the score mechanic isn't memorable enough → ship
  a per-run replay-as-image feature, because the funny thing is *how*
  you cracked it, not the number.
- Nobody comes back: it's a one-shot toy, not a game → lean into that,
  rebuild as a "daily Gandalf" with one fresh keeper per day, simpler.

The principle: every metric above has a pre-committed action attached.
We aren't going to look at the data and rationalize.
