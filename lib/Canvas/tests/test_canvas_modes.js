/**
 * Test Suite:      test_canvas_modes.js
 * Family:          Canvas
 * Description:     Verifies the canvas_mode gate: fail-safe fallback, viewport independence,
 *                  rectangle collision, world clamping, strict import, page math, round trips.
 * Author:          Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * License:         PolyForm Noncommercial 1.0.0
 * RELATIONAL_ID:   0c7a41e8-6f2b-4c3d-b1a5-93d8e4f2a617
 */
'use strict';
const assert = require('assert');
const core = require('../lib_bejson_canvas_core.js');
const laneRow = (store) => store.buildLivePositionSchema().Values[0].slice(12, 14);

// Gate fail-safe
['x', 3, -1, null, undefined, NaN].forEach(function (m) {
  assert.strictEqual(core.createCanvasStore({ canvasMode: m }).state.canvasMode, 0);
});
console.log('✓ Invalid canvasMode values fall back to legacy mode 0.');

// Mode 0 unchanged: legacy export uses 8 meta fields and 1.31 manifest
const s0 = core.createCanvasStore(); s0.createNewFile('m0', 1000, 600);
assert.strictEqual(s0.buildCanvasMetaEntityDoc().Fields.length, 8);
assert.strictEqual(s0.buildMfdbManifest().MFDB_Version, '1.31');
console.log('✓ Mode 0 meta/manifest unchanged.');

// D1: lanes device-independent in modes 1 and 2
[1, 2].forEach(function (mode) {
  const out = [800, 1600].map(function (vw) {
    const s = core.createCanvasStore({ canvasMode: mode }); s.createNewFile('d1', vw, 600);
    s.addObject('sq', 400, 300, 64, vw, 600);
    return laneRow(s).join(',');
  });
  assert.strictEqual(out[0], out[1]);
});
console.log('✓ D1: lane/row identical across viewport sizes in modes 1 and 2.');

// D2: no viewport -> still correct placement
const s1 = core.createCanvasStore({ canvasMode: 1 }); s1.createNewFile('d2');
const p = s1.addObject('sq', 500, 300);
assert.deepStrictEqual([p.cx, p.cy], [500, 300]);
assert.strictEqual(s1.state.stageWidth, 2560); assert.strictEqual(s1.state.stageHeight, 1440);
s1.setStageMetrics(400, 300);
assert.strictEqual(s1.state.stageWidth, 2560);
assert.strictEqual(s1.state.viewportWidth, 400);
assert.strictEqual(s1.addObject('sq', NaN, 5), null);
console.log('✓ D2: world fixed; viewport hints never shrink the world; NaN target rejected.');

// D3: rectangle collision
const sr = core.createCanvasStore({ canvasMode: 1 }); sr.createNewFile('d3');
const wide = sr.addObject('wide', 300, 300, 64, 0, 0, { width: 200, height: 32 });
assert.strictEqual(wide.width, 200);
const nb = sr.addObject('sq', 390, 300, 64);
assert(!core.hasOverlap([wide], nb.cx, nb.cy, { w: 64, h: 64 }, null));
assert(nb.cx - 32 >= wide.cx + 100 - 0.001 || Math.abs(nb.cy - wide.cy) >= 48 - 0.001);
const mv = sr.moveObject(nb.id, 390, 300);
assert(!core.hasOverlap([wide], mv.cx, mv.cy, { w: 64, h: 64 }, null));
const row = sr.buildLivePositionSchema().Values[0];
assert.strictEqual(row[10], 200); assert.strictEqual(row[11], 32);
console.log('✓ D3: rectangle-aware collision and export.');

// Legacy mode ignores extra rect (parity)
const sl = core.createCanvasStore(); sl.createNewFile('l', 1000, 600);
assert.strictEqual(sl.addObject('w', 300, 300, 64, 1000, 600, { width: 200, height: 32 }).width, undefined);

// Round trip + D5/D6/D7 + strict import (mode 1)
const exp = sr.buildMfdb132Package();
assert.strictEqual(exp.MFDB_Version, '1.32');
const manifestRow = JSON.parse(exp.Values[0][exp.Fields.findIndex(f => f.name === 'File_Content')]);
assert.strictEqual(manifestRow.MFDB_Version, '1.32');
const imp = core.createCanvasStore({ canvasMode: 1 });
const ir = imp.importMfdb132(exp);
assert(ir.ok, JSON.stringify(ir));
assert.strictEqual(imp.state.shapes.length, 2);
assert.strictEqual(imp.state.shapes.find(s => s.type === 'wide').width, 200);
assert.strictEqual(imp.state.worldWidth, 2560);

