---
name: "SkillControl"
description: "Strict governance for creating, modifying, or using any Skill"
trigger: "command"
auto_execution_mode: 2
---

Follow Yorkie Coding Constitution strictly (especially Section 11 - Skills Control).

Before creating, modifying, or invoking ANY Skill:
1. Confirm with the user: “Do you explicitly approve creating/modifying the Skill [name]?”
2. If approved, create the Skill as a folder inside .windsurf/skills/[SkillName]/
3. The Skill folder must contain:
   - README.md with clear description and usage
   - All necessary templates, checklists, and scripts
4. After creation, output the full path and say “Skill [name] created and registered.”
5. Never create or invoke a Skill without going through this workflow.

If the user says “create [name] Skill”, ask for confirmation first.
