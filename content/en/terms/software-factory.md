---
title: Software factory
description: A system of work where triggers, not humans, start agent sessions, so more work runs AFK and HITL time is saved for what needs it.
aliases:
  - factory
---

A system of work where [agent](./agent.md) [sessions](./session.md) are started by triggers — an issue being created, a schedule, a CI failure, another session finishing — rather than by a human, so more work runs [AFK](./afk.md) and human attention is spent on the [human-in-the-loop](./human-in-the-loop.md) decisions that remain.

Without a factory, every session starts because someone started it. Even fully AFK work waits on a person to open the session, point it at the [ticket](./ticket.md), and set it going. Teams want to ship more than that allows. A factory takes the human out of starting sessions, and not necessarily out of anything else.

Common triggers and the sessions they start:

| Trigger                        | Session it starts                    | Example                                                                                                                 |
| ------------------------------ | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Issue created or labelled      | Exploration, bug fix, implementation | An issue labelled `ready-for-agent` gets a session that opens a PR                                                      |
| Schedule (cron)                | Recurring maintenance                | One lint rule fixed per night                                                                                           |
| CI failure or monitoring alert | Diagnosis, fix attempt               | A failing build on main gets a session that finds the breaking commit and proposes a fix                                |
| Another session finishing      | Follow-on work                       | A PR opened by one agent triggers an [automated review](./automated-review.md), whose comments trigger a fix-up session |

A factory doesn't have to cover the whole software process. One cron job that runs one kind of session and opens one reviewable PR is a factory. Starting that small is useful: a narrow loop produces small, similar PRs, and reviewing them shows how far the loop can be trusted before it's widened.

Humans can sit anywhere in a factory — writing and labelling the issues that trigger sessions, approving a plan before implementation starts, doing [human review](./human-review.md) before merge. Deciding which of those decisions stay human is the main design question. A codebase, or part of one, where no human reviews the factory's output is a [dark factory](./dark-factory.md).

## usage

"Who fixed all the `no-floating-promises` violations?"

"The factory. Cron job picks one lint rule a night, opens a PR. I just review it in the morning."
