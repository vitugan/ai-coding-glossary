---
title: Automated review
description: "An agent reviewing another agent's work, often with a different model or system prompt. Non-deterministic: it forms a judgement."
---

An [agent](./agent.md) reviewing another agent's work, often with a different [model](./model.md) or [system prompt](./system-prompt.md). Non-deterministic: it forms a judgement. Runs anywhere — pre-merge on a PR, post-hoc on commit history, mid-session as a [subagent](./subagent.md). An LLM-as-judge in CI is automated review, not an [automated check](./automated-check.md); what the assertion _does_ decides the category, not where it runs.

The separation from the working agent is what makes it work. Asking the agent that wrote the code to review its own work gets you very little — the [session](./session.md) that produced the bug also contains the reasoning that produced it, and the agent reads its own conclusions back as confirmation. A reviewer with a fresh [context window](./context-window.md) has none of that attachment: it sees the diff the way a stranger would, which is what review depends on. A different model or a review-specific system prompt sharpens this further — different blind spots, and a system prompt scoped to what you actually care about (security, API contracts, performance) rather than a vague "look for problems".

It slots between the other review layers. Automated checks are deterministic and catch what can be asserted mechanically; [human review](./human-review.md) is expensive and scales worst. Automated review sits in the middle: it catches judgement-shaped problems — a misleading function name, a missed edge case — at machine cost. Because it's non-deterministic, it can miss things and flag non-issues; treat it as a filter that raises the floor before a human looks, not a gate that replaces one.

## avoid

"AI review" / "agent review" — too vague to distinguish from the working agent itself.

## usage

"We're getting too many bad PRs from the [AFK](./afk.md) runs."

"Add an automated review step before merge — different model, separate system prompt, scoped to security and contract changes."
