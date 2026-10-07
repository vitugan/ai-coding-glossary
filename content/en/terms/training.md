---
title: Training
description: The process that sets a model's parameters by exposing it to vast amounts of text and adjusting to improve next-token prediction.
---

The process that sets a [model](./model.md)'s [parameters](./parameters.md), by exposing it to vast amounts of text and adjusting parameters to improve [next-token prediction](./next-token-prediction.md). A one-time, expensive process done by the [model provider](./model-provider.md). Encompasses both pre-training (the bulk run) and post-training (later refinements like instruction-following and safety); the distinction doesn't matter at this glossary's level.

The mechanism is repetition at scale: show the model a stretch of text, have it predict the next [token](./token.md), nudge the parameters toward whatever the actual next token was, and repeat across trillions of tokens. Nothing is stored as facts or rules — everything the model "knows" is a side effect of getting better at prediction, compressed into the parameters as [parametric knowledge](./parametric-knowledge.md).

Two consequences matter day to day. Training ends at a point in time, so the model has a [knowledge cutoff](./knowledge-cutoff.md) — it hasn't seen the library version you upgraded to last month. And training is not something you can do: when the model doesn't know your codebase, your conventions, or your internal APIs, the fix is never "teach the model" — it's putting that material into [context](./context.md), the one input you control.

## usage

"Can we get it to know our internal API?"

"Not via training — that's a months-long process by the model provider. Load the API docs into context instead, that's the lever you actually have."
