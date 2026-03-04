#!/usr/bin/env node
/**
 * NRS Annotator Script
 * Adds end-of-line comments with [NRS-###] to code files.
 * Safe rules:
 * - Skips blank lines
 * - Skips lines already containing [NRS-]
 * - Skips lines inside JS template literals (best-effort)
 * - Skips lines containing only braces or punctuation when requested
 *
 * Usage:
 *   node scripts/nrs_annotator.js --file <path> --nrs <code> [--dry-run]
 *   node scripts/nrs_annotator.js --dir <folder> --ext js,py,css,html --nrs <code> [--dry-run]
 */

const fs = require('node:fs');
const path = require('node:path');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { dryRun: false, exts: ['js', 'py', 'css', 'html'] };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--file') { i++; result.file = args[i]; }
    else if (a === '--dir') { i++; result.dir = args[i]; }
    else if (a === '--nrs') { i++; result.nrs = args[i]; }
    else if (a === '--ext') { i++; result.exts = args[i].split(',').map(s => s.trim()); }
    else if (a === '--dry-run') result.dryRun = true;
    i++;
  }
  if (!result.nrs) throw new Error('Missing --nrs <code>, e.g., 1102');
  if (!result.file && !result.dir) throw new Error('Provide --file or --dir');
  return result;
}

function commentSyntaxForExt(ext) {
  switch (ext) {
    case 'js':
    case 'ts':
      return { prefix: ' // ', blockStart: '/*', blockEnd: '*/' };
    case 'py':
      return { prefix: '  # ' };
    case 'css':
      return { prefix: ' /* ', suffix: ' */' };
    case 'html':
    case 'htm':
      return { prefix: ' <!-- ', suffix: ' -->' };
    default:
      return { prefix: ' // ' };
  }
}

function isSkippableLine(line) {
  if (!line.trim()) return true; // blank
  if (line.includes('[NRS-')) return true; // already annotated
  return false;
}

function annotateLine(line, syntax, nrs) {
  // Avoid annotating inside template literals or string-only lines
  const trimmed = line.trim();
  const looksLikeTemplateContent = trimmed.startsWith('`') || trimmed.endsWith('`') ||
    (trimmed.startsWith('content: `') || trimmed.startsWith('const ') && trimmed.includes('`'));

  if (looksLikeTemplateContent) return line; // don't modify complex template lines

  const suffix = syntax.suffix || '';
  return line + (syntax.prefix || ' // ') + `[NRS-${nrs}]` + suffix;
}

function annotateFile(filePath, nrs, dryRun) {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  const syntax = commentSyntaxForExt(ext);
  const original = fs.readFileSync(filePath, 'utf8');
  const lines = original.split(/\r?\n/);

  let inTemplate = false;
  let inPyTriple = false; // for Python triple-quoted strings
  let modified = [];
  let changes = 0;

  for (const [i, line] of lines.entries()) {
    const tickCount = (line.match(/`/g) || []).length;
    if (tickCount % 2 === 1) inTemplate = !inTemplate; // flip when odd number of backticks

    // Python triple-quote state machine: handle ''' and """
    if (ext === 'py') {
      const triple1 = (line.match(/'''/g) || []).length;
      const triple2 = (line.match(/"""/g) || []).length;
      const totalTriples = triple1 + triple2;
      if (totalTriples % 2 === 1) inPyTriple = !inPyTriple; // toggle when odd number encountered
    }

    if (inTemplate || inPyTriple || isSkippableLine(line)) {
      modified.push(line);
      continue;
    }

    const newLine = annotateLine(line, syntax, nrs);
    if (newLine !== line) changes++;
    modified.push(newLine);
  }

  if (dryRun) {
    console.log(`[DRY-RUN] ${filePath} -> ${changes} lines would be annotated`);
    return { changes, preview: modified.join('\n') };
  }

  fs.writeFileSync(filePath, modified.join('\n'), 'utf8');
  console.log(`[APPLIED] ${filePath} -> ${changes} lines annotated`);
  return { changes };
}

function collectFiles(dir, exts) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...collectFiles(p, exts));
    } else {
      const ext = path.extname(e.name).replace('.', '').toLowerCase();
      if (exts.includes(ext)) files.push(p);
    }
  }
  return files;
}

function main() {
  const args = parseArgs();
  if (args.file) {
    annotateFile(path.resolve(args.file), args.nrs, args.dryRun);
  } else {
    const targetDir = path.resolve(args.dir);
    const files = collectFiles(targetDir, args.exts);
    let totalChanges = 0;
    for (const f of files) {
      const { changes } = annotateFile(f, args.nrs, args.dryRun);
      totalChanges += changes;
    }
    console.log(`${args.dryRun ? '[DRY-RUN]' : '[APPLIED]'} Total changes: ${totalChanges}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
