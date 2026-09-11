---
name: agent-orchestration-rules
description: "User rule for subagents and workflows - always Opus at max effort, never Fable, never more than 5 agents at once"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e14e7714-7236-4059-ac98-ba1c7e160c4a
  modified: 2026-09-10T22:13:10.624Z
---

When spawning subagents or authoring Workflow scripts: every agent uses model `opus` with effort `max`, never `fable`, and no workflow (or concurrent set of workflows) spawns more than 5 agents.

**Why:** stated by the user on 2026-09-10 after a 15-agent research workflow hit the session limit mid-run and lost 11 agents' work.
**How to apply:** design workflows as at most 5 parallel agents per round (combine tasks per agent instead of fanning out), pass `{ model: 'opus', effort: 'max' }` to every `agent()` call, and run rounds sequentially. See [[eatdanville-project]] for the project this was set on.
