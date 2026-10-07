---
title: Prefix cache
description: The provider-side store that lets consecutive requests skip re-processing a shared prefix, billing those tokens at a lower rate.
---

The [provider](./model-provider.md)-side store that lets consecutive [model provider requests](./model-provider-request.md) skip re-processing a shared prefix. When the start of a request matches the start of a recent one — same [system prompt](./system-prompt.md), same history up to some point — the provider reuses its prior work and bills those [tokens](./token.md) as [cache tokens](./cache-tokens.md) at a much lower rate.

The cache pays off because sessions grow append-only. Every request re-sends the whole history as [input tokens](./input-tokens.md) (see that entry for why), and in a normal [session](./session.md) the history only changes at the end — each request is the previous one plus a few new messages. The provider processes the long shared beginning once, stores the result, and picks up from where the prefix ends. Without the cache, a 50-[turn](./turn.md) session would pay to re-process turn one fifty times.

Caches also expire. How long an entry stays warm varies per model provider — typically minutes, not hours. Leave a session idle past the window and the next request rebuilds the prefix at full price once before caching resumes. This is mostly a [harness](./harness.md) builder's concern; as a user, the visible effect is that requests after a long pause cost more than the ones before it.

## usage

"Why did the bill spike halfway through the session?"

"Harness started injecting the current time into the system prompt every turn. Prefix cache breaks at the first changed token, so every request after that billed at full rate."
