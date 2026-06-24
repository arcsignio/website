#!/usr/bin/env node
/**
 * Content lint for the ArcSign blog.
 *
 * Catches the two classes of issues that this site has historically shipped:
 *   1. Indented "blocks" (4+ spaces outside a fenced code block) that Markdown
 *      renders as a dark code box instead of a table / list / callout — the
 *      "跑版" problem. These come from authoring tools that used indentation
 *      for visual layout.
 *   2. Generation artifacts left in frontmatter `description` — e.g. a sentence
 *      that ends, then is glued to a boilerplate tail via "。，…". These leak
 *      into search-result snippets.
 *
 * Runs over src/content/blog/**.md(x). Exits non-zero on any finding so CI
 * fails the build. Pure Node, no deps.
 *
 * Usage:  node scripts/check-content.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/content/blog';
const errors = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.mdx?$/.test(name)) out.push(p);
  }
  return out;
}

function checkFile(path) {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n');

  // --- frontmatter description artifact ---
  // Only inspect the frontmatter block (between the first two `---`).
  let fmEnd = -1;
  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') { fmEnd = i; break; }
    }
  }
  for (let i = 1; i < fmEnd; i++) {
    const l = lines[i];
    if (/^description:/.test(l)) {
      // "。，" = sentence end glued to a boilerplate tail (CJK)
      if (l.includes('。，')) {
        errors.push(`${path}:${i + 1}  description has a "。，" generation artifact (sentence glued to a boilerplate tail). Truncate at the first sentence.`);
      }
    }
  }

  // --- indented "跑版" blocks ---
  // Any line indented with 4+ spaces that is NOT inside a fenced code block.
  // Legitimate code/ASCII lives inside ``` fences; legitimate Markdown
  // (lists, tables, blockquotes, headings) is never 4-space-indented at the
  // start of a content line in this codebase.
  let inFence = false;
  for (let i = fmEnd + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*```/.test(l)) { inFence = !inFence; continue; }
    if (inFence) continue;
    // 4+ leading spaces with non-space content = a code-box-rendering block
    if (/^ {4,}\S/.test(l)) {
      const preview = l.trim().slice(0, 40);
      errors.push(`${path}:${i + 1}  indented block renders as a code box ("跑版"): "${preview}". Use a table / list / blockquote / fenced code instead.`);
    }
  }
}

const files = walk(ROOT);
for (const f of files) checkFile(f);

if (errors.length) {
  console.error(`\n✗ content check failed — ${errors.length} issue(s):\n`);
  for (const e of errors) console.error('  ' + e);
  console.error(`\nScanned ${files.length} files.\n`);
  process.exit(1);
}
console.log(`✓ content check passed (${files.length} files).`);
