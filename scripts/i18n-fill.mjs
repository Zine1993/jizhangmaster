#!/usr/bin/env node
/**
 * i18n-fill: Auto-fill placeholder/missing translations using small per-language dictionaries.
 * - Reads docs/i18n/report.json produced by i18n-sync
 * - For each lang (es/fr/de/ja/ko), applies dictionaries from scripts/i18n-dicts/{lang}.json
 * - Dictionary format:
 *   {
 *     "byKey": { "section.key" or "key": "翻译" },
 *     "byText": { "English text": "翻译" }
 *   }
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PACK_DIR = path.join(ROOT, 'assets', 'i18n');
const REPORT_PATH = path.join(ROOT, 'docs', 'i18n', 'report.json');
const EN_PACK_PATH = path.join(PACK_DIR, 'en', 'common.json');
const DICT_DIR = path.join(ROOT, 'scripts', 'i18n-dicts');
const LANGS = ['es','fr','de','ja','ko'];

const SECTIONS = [
  'common','auth','transactionsPage','accounts','categories',
  'emotionsPage','emotions','expenseCategories','incomeCategories','warm'
];

function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return {}; } }
function writeJson(p,obj){ fs.writeFileSync(p, JSON.stringify(obj,null,2)+'\n','utf8'); }
function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }

function flattenPack(pack){
  const map = {};
  Object.keys(pack||{}).forEach(k=>{
    if(typeof pack[k]==='string') map[k]=pack[k];
  });
  for(const sec of SECTIONS){
    const obj = pack?.[sec];
    if(obj && typeof obj==='object'){
      for(const [k,v] of Object.entries(obj)){
        if(typeof v==='string'){
          map[`${sec}.${k}`]=v;
          if(map[k]==null) map[k]=v; // alias
        }
      }
    }
  }
  return map;
}
function setByFlatKey(pack, flatKey, value){
  const parts = flatKey.split('.');
  if(parts.length>=2 && SECTIONS.includes(parts[0])){
    const [sec, ...rest] = parts;
    const k = rest.join('.');
    pack[sec] = pack[sec] || {};
    pack[sec][k] = value;
  } else {
    // best-effort: write into common if exists else root
    if(pack.common && typeof pack.common==='object'){
      pack.common[flatKey] = value;
    } else {
      pack[flatKey] = value;
    }
  }
}

function main(){
  const report = readJson(REPORT_PATH);
  const enPack = readJson(EN_PACK_PATH);
  const enFlat = flattenPack(enPack);

  ensureDir(DICT_DIR);

  for(const lang of LANGS){
    const dictPath = path.join(DICT_DIR, `${lang}.json`);
    const dict = readJson(dictPath);
    const byKey = dict.byKey || {};
    const byText = dict.byText || {};

    const packPath = path.join(PACK_DIR, lang, 'common.json');
    const pack = readJson(packPath);
    const details = report?.[lang]?.details || [];
    let applied = 0;

    for(const item of details){
      // Only target placeholder or missing
      if(item.status!=='placeholder' && item.status!=='missing') continue;
      const key = item.key;
      const enText = enFlat[key];

      // Priority: byKey > byText(English)
      let val = byKey[key];
      if(!val && typeof enText==='string'){
        val = byText[enText];
      }
      if(val && typeof val==='string' && val.trim()){
        setByFlatKey(pack, key, val);
        applied++;
      }
    }

    writeJson(packPath, pack);
    console.log(`${lang}: applied ${applied} fills`);
  }
  console.log('i18n-fill completed.');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('i18n-fill.mjs')) {
  main();
} else {
  main();
}