/**
 * Test Suite:      test_canvas_flow_modes.js
 * Family:          Canvas_Flow
 * Description:     Flow behaviour under canvas_mode 0 / 1 / 2: single stage source, Start/End placement,
 *                  export/import round trip, validation, and CLI init.
 * Author:          Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * License:         PolyForm Noncommercial 1.0.0
 * RELATIONAL_ID:   b2e94d17-3a60-4f8c-8d15-7c1e5a9f0d23
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const flow = require('../lib_bejson_Canvas_Flow_core.js');

const startEnd = (s) => {
  const n = s.getNodes();
  const a = n.find(x => x.type === 'start'), b = n.find(x => x.type === 'end');
  return [a.cx, a.cy, b.cx, b.cy];
};

// Mode 0 default: unchanged geometry and unchanged export keys
const s0 = flow.createFlowStore({ name: 'm0' }); s0.createNewFile('m0');
assert.deepStrictEqual(startEnd(s0), [320, 360, 960, 360]);
assert.strictEqual(s0.exportBejson().Canvas_Mode, undefined);
console.log('✓ Mode 0: Start/End at legacy positions; no Canvas_Mode key exported.');

// Mode 1: stage is the world; viewport hints cannot change it
const s1 = flow.createFlowStore({ name: 'm1', canvasMode: 1, stageWidth: 800, stageHeight: 500 });
assert.strictEqual(s1.state.stageWidth, 2560);
s1.createNewFile('m1', 400, 300);
assert.strictEqual(s1.state.stageWidth, 2560);
s1.setStageMetrics(390, 700);
assert.strictEqual(s1.state.stageWidth, 2560);
assert.deepStrictEqual(startEnd(s1), [640, 720, 1920, 720]);
assert.strictEqual(s1.validate().valid, true);
console.log('✓ Mode 1: single stage source (world 2560x1440), viewport hints ignored.');

// Mode 2: Start/End inside page (0,0); insert node, round trip, validate
const s2 = flow.createFlowStore({ name: 'm2', canvasMode: 2 });
s2.createNewFile('m2');
assert.strictEqual(s2.state.stageWidth, 2560); assert.strictEqual(s2.state.stageHeight, 1440);
assert.deepStrictEqual(startEnd(s2), [320, 360, 960, 360]);
const conn = s2.getConnectors()[0];
s2.addNodeOnConnector(conn.id, { label: 'Mid' });
assert.strictEqual(s2.validate().valid, true);
const doc = s2.exportBejson();
assert.strictEqual(doc.Canvas_Mode, 2); assert.strictEqual(doc.World_Width, 2560);
const back = flow.createFlowStore({ canvasMode: doc.Canvas_Mode });
back.importBejson(JSON.parse(JSON.stringify(doc)));
assert.strictEqual(back.getNodes().length, 3);
assert.strictEqual(back.state.stageWidth, 2560);
assert.strictEqual(back.validate().valid, true);
console.log('✓ Mode 2: Start/End in page (0,0), insert, export/import round trip, validation.');

// Mode 0 store loading a mode 2 doc keeps legacy bounds (no silent world change)
const legacy = flow.createFlowStore({}); legacy.importBejson(JSON.parse(JSON.stringify(doc)));
assert.strictEqual(legacy.state.canvasMode, 0);
console.log('✓ Mode 0 store opens a mode 2 file without changing its own mode.');

// CLI
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmodes-'));
const file = path.join(tmp, 'f.bejson');
const cli = path.join(__dirname, '..', 'flow_cli.js');
const run = (...a) => spawnSync(process.execPath, [cli, ...a], { encoding: 'utf8' });
let r = run('init', file, '--canvas-mode', '2');
assert.strictEqual(r.status, 0, r.stdout + r.stderr);
assert(/Canvas mode: 2/.test(r.stdout));
assert.strictEqual(JSON.parse(fs.readFileSync(file, 'utf8')).Canvas_Mode, 2);
r = run('validate', file); assert.strictEqual(r.status, 0, r.stdout + r.stderr);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('✓ CLI: init --canvas-mode 2 persists the mode and validates.');
console.log('--- All Canvas Flow Mode Tests Passed Successfully! ---');
