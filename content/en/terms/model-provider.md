---
title: Model provider
description: Whatever serves a model for inference. Usually remote (Anthropic, OpenAI, Google), but can also be local (Ollama, llama.cpp).
---

Whatever serves a [model](./model.md) for [inference](./inference.md). Usually a remote service (Anthropic, OpenAI, Google), but can also be local — Ollama, LM Studio, llama.cpp running on your own machine. The [harness](./harness.md) doesn't run the model itself; it asks a provider to.

The provider owns the machinery: the [parameters](./parameters.md) live on its hardware, and every [model provider request](./model-provider-request.md) is the harness sending [tokens](./token.md) over the network and getting predictions back. That makes the provider the source of a whole category of problems that get misattributed to the model or the harness — rate limits, degraded capacity, and outages all live here. When the [agent](./agent.md) stalls mid-[session](./session.md) or errors on every [turn](./turn.md), the provider's status page is worth checking before anything else.

The provider also sets the commercial terms: per-token pricing for [input](./input-tokens.md) and [output tokens](./output-tokens.md), [prefix cache](./prefix-cache.md) discounts, and which models are available at all. Note that the provider and the model's maker can be different companies — Bedrock, Vertex, and OpenRouter serve other people's models.

Local providers trade capability for control: the models that fit on your own hardware are far smaller than the frontier ones, but nothing leaves the machine and there's no bill per token.

## usage

"Can we run this offline for the air-gapped client?"

"Swap the model provider to a local one — Ollama or llama.cpp on their box. The harness doesn't care, it just hits a different endpoint."
