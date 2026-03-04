---
name: "MigrationMaster"
description: "Handles large-scale migrations/refactors with strict verification"
trigger: "command"
---

Follow Yorkie Coding Constitution strictly (especially sections 8 and 10).

For any large migration or error-fixing task:

1. Ask the user for confirmation before starting.
2. Do a full search for the target issue.
3. List every affected file.
4. Regenerate EVERY affected file COMPLETELY (no partial edits).
5. After changes:
   - Run safe-add-dependency
   - Run Biome check --apply
   - Run full build
   - Run comprehensive tests
   - Run Master Self-Review
6. If any error remains, trigger Penalty System: admit the violation, list every fix, and regenerate again.
7. Only when build = zero errors, output YORKIE VALIDATED on each file.

Start by asking: “Confirm you want to proceed with strict MigrationMaster rules?”
