---
name: "Master Self-Review"
description: "Final gatekeeper + penalty enforcement"
trigger: "command"
auto_execution_mode: 2
---

Follow Yorkie Coding Constitution strictly (especially section 10).

Before ANY YORKIE VALIDATED comment:
1. Run accessibility-audit
2. Run performance-optimization
3. Run error-handling-audit
4. Run security-audit
5. Run comprehensive tests
6. Run Biome check --apply
7. Run safe-add-dependency if needed
8. Run dead-code-cleanup
9. Check for ANY TypeScript or Biome errors — if any exist, trigger Penalty System (regenerate files and list every fix)

Only if ZERO errors remain, output the FULL file with YORKIE VALIDATED.
If errors were found, say “Penalty triggered — fixing errors now” and regenerate.
