/**
 * Test Suite:      test_canvas_cli.js
 * Family:          Canvas
 * Module Tested:   canvas_cli.js
 * Description:     Unit and integration verification for Canvas CLI operations,
 *                  including initialization, shape placement with MTV collision resolution,
 *                  shape movement, modification, deletion, listing, and BEJSON/MFDB validation.
 * Author:          Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * License:         PolyForm Noncommercial 1.0.0
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cli = require('../canvas_cli.js');

console.log('--- Starting Universal Canvas CLI Test Suite ---');

const tmpTestFile = path.join(__dirname, 'temp_test_canvas.mfdb132.bejson');

// Cleanup any pre-existing temp file
if (fs.existsSync(tmpTestFile)) {
  fs.unlinkSync(tmpTestFile);
}

try {
  // 1. Test handleInit
  const initCode = cli.handleInit(tmpTestFile, {
    name: 'automated_test_canvas',
    width: '1000',
    height: '800'
  });
  assert.strictEqual(initCode, 0, 'handleInit should return exit code 0');
  assert.ok(fs.existsSync(tmpTestFile), 'Init should create target file on disk');

  const initialDoc = cli.readJsonFile(tmpTestFile);
  assert.strictEqual(initialDoc.Format, 'BEJSON');
  assert.strictEqual(initialDoc.Format_Version, '104a');
  console.log('✓ CLI Canvas init passed.');

  // 2. Test handleAdd (Placement)
  const add1Code = cli.handleAdd(tmpTestFile, {
    type: 'node',
    cx: '200',
    cy: '200',
    size: '64',
    label: 'Initial Node'
  });
  assert.strictEqual(add1Code, 0, 'handleAdd for node 1 should return exit code 0');

  const { store: s1 } = cli.loadStoreFromFile(tmpTestFile);
  assert.strictEqual(s1.state.shapes.length, 1);
  assert.strictEqual(s1.state.shapes[0].cx, 200);
  assert.strictEqual(s1.state.shapes[0].cy, 200);
  assert.strictEqual(s1.state.shapes[0].label, 'Initial Node');
  console.log('✓ CLI Canvas add shape passed.');

  // 3. Test handleAdd with Overlap (MTV Collision Resolution)
  const add2Code = cli.handleAdd(tmpTestFile, {
    type: 'node',
    cx: '200',
    cy: '200',
    size: '64',
    label: 'Overlapping Node'
  });
  assert.strictEqual(add2Code, 0, 'handleAdd for node 2 should return exit code 0');

  const { store: s2 } = cli.loadStoreFromFile(tmpTestFile);
  assert.strictEqual(s2.state.shapes.length, 2);
  const shape1 = s2.state.shapes[0];
  const shape2 = s2.state.shapes[1];

  // Verify MTV displacement occurred: shapes must NOT overlap
  const overlap = cli.CanvasCore.hasOverlap([shape1], shape2.cx, shape2.cy, shape2.size, -1);
  assert.strictEqual(overlap, false, 'MTV resolution must guarantee shapes do not overlap');
  console.log('✓ CLI Canvas placement MTV collision resolution passed.');

  // 4. Test handleMove (Movement Resolution)
  const moveCode = cli.handleMove(tmpTestFile, {
    id: '1',
    cx: '500',
    cy: '400'
  });
  assert.strictEqual(moveCode, 0, 'handleMove should return exit code 0');

  const { store: s3 } = cli.loadStoreFromFile(tmpTestFile);
  const moved1 = s3.state.shapes.find(function (s) { return s.id === 1; });
  assert.strictEqual(moved1.cx, 500);
  assert.strictEqual(moved1.cy, 400);
  console.log('✓ CLI Canvas shape movement passed.');

  // 5. Test handleModify
  const modCode = cli.handleModify(tmpTestFile, {
    id: '1',
    label: 'Modified Primary Node',
    size: '80'
  });
  assert.strictEqual(modCode, 0, 'handleModify should return exit code 0');

  const { store: s4 } = cli.loadStoreFromFile(tmpTestFile);
  const mod1 = s4.state.shapes.find(function (s) { return s.id === 1; });
  assert.strictEqual(mod1.label, 'Modified Primary Node');
  assert.strictEqual(mod1.size, 80);
  console.log('✓ CLI Canvas shape modification passed.');

  // 6. Test handleValidate
  const valCode = cli.handleValidate(tmpTestFile, {});
  assert.strictEqual(valCode, 0, 'handleValidate should pass for valid canvas document');
  console.log('✓ CLI Canvas BEJSON and MFDB validation passed.');

  // 7. Test handleDelete
  const delCode = cli.handleDelete(tmpTestFile, { id: '2' });
  assert.strictEqual(delCode, 0, 'handleDelete should return exit code 0');

  const { store: s5 } = cli.loadStoreFromFile(tmpTestFile);
  assert.strictEqual(s5.state.shapes.length, 1);
  assert.strictEqual(s5.state.shapes[0].id, 1);
  console.log('✓ CLI Canvas shape deletion passed.');

  // 8. Test handleInfo
  const infoCode = cli.handleInfo(tmpTestFile, { json: true });
  assert.strictEqual(infoCode, 0, 'handleInfo should return exit code 0');
  console.log('✓ CLI Canvas info/metrics check passed.');

  console.log('--- All Universal Canvas CLI Tests Passed Successfully! ---');
} finally {
  if (fs.existsSync(tmpTestFile)) {
    fs.unlinkSync(tmpTestFile);
  }
}
