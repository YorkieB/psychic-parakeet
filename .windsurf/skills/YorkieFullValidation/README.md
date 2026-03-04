# YorkieFullValidation Skill

## Purpose
Performs comprehensive Yorkie Constitution compliance validation across the entire codebase.

## Functionality
- Scans all relevant files (.ts, .tsx, .js, .jsx, .json with comments)
- Validates Yorkie compliance (headers, tests, dependencies, etc.)
- Identifies TypeScript, Biome, and test errors
- Calculates compliance percentage
- Generates detailed compliance reports

## Usage
Invoked as part of full codebase audit workflow.
Must be used after user explicit approval through SkillControl workflow.

## Validation Checks
- File headers compliance
- Test file existence and passing
- Dependency installation status
- Biome formatting compliance
- TypeScript compilation
- Yorkie Constitution adherence

## Output
Detailed compliance report with:
- Overall compliance score
- Critical issues list
- Warnings and recommendations
- File-specific error details
