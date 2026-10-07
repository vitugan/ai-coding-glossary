---
title: Next-token prediction
description: What the model actually does. Samples one next token from the context, appends it, and runs again. Its only mode of operation.
---

What the [model](./model.md) actually does. Given a [context](./context.md), it samples one next [token](./token.md), appends it, and runs again. Every output — a sentence, a [tool call](./tool-call.md), a thousand-line file — is built one token at a time. The model has no other mode of operation.

Each step works the same way: the tokens in the [context window](./context-window.md) are run through the [parameters](./parameters.md), which produce a probability for every token in the vocabulary — this one is very likely next, that one less so. One token is sampled from those probabilities, appended, and the loop runs again with the slightly longer context. That sampling step is why the same prompt produces different output on different runs: [non-determinism](./non-determinism.md) is built into the mechanism, not a bug layered on top.

Holding onto this mechanism explains behaviour that otherwise looks strange. The model never checks whether a token is _true_ before emitting it — only whether it's _likely_ — which is the root of [hallucination](./hallucination.md). It commits to each token as it goes, so a confident-sounding opening sentence can steer the rest of the answer wrong. And because [output tokens](./output-tokens.md) are produced strictly one at a time, generation speed puts a floor on how fast any [agent](./agent.md) can work.

## usage

"How does the agent 'decide' to call a tool?"

"It doesn't — it's next-token prediction all the way down. The tool call is just a structured string the [harness](./harness.md) parses out of the output stream."
