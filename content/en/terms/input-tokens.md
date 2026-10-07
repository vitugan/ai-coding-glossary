---
title: Input tokens
description: Tokens the harness sends on each model provider request. Billed at a lower rate than output tokens.
---

[Tokens](./token.md) the [harness](./harness.md) sends on each [model provider request](./model-provider-request.md) — the [system prompt](./system-prompt.md), the conversation history, [tool results](./tool-result.md), everything the [model](./model.md) reads before it writes. Billed at a lower rate than [output tokens](./output-tokens.md), because they are less expensive to process than output tokens.

When doing [AI](./ai.md) coding, input tokens make up most of your bill. The model is [stateless](./stateless.md), so each [turn](./turn.md) re-sends the entire [session](./session.md) as input: your first message, every response, every tool result since. The input for turn fifty contains the previous forty-nine turns. A single model provider request might produce a few hundred output tokens but re-send a hundred thousand input tokens of accumulated history.

The [prefix cache](./prefix-cache.md) reduces the cost: history that exactly matches a previous request is billed as cheap [cache tokens](./cache-tokens.md) rather than full-price input. When input costs still hurt, the fix is to shrink what gets re-sent — [clearing](./clearing.md) or [compacting](./compaction.md) between tasks.

## usage

"Bill's high but the [agent](./agent.md)'s barely writing anything."

"It's the input tokens — every turn re-sends the whole session. Without the prefix cache you re-pay for the history each request."
