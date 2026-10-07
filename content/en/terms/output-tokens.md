---
title: Output tokens
description: Tokens the model generates back. Billed at a higher rate than input tokens, since they cost more compute to produce.
---

[Tokens](./token.md) the [model](./model.md) generates back. Billed at a higher rate than [input tokens](./input-tokens.md) — commonly around five times the rate — since they cost more compute to produce.

Everything the model writes counts: the prose you read, the code it emits, [tool calls](./tool-call.md), and any extended thinking the model does before answering. That last one surprises people — reasoning tokens are billed as output even when the [harness](./harness.md) often doesn't show them to you, and turning up [effort](./effort.md) spends more of them.

Output tokens also set the pace of a [session](./session.md). The model reads input quickly but generates output one token at a time, so when a [turn](./turn.md) feels slow, it's almost always the output being written, not the input being read. A long wait usually means a long answer is coming.

## usage

"The refactor session is burning through credit even though the inputs are small."

"Agent's rewriting whole files instead of patching. Output tokens cost roughly five times the input rate — get it emitting edits and the bill drops."
