---
title: Parameters
description: The numbers inside a model — often billions — tuned during training. Everything the model knows lives in them. Also called weights.
---

The numbers inside a [model](./model.md) — often billions of them — tuned during [training](./training.md). Everything the model "knows" lives in them. Training sets them; [inference](./inference.md) uses them unchanged. Also called _weights_.

Mechanically, the parameters are what turn input into output. [Next-token prediction](./next-token-prediction.md) is a giant calculation: the [tokens](./token.md) in the [context window](./context-window.md) go in, get multiplied through the parameters, and a prediction for the next token comes out. There is no database of facts inside the model, no code lookup table — just these numbers, arranged so that the calculation tends to produce useful output. Facts the model can recite from training, like a standard library API, are [parametric knowledge](./parametric-knowledge.md): stored in the parameters, not retrieved from anywhere.

The detail worth internalising is that parameters are frozen after training. Nothing you do in a [session](./session.md) changes them — no correction you make, no codebase you show it, no mistake it learns from. Every session runs on the same numbers. This is why the model is [stateless](./stateless.md), why its built-in knowledge stops at the [knowledge cutoff](./knowledge-cutoff.md), and why anything project-specific has to arrive via [context](./context.md) instead. The only way parameters change is more training — which produces, in effect, a different model.

## usage

"Can we fine-tune it on our codebase?"

"That'd update the parameters — different model afterwards. For one project it's almost always cheaper to load the codebase as context than to retrain."
