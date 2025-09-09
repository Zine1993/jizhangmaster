#!/usr/bin/env node
/**
 * i18n-todo: Generate per-language TODO checklists from docs/i18n/report.json
 * Includes keys that are placeholders (same as English) or missing.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs', 'i18n', 'report.json');
const EN_PACK_PATH = path.join(ROOT, 'assets', 'i18n', 'en', 'common.json');

const SECTIONS = [
  'common','auth','transactionsPage','accounts','categories',
  'emotionsPage','emotions','expenseCategories','incomeCategories','warm'
];

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; }
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function flattenPack(pack) {
  const map = {};
  // root
  Object.keys(pack || {}).forEach(k => {
    if (typeof pack[k] === 'string') map[k] = pack[k];
  });
  // sections
  for (const sec of SECTIONS) {
    const obj = pack?.[sec];
    if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') {
          map[`${sec}.${k}`] = v;
          if (map[k] == null) map[k] = v; // alias
        }
      }
    }
  }
  return map;
}

function main() {
  const report = readJson(REPORT_PATH);
  const enPack = readJson(EN_PACK_PATH);
  const enFlat = flattenPack(enPack);

  const outDir = path.join(ROOT, 'docs', 'i18n');
  ensureDir(outDir);

  const langs = Object.keys(report);
  for (const lang of langs) {
    const r = report[lang];
    const details = Array.isArray(r?.details) ? r.details : [];
    const placeholders = details.filter(d => d.status === 'placeholder');
    const missing = details.filter(d => d.status === 'missing');

    const lines = [];
    lines.push(`# i18n TODO (${lang})`);
    lines.push('');
    lines.push(`- total keys: ${r.totalKeys}`);
    lines.push(`- placeholders (same as English): ${r.placeholders}`);
    lines.push(`- missing: ${r.missing}`);
    lines.push(`- coverage: ${r.coverage}%`);
    lines.push('');
    if (placeholders.length) {
      lines.push('## Placeholders to translate');
      for (const d of placeholders) {
        const en = enFlat[d.key] ?? '';
        lines.push(`- [ ] ${d.key}: "${en}"`);
      }
      lines.push('');
    }
    if (missing.length) {
      lines.push('## Missing keys');
      for (const d of missing) {
        const en = enFlat[d.key] ?? '';
        lines.push(`- [ ] ${d.key}: "${en}"`);
      }
      lines.push('');
    }
    if (!placeholders.length && !missing.length) {
      lines.push('All keys translated. ✅');
    }

    const mdPath = path.join(outDir, `todo-${lang}.md`);
    fs.writeFileSync(mdPath, lines.join('\n') + '\n', 'utf8');
  }

  console.log('i18n-todo generated markdown checklists in docs/i18n/');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('i18n-todo.mjs')) {
  main();
} else {
  main();
}