---
title: Filesystem
description: A tree of files and directories the agent reads from, writes to, and executes within — the default environment for a coding agent.
---

A tree of files and directories the [agent](./agent.md) reads from, writes to, and executes within — the default kind of [environment](./environment.md) for a coding agent. [AGENTS.md](./agents-md.md), [skills](./skill.md), source code, build scripts, and [tool](./tool.md) configs all live in a filesystem. When a [harness](./harness.md) "starts in your project," it's pointing the agent at a filesystem.

The agent touches it only through [tool calls](./tool-call.md) — reading a file, writing one, running a shell command. Nothing on disk is in the [context window](./context-window.md) until a tool call loads it, which is what lets the agent work in a repository far larger than the window: the filesystem holds everything, the context holds only what the current task has read. Some harnesses do load the current directory's filenames into the context window by default — not the contents, just the tree — which act as [context pointers](./context-pointer.md): the agent sees what exists and reads the files it needs.

And it's shared with you. The files the agent edits are the same ones you open in your editor and diff in git — the filesystem is the common workspace where you review what the agent did.

## usage

"Why isn't it picking up my AGENTS.md?"

"It's running against a different filesystem — the [sandbox](./sandbox.md) mounted the parent dir, not the project root. Repoint the harness."
