#!/usr/bin/env node
/**
 * NRS Verification Script
 * Ensures each non-exempt line contains an [NRS-###] marker.
 * Exempt rules:
 * - Blank lines
 * - Lines inside JS template literals
 * - Lines inside Python triple-quoted strings
 * - Lines that are only braces or punctuation (optionally)
 * - Default excluded folders (node_modules, .git, .venv, jarvis-env, __pycache__, dist, build)
 */

const fs = require('node:fs');
const path = require('node:path');

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { exts: ['js', 'py', 'css', 'html'], excludes: ['node_modules', '.git', '.venv', 'jarvis-env', '__pycache__', '.pytest_cache', 'dist', 'build'] };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--file') { i++; result.file = args[i]; }
    else if (a === '--dir') { i++; result.dir = args[i]; }
    else if (a === '--ext') { i++; result.exts = args[i].split(',').map(s => s.trim()); }
    else if (a === '--exclude') { i++; result.excludes = args[i].split(',').map(s => s.trim()).filter(Boolean); }
    i++;
  }
  if (!result.file && !result.dir) throw new Error('Provide --file or --dir');
  return result;
}

function collectFiles(dir, exts, excludes) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (excludes?.includes(e.name)) continue; // skip excluded folders
      files.push(...collectFiles(p, exts, excludes));
    }
    else {
      const fileExt = path.extname(e.name).replace('.', '').toLowerCase();
      if (exts.includes(fileExt)) files.push(p);
    }
  }
  return files;
}

function verifyFile(filePath) {
  const ext = path.extname(filePath).replace('.', '').toLowerCase();
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  let inTemplate = false;
  let inPyTriple = false;
  let missing = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Exempt blank lines
    if (!trimmed) continue;

    // Track JS template literal state
    const tickCount = (line.match(/`/g) || []).length;
    if (tickCount % 2 === 1) inTemplate = !inTemplate;
    if (inTemplate) continue;

    // Track Python triple-quoted strings
    const triple1 = (line.match(/'''/g) || []).length;
    const triple2 = (line.match(/"""/g) || []).length;
    const totalTriples = triple1 + triple2;
    if (totalTriples % 2 === 1) inPyTriple = !inPyTriple;
    if (inPyTriple) continue;

    // Optionally exempt punctuation-only lines
    if (/^[{}();,:[\]]+$/.test(trimmed)) continue;

    if (!line.includes('[NRS-')) {
      missing.push({ line: i + 1, text: line });
    }
  }

  return missing;
}

function main() {
  const args = parseArgs();
  const files = args.file ? [path.resolve(args.file)] : collectFiles(path.resolve(args.dir), args.exts, args.excludes);
  let totalMissing = 0;
  for (const f of files) {
    const missing = verifyFile(f);
    if (missing.length) {
      console.log(`\n[MISSING] ${f} -> ${missing.length} lines without NRS`);
      for (const m of missing.slice(0, 10)) {
        console.log(`  ${m.line}: ${m.text}`);
      }
      if (missing.length > 10) console.log(`  ... ${missing.length - 10} more`);
      totalMissing += missing.length;
    }
  }
  console.log(`\nVerification complete. Total missing: ${totalMissing}`);
  process.exit(totalMissing ? 2 : 0);
}

if (require.main === module) {
  try { main(); } catch (err) { console.error('Error:', err.message); process.exit(1); }
}
