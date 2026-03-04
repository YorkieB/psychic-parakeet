---
name: 'Add Everyday File Headers - Multi-Format'

description: 'Adds friendly descriptions at the top of every file with format-specific validation'

trigger: 'command'
---

Follow Yorkie Coding Constitution strictly (including the File Header rule).

For each file in the selected folder (or the whole project if none selected):

## File Types Supported:

- **Code Files**: .ts, .tsx, .js, .jsx (block comments)
- **Config Files**: .json, .yml, .yaml (JSON/YAML fields)
- **Scripts**: .bat, .ps1, .sh (REM comments or # comments)
- **Documentation**: .md (HTML comments)

## Process for Each File:

### 1. Read and Understand

- Read the file and understand what it actually does in simple terms
- Identify the file type by extension

### 2. Header Format by File Type:

#### Code Files (.ts, .tsx, .js, .jsx):

```
/*
  This file [simple one-sentence description of what it does].

  It handles [main things it does] and makes sure [key benefit or behavior].
*/
```

#### JSON Files (.json):

```json
{
  "_fileDescription": "This file [simple one-sentence description of what it does].",
  "_filePurpose": "It handles [main things it does] and makes sure [key benefit or behavior].",
  "_lastModified": "2026-02-24"
  // ... existing JSON content
}
```

#### YAML Files (.yml, .yaml):

```yaml
# This file [simple one-sentence description of what it does].
# It handles [main things it does] and makes sure [key benefit or behavior].

# ... existing YAML content
```

#### Batch Files (.bat):

```batch
@echo off
REM This file [simple one-sentence description of what it does].
REM It handles [main things it does] and makes sure [key benefit or behavior].

REM ... existing batch content
```

#### PowerShell Files (.ps1):

```powershell
# This file [simple one-sentence description of what it does].
# It handles [main things it does] and makes sure [key benefit or behavior].

# ... existing PowerShell content
```

#### Shell Scripts (.sh):

```bash
#!/bin/bash
# This file [simple one-sentence description of what it does].
# It handles [main things it does] and makes sure [key benefit or behavior].

# ... existing shell content
```

#### Markdown Files (.md):

```markdown
<!--
  This file [simple one-sentence description of what it does].

  It handles [main things it does] and makes sure [key benefit or behavior].
-->

# ... existing markdown content
```

### 3. Validation by File Type:

#### Code Files:

- Run `biome check --apply` (TypeScript/JavaScript)
- Check for syntax errors
- Validate imports and exports

#### JSON Files:

- Validate JSON syntax: `jq . filename.json` or `node -e "JSON.parse(...)"`
- Check for required fields if schema exists
- Validate structure and nesting

#### YAML Files:

- Run `yamllint` if available
- Check YAML syntax and structure
- Validate indentation and formatting

#### Batch Files:

- Check for unclosed IF/FOR blocks
- Validate common command syntax
- Check for missing labels in GOTO statements
- Verify variable usage

#### PowerShell Files:

- Run `Invoke-ScriptAnalyzer` if available
- Check PowerShell syntax
- Validate cmdlet usage

#### Shell Scripts:

- Run `shellcheck` if available
- Check shell syntax
- Validate command usage

#### Markdown Files:

- Run `markdownlint` if available
- Check markdown syntax
- Validate link formatting

### 4. Validation Comments:

Add appropriate validation comment at the end of each file:

#### Code Files:

```javascript
// YORKIE VALIDATED — types defined, all references resolved, JSX syntax correct, Biome reports zero errors/warnings.
```

#### JSON Files:

```json
"_yorkieValidated": "JSON syntax valid, structure correct, all required fields present."
```

#### YAML Files:

```yaml
# YORKIE VALIDATED — YAML syntax valid, structure correct, indentation consistent.
```

#### Script Files (.bat, .ps1, .sh):

```batch
REM YORKIE VALIDATED — script syntax valid, commands verified, error handling present.
```

#### Markdown Files:

```markdown
<!-- YORKIE VALIDATED — markdown syntax valid, links checked, formatting consistent. -->
```

### 5. Quality Guidelines:

- Keep language friendly and non-technical (like explaining to a friend)
- Use 2-5 sentences maximum for descriptions
- Focus on what the file does and why it matters
- Maintain existing functionality while adding headers
- Process one folder at a time for safe review

### 6. Error Handling:

- If validation fails, report the specific error
- Don't modify files that have validation errors
- Provide clear feedback on what needs to be fixed
- Continue with other files in the batch

### 7. Output Requirements:

- Output the FULL updated file (complete, no "...")
- Include validation results
- Report any errors found
- Provide summary of changes made

This workflow ensures every file in the project has clear, accessible documentation while maintaining code quality across all file types.

<!-- YORKIE VALIDATED — workflow defined, multi-format headers established, file documentation standardized -->
