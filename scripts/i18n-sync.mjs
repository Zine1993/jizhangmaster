#!/usr/bin/env node
/**
 * i18n-sync: Merge LanguageContext inline translations with JSON packs.
 * Priority per language: inline > existing JSON > English JSON fallback.
 * Also generates a report of placeholders (identical to English) per language.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = process.cwd();
const PACK_DIR = path.join(ROOT, 'assets', 'i18n');
const LC_PATH = path.join(ROOT, 'contexts', 'LanguageContext.tsx');
const EN_PACK_PATH = path.join(PACK_DIR, 'en', 'common.json');
const LANGS = ['zh','es','fr','de','ja','ko'];

const SAME_AS_EN_OK = new Set([
  'appName',
  'common.appName',
  'amountInvalidTitle',
  'transactionsPage.amountInvalidTitle',
  'transactions',
  'common.transactions',
  'description',
  'transactionsPage.description',
  'emoji',
  'categories.emoji',
  'transport',
  'expenseCategories.transport',
  'shopping',
  'expenseCategories.shopping',
  'name',
  'categories.name',
  'freelance',
  'incomeCategories.freelance'
]);

const SECTIONS = [
  'common','auth','transactionsPage','accounts','categories',
  'emotionsPage','emotions','expenseCategories','incomeCategories','warm'
];

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return {};
  }
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function flattenPack(pack) {
  // Produce both "sec.key" and "key" entries to align with t() resolution
  const map = {};
  const secIndex = {}; // plain key -> section name (based on en structure)
  // root-level keys
  Object.keys(pack || {}).forEach(k => {
    if (typeof pack[k] === 'string') {
      map[k] = pack[k];
      if (secIndex[k] === undefined) secIndex[k] = null;
    }
  });
  // sections
  for (const sec of SECTIONS) {
    const obj = pack?.[sec];
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(k => {
        const v = obj[k];
        if (typeof v === 'string') {
          map[`${sec}.${k}`] = v;
          if (map[k] == null) map[k] = v; // alias plain key
          if (secIndex[k] == null) secIndex[k] = sec;
        }
      });
    }
  }
  return { map, secIndex };
}

function extractInlineTranslations() {
  const code = fs.readFileSync(LC_PATH, 'utf8');
  const startMarker = 'const translations = {';
  const i0 = code.indexOf(startMarker);
  if (i0 === -1) return {};
  // find the matching closing brace of the object literal
  let i = code.indexOf('{', i0);
  let depth = 0;
  let end = -1;
  for (let j = i; j < code.length; j++) {
    const ch = code[j];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end = j;
        break;
      }
    }
  }
  if (end === -1) return {};
  const objLiteral = code.slice(i, end + 1);
  try {
    // Evaluate the plain JS object literal safely
    // eslint-disable-next-line no-new-func
    const obj = Function('"use strict"; return (' + objLiteral + ');')();
    return obj && typeof obj === 'object' ? obj : {};
  } catch (e) {
    console.warn('Warn: failed to eval translations object:', e.message);
    return {};
  }
}

function buildLangPack({ keys, enFlat, enSecIndex, inlineByLang, existingJsonByLang }) {
  const resultByLang = {};
  for (const lang of LANGS) {
    const inline = inlineByLang[lang] || {};
    const existing = existingJsonByLang[lang] || {};
    const existingFlat = flattenPack(existing).map;

    // compose final flat map
    const finalFlat = {};
    for (const key of keys) {
      const inlineVal = inline[key];
      if (typeof inlineVal === 'string' && inlineVal.trim()) {
        finalFlat[key] = inlineVal;
        continue;
      }
      const existVal = existingFlat[key];
      if (typeof existVal === 'string' && existVal.trim()) {
        finalFlat[key] = existVal;
        continue;
      }
      finalFlat[key] = enFlat[key] ?? key;
    }

    // reconstruct sectioned JSON following en's section index
    const out = {};
    for (const sec of SECTIONS) out[sec] = {};
    // root-level keys if any
    for (const [k, v] of Object.entries(finalFlat)) {
      const sec = enSecIndex[k] || null;
      if (sec && SECTIONS.includes(sec)) {
        // k is a plain key that belongs to a section in en
        out[sec][k] = v;
      } else {
        out[k] = v;
      }
    }

    resultByLang[lang] = out;
  }
  return resultByLang;
}

function generateReport({ keys, enFlat, mergedByLang }) {
  const report = {};
  for (const lang of LANGS) {
    const pack = mergedByLang[lang];
    const flat = flattenPack(pack).map;
    let placeholders = 0;
    let missing = 0;
    const details = [];
    for (const k of keys) {
      const lv = flat[k];
      const ev = enFlat[k];
      if (lv == null) {
        missing++;
        details.push({ key: k, status: 'missing' });
      } else if (lv === ev && !SAME_AS_EN_OK.has(k)) {
        placeholders++;
        details.push({ key: k, status: 'placeholder' });
      }
    }
    report[lang] = {
      totalKeys: keys.length,
      placeholders,
      missing,
      coverage: Number(((keys.length - placeholders - missing) / keys.length * 100).toFixed(2)),
      details
    };
  }
  return report;
}

function main() {
  const enPack = readJson(EN_PACK_PATH);
  const { map: enFlat, secIndex: enSecIndex } = flattenPack(enPack);

  const inline = extractInlineTranslations();
  const inlineEn = inline.en || {};
  // union of keys: en JSON + inline.en
  const keysSet = new Set([...Object.keys(enFlat), ...Object.keys(inlineEn)]);
  const keys = Array.from(keysSet).sort();

  // inline translations are flat (key -> string)
  const inlineByLang = {};
  for (const lang of LANGS) {
    inlineByLang[lang] = inline[lang] || {};
  }

  // Load existing JSON per lang
  const existingJsonByLang = {};
  for (const lang of LANGS) {
    const p = path.join(PACK_DIR, lang, 'common.json');
    existingJsonByLang[lang] = readJson(p);
  }

  // Build merged packs
  const mergedByLang = buildLangPack({ keys, enFlat, enSecIndex, inlineByLang, existingJsonByLang });

  // Write back JSON files and report
  for (const lang of LANGS) {
    const targetDir = path.join(PACK_DIR, lang);
    ensureDir(targetDir);
    const outPath = path.join(targetDir, 'common.json');
    fs.writeFileSync(outPath, JSON.stringify(mergedByLang[lang], null, 2) + '\n', 'utf8');
  }

  const report = generateReport({ keys, enFlat, mergedByLang });
  const reportDir = path.join(ROOT, 'docs', 'i18n');
  ensureDir(reportDir);
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');

  // Console summary
  console.log('i18n-sync completed.');
  for (const lang of LANGS) {
    const r = report[lang];
    console.log(`${lang}: total=${r.totalKeys}, placeholders=${r.placeholders}, missing=${r.missing}, coverage=${r.coverage}%`);
  }
}

if (import.meta.url === `file://${path.relative('', __filename)}` || process.argv[1]?.endsWith('i18n-sync.mjs')) {
  // simple entrypoint check
  main();
} else {
  // If imported as a module, still run main to keep behavior simple
  main();
}