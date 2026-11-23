/**
 * Test Suite:      test_canvas_mode0_golden.js
 * Family:          Canvas
 * Description:     Golden-file parity gate. canvas_mode 0 (legacy) MFDB-132 export must stay
 *                  structurally identical to the v1.0.1 baseline (UUIDs, timestamps and hashes normalized).
 *                  Run with --write ONLY against a trusted baseline core to regenerate the golden file.
 * Author:          Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * License:         PolyForm Noncommercial 1.0.0
 * RELATIONAL_ID:   5d0f7c52-8b3e-4d5a-9a8e-2f6a1c0b7e41
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const core = require('../lib_bejson_canvas_core.js');

const GOLDEN_PATH = path.join(__dirname, 'golden_mode0.json');

function normalize(text) {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:]+Z/g, '<ts>')
    .replace(/\d{4}-\d{2}-\d{2}/g, '<date>');
}

function canonicalPackage(pkg) {
  const fm = {};
  pkg.Fields.forEach(function (f, i) { fm[f.name] = i; });
  const files = pkg.Values.map(function (row) {
    return { path: row[fm.Relative_Path], content: JSON.parse(normalize(row[fm.File_Content])) };
  });
  const head = JSON.parse(normalize(JSON.stringify(Object.assign({}, pkg, { Values: [] }))));
  return { head: head, files: files };
}

function buildScenario() {
  const store = core.createCanvasStore();
  store.createNewFile('golden', 1000, 600);
  store.addObject('square', 200, 200, 64, 1000, 600);
  store.addObject('circle', 400, 300, 96, 1000, 600);
  store.addObject('square', 410, 310, undefined, 1000, 600);
  return canonicalPackage(store.buildMfdb132Package());
}

const actual = buildScenario();
if (process.argv.includes('--write')) {
  fs.writeFileSync(GOLDEN_PATH, JSON.stringify(actual, null, 2));
  console.log('Golden written:', GOLDEN_PATH);
} else {
  const golden = JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8'));
  assert.deepStrictEqual(actual, golden);
  console.log('✓ canvas_mode 0 export is structurally identical to the v1.0.1 golden baseline.');
}