const hi = exp.Fields.findIndex(f => f.name === 'File_Hash');
const tam = JSON.parse(JSON.stringify(exp)); tam.Values[1][hi] = '0'.repeat(64);
const tr = imp.importMfdb132(tam);
assert.strictEqual(tr.ok, false); assert(/SHA-256 mismatch/.test(tr.errors[0]));
assert.strictEqual(core.createCanvasStore().importMfdb132(tam).ok, true); // legacy unchanged
assert.strictEqual(core.createCanvasStore({ strictImport: true }).importMfdb132(tam).ok, false);
console.log('✓ D4/D7: strict import rejects tampered hash; mode 1 manifest 1.32; legacy unchanged.');

// D5: out-of-world node re-clamped on import; mode-0 file into mode-1 store
const s0big = core.createCanvasStore(); s0big.createNewFile('big', 5000, 5000);
s0big.addObject('sq', 4800, 4800, 64, 5000, 5000);
const w1 = core.createCanvasStore({ canvasMode: 1 }); assert(w1.importMfdb132(s0big.buildMfdb132Package()).ok);
assert(w1.state.shapes[0].cx <= 2560 - 32 && w1.state.shapes[0].cy <= 1440 - 32);
const back = core.createCanvasStore(); // mode 0 opens mode 1 file with a warning
const br = back.importMfdb132(sr.buildMfdb132Package());
assert(br.ok && br.fileCanvasMode === 1 && br.warnings.some(w => /canvas_mode 1/.test(w)));
console.log('✓ D5: import re-clamps to world; mode-0 store warns on mode-1 file.');

// Mode 2 pages
const s2 = core.createCanvasStore({ canvasMode: 2 }); s2.createNewFile('pg', 400, 300);
assert.strictEqual(s2.state.stageWidth, 2560); assert.strictEqual(s2.state.stageHeight, 1440);
assert.deepStrictEqual(s2.pageOf(100, 100), { col: 0, row: 0 });
assert.deepStrictEqual(s2.pageOf(1300, 100), { col: 1, row: 0 });
assert.deepStrictEqual(s2.pageOf(100, 800), { col: 0, row: 1 });
assert.deepStrictEqual(s2.pageOf(9999, 9999), { col: 1, row: 1 });
assert.deepStrictEqual(s2.pageLocal(1300, 800), { col: 1, row: 1, x: 20, y: 80 });
assert.deepStrictEqual(s2.pageBounds(1, 1), { x: 1280, y: 720, width: 1280, height: 720 });
const n0 = s2.addObject('sq', 200, 200); // page (0,0)
const n1 = s2.addObject('sq', 1480, 200); // page (1,0), same local x as n0
const l0 = laneRow(s2);
const rows = s2.buildLivePositionSchema().Values;
assert.deepStrictEqual(rows[0].slice(12, 14), rows[1].slice(12, 14)); // identical per-page lane/row
assert.strictEqual(rows[0][12], 1); // 200 / 160 = lane 1
const meta = s2.buildCanvasMetaEntityDoc();
assert.strictEqual(meta.Fields.length, 13);
assert.deepStrictEqual(meta.Values[0].slice(8), [2, 2560, 1440, 2, 2]);
// Cross-seam move keeps continuous coordinates
const moved = s2.moveObject(n0.id, 1000, 200);
assert.strictEqual(moved.cx, 1000);
// Round trip
const s2b = core.createCanvasStore({ canvasMode: 2 });
assert(s2b.importMfdb132(s2.buildMfdb132Package()).ok);
assert.strictEqual(s2b.state.shapes.length, 2);
assert.deepStrictEqual(s2b.pageOf(1480, 200), { col: 1, row: 0 });
// Custom page grid
const s3 = core.createCanvasStore({ canvasMode: 2, pageCols: 3, pageRows: 1, pageWidth: 800, pageHeight: 600 });
assert.strictEqual(s3.state.stageWidth, 2400); assert.strictEqual(s3.state.stageHeight, 600);
console.log('✓ Mode 2: pages, per-page lanes, 13-field meta, seam move, round trip, custom grid.');
console.log('--- All Canvas Mode Tests Passed Successfully! ---');
