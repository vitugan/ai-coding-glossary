---
title: Inference
description: Running a trained model to generate output — what happens on every model provider request. Parameters stay fixed.
---

Running a trained [model](./model.md) to generate output — what happens on every [model provider request](./model-provider-request.md). [Parameters](./parameters.md) stay fixed; the model just does [next-token prediction](./next-token-prediction.md) over the [context](./context.md) it's given. Cheap relative to [training](./training.md), but billed per [token](./token.md) and the dominant cost of using a model.

A model's life splits into two phases:

| Phase     | When it happens                  | What it does                                                    | Parameters    |
| --------- | -------------------------------- | --------------------------------------------------------------- | ------------- |
| Training  | Once, before release             | Produces the parameters from a training corpus                  | Being written |
| Inference | Every time anyone uses the model | Runs the frozen parameters over your context to generate tokens | Read-only     |

Nothing you do at inference time writes back to the parameters — that's the reason a correction you make today doesn't stick tomorrow. The model that makes the same mistake next [session](./session.md), after you carefully explained the fix, hasn't ignored you; it's incapable of learning from the exchange. The model is [stateless](./stateless.md) — continuity has to come from outside it — from the [context window](./context-window.md) or a [memory system](./memory-system.md).

This mechanism also explains how you're billed. Every request runs the model over the full context, so cost scales with [input tokens](./input-tokens.md) and [output tokens](./output-tokens.md), and an agent making dozens of [tool](./tool.md) calls pays for inference on each round trip. This is why context size is a cost question as well as a quality one.

## usage

"Why does the bill scale with usage instead of being a flat license?"

"You're paying for inference — every model provider request runs the model on the provider's hardware. Training already happened, but inference costs accrue per request, and a single [turn](./turn.md) can expand into many requests when tools are called."
