---
title: Permission mode
description: The permission-gating slice of an agent mode — which tool calls trigger a permission request and which run automatically.
---

The permission-gating slice of an [agent mode](./agent-mode.md) — which [tool calls](./tool-call.md) trigger a [permission request](./permission-request.md) and which run automatically. The original purpose of mode systems before [harnesses](./harness.md) started bundling behavioral instructions on top.

Harnesses ship a ladder of these modes:

| Mode               | Reads | Writes & shell         | Typical use                                     |
| ------------------ | ----- | ---------------------- | ----------------------------------------------- |
| Read-only / plan   | Auto  | Blocked                | Research, planning, reviewing                   |
| Default            | Auto  | Ask                    | Day-to-day supervised work                      |
| Auto-edit          | Auto  | Edits auto, shell asks | Trusted repos, mechanical changes               |
| "Yolo" / full-auto | Auto  | Auto                   | [Sandboxes](./sandbox.md), [AFK](./afk.md) runs |

Choosing a rung is a trade between safety and interruption, and both failure modes are felt. Too tight, and you become the bottleneck: the [agent](./agent.md) stops every few seconds for harmless reads, you click approve on autopilot, and the approvals stop meaning anything — rubber-stamping is the worst of both worlds, all the interruption with none of the protection. Too loose, and the agent edits files and runs commands you'd have wanted to see first.

The loose end is most defensible inside a sandbox, where the blast radius of a bad [tool](./tool.md) call is contained. Outside one, most people settle on auto-approving reads and keeping a [human in the loop](./human-in-the-loop.md) for anything irreversible.

## usage

"It paused on every grep — totally killed the AFK run."

"Loosen the permission mode for read-only tools, keep prompting on writes and shell. Most permission requests on a research [session](./session.md) are noise."
