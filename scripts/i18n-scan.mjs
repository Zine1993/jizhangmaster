#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const targets = ['app', 'components'];
const ignoreDirs = new Set(['node_modules', '.git', 'assets/i18n', 'dist', 'build', '.expo', '.next']);
const exts = new Set(['.ts', '.tsx', '.js', '.jsx']);
const zhRe = /[\u4e00-\u9fa5]/;

let found = 0;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      if (exts.has(path.extname(entry.name))) files.push(full);
    }
  }
  return files;
}

function scanFile(fp) {
  const content = fs.readFileSync(fp, 'utf8');
  const lines = content.split(/\r?\n/);
  let inBlockComment = false;
  lines.forEach((line, idx) => {
    let l = line;
    // very light-weight block comment detection
    if (inBlockComment) {
      if (l.includes('*/')) inBlockComment = false;
      return;
    }
    const trimmed = l.trim();
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlockComment = true;
      return;
    }
    if (trimmed.startsWith('//')) return;

    if (zhRe.test(l)) {
      // allow inside i18n resource files only
      if (fp.includes(`${path.sep}assets${path.sep}i18n${path.sep}`)) return;
      found++;
      const msg = trimmed.length > 160 ? trimmed.slice(0, 160) + '…' : trimmed;
      console.log(`${fp}:${idx + 1}: ${msg}`);
    }
  });
}

for (const t of targets) {
  const abs = path.join(root, t);
  if (fs.existsSync(abs)) {
    walk(abs).forEach(scanFile);
  }
}

if (found > 0) {
  console.error(`\nFound ${found} line(s) with hardcoded Chinese. Please replace with t('…') or move to i18n resources.`);
  process.exit(1);
} else {
  console.log('No hardcoded Chinese found.');
}