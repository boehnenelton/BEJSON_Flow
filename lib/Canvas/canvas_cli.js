#!/usr/bin/env node
/**
 * Script Name:    canvas_cli.js
 * Description:    CLI tool for Universal Canvas shape placement, movement, and MFDB-132 lifecycle.
 * Version:        1.0.0
 * Date Created:   2026-11-21
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * Format_Creator: Elton Boehnen
 * RELATIONAL_ID:  5a2fd9b0-eb6b-43c1-a47f-89469bc773b8
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 1. Authoritative Core & Validator Imports
// ---------------------------------------------------------------------------
// JS Core: Field-map caching, serialization, and BEJSON primitives
const Core = require('../Core/lib_bejson_Core_bejson_core.js');

// JS Validator: Structural integrity, positional types, mandatory keys
const Validator = require('../Core/lib_bejson_Core_bejson_validator.js');

// Canvas Core: Reactive store, MTV collision engine, 8-lane/Ry=32 spatial math, MFDB-132 packaging
const CanvasCore = require('./lib_bejson_canvas_core.js');

// Canvas Schemas & Validator: 105a canvas configs and capture schemas
const CanvasSchemas = require('./lib_bejson_Canvas_canvas_schemas.js');

// ---------------------------------------------------------------------------
// 2. Constants & Terminal 49-Column Mobile Discipline
// ---------------------------------------------------------------------------
const DIVIDER_49 = '='.repeat(49);
const DIVIDER_DASH_49 = '-'.repeat(49);
const DEFAULT_STAGE_WIDTH = 1280;
const DEFAULT_STAGE_HEIGHT = 720;
const DEFAULT_SHAPE_SIZE = 64;
const DEFAULT_SHAPE_TYPE = 'square';

// POSIX Exit Codes
const EXIT_OK = 0;
const EXIT_OP_ERROR = 1;
const EXIT_SYNTAX_ERROR = 2;

// ---------------------------------------------------------------------------
// 3. I/O & Atomic Persistence Helpers
// ---------------------------------------------------------------------------
function atomicWriteJson(targetPath, data) {
  const resolved = path.resolve(targetPath);
  const tempPath = `${resolved}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const content = JSON.stringify(data, null, 2) + '\n';
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, resolved);
}

function readJsonFile(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File does not exist: ${resolved}`);
  }
  const content = fs.readFileSync(resolved, 'utf8');
  return JSON.parse(content);
}

// ---------------------------------------------------------------------------
// 4. CLI Argument Parser (Flag & Subcommand Router)
// ---------------------------------------------------------------------------
function parseArgs(args) {
  const parsed = {
    command: null,
    targetFile: null,
    options: {}
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        parsed.options[key] = args[i + 1];
        i += 2;
      } else {
        parsed.options[key] = true;
        i += 1;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      if (key === 'h') {
        parsed.options['help'] = true;
      } else if (key === 'j') {
        parsed.options['json'] = true;
      } else {
        parsed.options[key] = true;
      }
      i += 1;
    } else {
      if (!parsed.command) {
        parsed.command = arg.toLowerCase();
      } else if (!parsed.targetFile) {
        parsed.targetFile = arg;
      }
      i += 1;
    }
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// 5. Loaded Store Loader
// ---------------------------------------------------------------------------
function loadStoreFromFile(filePath) {
  const doc = readJsonFile(filePath);
  const store = CanvasCore.createCanvasStore();
  const importResult = store.importMfdb132(doc);
  if (!importResult.ok) {
    throw new Error(`Failed to import MFDB-132: ${(importResult.errors || []).join('; ')}`);
  }
  return { store, doc, importResult };
}

// ---------------------------------------------------------------------------
// 6. Formatting & 49-Column Output Helpers
// ---------------------------------------------------------------------------
function printHeader(title) {
  console.log(DIVIDER_49);
  console.log(` ${title}`);
  console.log(DIVIDER_49);
}

function printFeedback(ok, message) {
  const prefix = ok ? '[✓]' : '[!]';
  console.log(`${prefix} ${message}`);
}

function formatShapeDetails(shape, stageWidth) {
  const sw = stageWidth || DEFAULT_STAGE_WIDTH;
  const laneWidth = sw / CanvasCore.BEHTML_LANES;
  const lane = Math.floor(shape.cx / laneWidth);
  const row = Math.floor(shape.cy / CanvasCore.BEHTML_RY);

  return [
    `  ID        : ${shape.id}`,
    `  Entity    : ${shape.entityName || CanvasCore.makeEntityName(shape.type, shape.id)}`,
    `  Type      : ${shape.type}`,
    `  Label     : ${shape.label || (shape.type + ' ' + shape.id)}`,
    `  Center    : (${Math.round(shape.cx)}, ${Math.round(shape.cy)})`,
    `  Size      : ${shape.size}px`,
    `  8-Lane    : Lane ${lane} of ${CanvasCore.BEHTML_LANES}`,
    `  Ry-32     : Row ${row} (32px vertical rhythm)`,
    `  Updated   : ${shape.updatedAt || 'N/A'}`
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 7. Command Handlers
// ---------------------------------------------------------------------------

/**
 * Command: init <file> [--name <name>] [--width <w>] [--height <h>]
 */
function handleInit(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing required argument: <file>');
    return EXIT_SYNTAX_ERROR;
  }

  const rawName = options['name'] || path.basename(filePath, path.extname(filePath));
  const dbName = CanvasCore.sanitizeDbName(rawName);
  const width = parseInt(options['width'] || DEFAULT_STAGE_WIDTH, 10);
  const height = parseInt(options['height'] || DEFAULT_STAGE_HEIGHT, 10);

  const store = CanvasCore.createCanvasStore();
  store.createNewFile(dbName, width, height);

  const pkg = store.buildMfdb132Package();

  // Validate package with Core BEJSON validator
  const bejsonCheck = Validator.validate_bejson(pkg);
  if (!bejsonCheck.valid) {
    printFeedback(false, `BEJSON validation failed: ${JSON.stringify(bejsonCheck.errors)}`);
    return EXIT_OP_ERROR;
  }

  // Validate package with Canvas Store validator
  const canvasCheck = store.validateMfdb132(pkg);
  if (!canvasCheck.valid) {
    printFeedback(false, `MFDB-132 validation failed: ${(canvasCheck.errors || []).join('; ')}`);
    return EXIT_OP_ERROR;
  }

  atomicWriteJson(filePath, pkg);

  if (options['json']) {
    console.log(JSON.stringify({ status: 'ok', file: filePath, dbName, width, height }, null, 2));
  } else {
    printHeader('CANVAS INITIALIZED');
    printFeedback(true, 'CANVAS MFDB-132 CREATED SUCCESSFULLY');
    console.log(`  File   : ${filePath}`);
    console.log(`  Name   : ${dbName}`);
    console.log(`  Stage  : ${width}x${height} px`);
    console.log(`  Lanes  : ${CanvasCore.BEHTML_LANES} lanes (${width / CanvasCore.BEHTML_LANES} px/lane)`);
    console.log(`  Rhythm : Ry = ${CanvasCore.BEHTML_RY} px`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

/**
 * Command: add <file> --type <type> --cx <x> --cy <y> [--size <s>] [--label <l>]
 */
function handleAdd(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing required argument: <file>');
    return EXIT_SYNTAX_ERROR;
  }
  if (options['cx'] === undefined || options['cy'] === undefined) {
    printFeedback(false, 'Missing required placement coordinates: --cx and --cy');
    return EXIT_SYNTAX_ERROR;
  }

  const { store } = loadStoreFromFile(filePath);
  const targetCx = parseFloat(options['cx']);
  const targetCy = parseFloat(options['cy']);
  const size = parseFloat(options['size'] || DEFAULT_SHAPE_SIZE);
  const type = options['type'] || DEFAULT_SHAPE_TYPE;

  const initialOverlap = CanvasCore.hasOverlap(store.state.shapes, targetCx, targetCy, size, -1);

  // Add shape using CanvasCore placement engine (resolveDropPosition with MTV collision avoidance)
  const newShape = store.addObject(
    type,
    targetCx,
    targetCy,
    size,
    store.state.stageWidth,
    store.state.stageHeight
  );

  if (!newShape) {
    printFeedback(false, 'Failed to place shape on stage (out of bounds or unresolvable collision).');
    return EXIT_OP_ERROR;
  }

  if (options['label']) {
    newShape.label = String(options['label']).trim();
  }

  // Package and validate
  const pkg = store.buildMfdb132Package();
  const bejsonCheck = Validator.validate_bejson(pkg);
  const canvasCheck = store.validateMfdb132(pkg);

  if (!bejsonCheck.valid || !canvasCheck.valid) {
    printFeedback(false, 'Post-mutation validation failed.');
    return EXIT_OP_ERROR;
  }

  atomicWriteJson(filePath, pkg);

  if (options['json']) {
    console.log(JSON.stringify({ status: 'ok', shape: newShape, mtvResolved: initialOverlap }, null, 2));
  } else {
    printHeader('SHAPE PLACEMENT CONFIRMED');
    printFeedback(true, 'SHAPE CREATED SUCCESSFULLY');
    console.log(formatShapeDetails(newShape, store.state.stageWidth));
    if (initialOverlap) {
      console.log(DIVIDER_DASH_49);
      console.log(`  [i] MTV Collision Resolution applied.`);
      console.log(`      Requested : (${targetCx}, ${targetCy})`);
      console.log(`      Placed    : (${Math.round(newShape.cx)}, ${Math.round(newShape.cy)})`);
    }
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

/**
 * Command: move <file> --id <id> --cx <x> --cy <y>
 */
function handleMove(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing required argument: <file>');
    return EXIT_SYNTAX_ERROR;
  }
  if (options['id'] === undefined || options['cx'] === undefined || options['cy'] === undefined) {
    printFeedback(false, 'Missing required arguments: --id, --cx, and --cy');
    return EXIT_SYNTAX_ERROR;
  }

  const { store } = loadStoreFromFile(filePath);
  const targetId = parseInt(options['id'], 10);
  const targetCx = parseFloat(options['cx']);
  const targetCy = parseFloat(options['cy']);

  const existing = store.state.shapes.find(function (s) { return s.id === targetId; });
  if (!existing) {
    printFeedback(false, `Shape ID ${targetId} not found on canvas.`);
    return EXIT_OP_ERROR;
  }

  const prevCx = existing.cx;
  const prevCy = existing.cy;

  // Move shape using resolveDragPosition MTV collision avoidance
  const moved = store.moveObject(
    targetId,
    targetCx,
    targetCy,
    store.state.stageWidth,
    store.state.stageHeight
  );

  if (!moved) {
    printFeedback(false, `Failed to move shape ${targetId}.`);
    return EXIT_OP_ERROR;
  }

  const pkg = store.buildMfdb132Package();
  const bejsonCheck = Validator.validate_bejson(pkg);
  const canvasCheck = store.validateMfdb132(pkg);

  if (!bejsonCheck.valid || !canvasCheck.valid) {
    printFeedback(false, 'Post-move validation failed.');
    return EXIT_OP_ERROR;
  }

  atomicWriteJson(filePath, pkg);

  if (options['json']) {
    console.log(JSON.stringify({
      status: 'ok',
      shape: moved,
      previous: { cx: prevCx, cy: prevCy },
      requested: { cx: targetCx, cy: targetCy }
    }, null, 2));
  } else {
    printHeader('SHAPE MOVEMENT RESOLVED');
    printFeedback(true, 'SHAPE MOVED SUCCESSFULLY');
    console.log(formatShapeDetails(moved, store.state.stageWidth));
    console.log(DIVIDER_DASH_49);
    console.log(`  Origin    : (${Math.round(prevCx)}, ${Math.round(prevCy)})`);
    console.log(`  Requested : (${targetCx}, ${targetCy})`);
    console.log(`  Resolved  : (${Math.round(moved.cx)}, ${Math.round(moved.cy)})`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

/**
 * Command: modify <file> --id <id> [--cx <x>] [--cy <y>] [--size <s>] [--label <l>] [--type <t>]
 */
function handleModify(filePath, options) {
  if (!filePath || options['id'] === undefined) {
    printFeedback(false, 'Missing required arguments: <file> and --id');
    return EXIT_SYNTAX_ERROR;
  }

  const { store } = loadStoreFromFile(filePath);
  const targetId = parseInt(options['id'], 10);
  const shape = store.state.shapes.find(function (s) { return s.id === targetId; });
  if (!shape) {
    printFeedback(false, `Shape ID ${targetId} not found.`);
    return EXIT_OP_ERROR;
  }

  store.snapshot();

  if (options['label']) {
    shape.label = String(options['label']).trim();
  }
  if (options['type']) {
    shape.type = String(options['type']).trim();
    shape.entityName = CanvasCore.makeEntityName(shape.type, shape.id);
  }
  if (options['size'] !== undefined) {
    shape.size = parseFloat(options['size']);
  }

  // If cx or cy given, resolve movement
  if (options['cx'] !== undefined || options['cy'] !== undefined) {
    const newCx = (options['cx'] !== undefined) ? parseFloat(options['cx']) : shape.cx;
    const newCy = (options['cy'] !== undefined) ? parseFloat(options['cy']) : shape.cy;
    store.moveObject(targetId, newCx, newCy, store.state.stageWidth, store.state.stageHeight);
  }

  shape.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const pkg = store.buildMfdb132Package();
  const bejsonCheck = Validator.validate_bejson(pkg);
  const canvasCheck = store.validateMfdb132(pkg);

  if (!bejsonCheck.valid || !canvasCheck.valid) {
    printFeedback(false, 'Post-modify validation failed.');
    return EXIT_OP_ERROR;
  }

  atomicWriteJson(filePath, pkg);

  if (options['json']) {
    console.log(JSON.stringify({ status: 'ok', shape }, null, 2));
  } else {
    printHeader('SHAPE MODIFICATION CONFIRMED');
    printFeedback(true, 'SHAPE UPDATED SUCCESSFULLY');
    console.log(formatShapeDetails(shape, store.state.stageWidth));
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

/**
 * Command: list <file> [--json]
 */
function handleList(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing required argument: <file>');
    return EXIT_SYNTAX_ERROR;
  }

  const { store } = loadStoreFromFile(filePath);
  const shapes = store.state.shapes || [];

  if (options['json']) {
    console.log(JSON.stringify({
      dbName: store.state.dbName,
      stageWidth: store.state.stageWidth,
      stageHeight: store.state.stageHeight,
      shapeCount: shapes.length,
      shapes: shapes
    }, null, 2));
    return EXIT_OK;
  }

  printHeader(`CANVAS SHAPES (${shapes.length})`);
  console.log(` Database: ${store.state.dbName} (${store.state.stageWidth}x${store.state.stageHeight})`);
  console.log(DIVIDER_DASH_49);

  if (shapes.length === 0) {
    console.log('  (No shapes registered on canvas)');
  } else {
    shapes.forEach(function (s, index) {
      console.log(formatShapeDetails(s, store.state.stageWidth));
      if (index < shapes.length - 1) {
        console.log(DIVIDER_DASH_49);
      }
    });
  }
  console.log(DIVIDER_49);
  return EXIT_OK;
}

/**
 * Command: get <file> --id <id> [--json]
 */
function handleGet(filePath, options) {
  if (!filePath || options['id'] === undefined) {
    printFeedback(false, 'Missing required arguments: <file> and --id');
    return EXIT_SYNTAX_ERROR;
  }

  const { store } = loadStoreFromFile(filePath);
  const targetId = parseInt(options['id'], 10);
  const shape = store.state.shapes.find(function (s) { return s.id === targetId; });

  if (!shape) {
    printFeedback(false, `Shape ID ${targetId} not found.`);
    return EXIT_OP_ERROR;
  }

  if (options['json']) {
    console.log(JSON.stringify(shape, null, 2));
  } else {
    printHeader(`SHAPE INSPECTION [ID: ${shape.id}]`);
    console.log(formatShapeDetails(shape, store.state.stageWidth));
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

/**
 * Command: delete <file> --id <id>
 */
function handleDelete(filePath, options) {
  if (!filePath || options['id'] === undefined) {
    printFeedback(false, 'Missing required arguments: <file> and --id');
    return EXIT_SYNTAX_ERROR;
  }

  const { store } = loadStoreFromFile(filePath);
  const targetId = parseInt(options['id'], 10);
  const ok = store.deleteObject(targetId);

  if (!ok) {
    printFeedback(false, `Shape ID ${targetId} not found.`);
    return EXIT_OP_ERROR;
  }

  const pkg = store.buildMfdb132Package();
  const bejsonCheck = Validator.validate_bejson(pkg);
  const canvasCheck = store.validateMfdb132(pkg);

  if (!bejsonCheck.valid || !canvasCheck.valid) {
    printFeedback(false, 'Post-delete validation failed.');
    return EXIT_OP_ERROR;
  }

  atomicWriteJson(filePath, pkg);

  if (options['json']) {
    console.log(JSON.stringify({ status: 'ok', deletedId: targetId }, null, 2));
  } else {
    printHeader('SHAPE REMOVAL CONFIRMED');
    printFeedback(true, `Shape ID ${targetId} deleted.`);
    console.log(` Remaining shapes: ${store.state.shapes.length}`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

/**
 * Command: validate <file>
 */
function handleValidate(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing required argument: <file>');
    return EXIT_SYNTAX_ERROR;
  }

  let doc;
  try {
    doc = readJsonFile(filePath);
  } catch (err) {
    printFeedback(false, `Failed to read file: ${err.message}`);
    return EXIT_OP_ERROR;
  }

  // 1. BEJSON JS Core structural validation
  const bejsonResult = Validator.validate_bejson(doc);

  // 2. Canvas Core MFDB-132 container validation
  const store = CanvasCore.createCanvasStore();
  const canvasResult = store.validateMfdb132(doc);

  const isValid = bejsonResult.valid && canvasResult.valid;

  if (options['json']) {
    console.log(JSON.stringify({
      valid: isValid,
      bejsonValidator: bejsonResult,
      canvasMfdbValidator: canvasResult
    }, null, 2));
    return isValid ? EXIT_OK : EXIT_OP_ERROR;
  }

  printHeader('CANVAS VALIDATION AUDIT');
  if (isValid) {
    printFeedback(true, 'VALIDATION PASSED: 100% CONFORMANT');
    console.log(`  BEJSON Core Check : PASS (Format: ${doc.Format_Version})`);
    console.log(`  MFDB-132 Package  : PASS (Manifest & Entities verified)`);
    console.log(`  Shapes In Store   : ${doc.Values ? doc.Values.length - 2 : 0}`);
  } else {
    printFeedback(false, 'VALIDATION FAILED: CONFORMANCE ERRORS');
    if (!bejsonResult.valid) {
      console.log('  BEJSON Errors:');
      (bejsonResult.errors || []).forEach(function (e) {
        console.log(`    - Code ${e.code}: ${e.message}`);
      });
    }
    if (!canvasResult.valid) {
      console.log('  MFDB-132 Errors:');
      (canvasResult.errors || []).forEach(function (e) {
        console.log(`    - ${e}`);
      });
    }
  }
  console.log(DIVIDER_49);
  return isValid ? EXIT_OK : EXIT_OP_ERROR;
}

/**
 * Command: info <file>
 */
function handleInfo(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing required argument: <file>');
    return EXIT_SYNTAX_ERROR;
  }

  const { store } = loadStoreFromFile(filePath);
  const shapes = store.state.shapes || [];

  // Check for any overlapping shapes
  let overlaps = 0;
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      if (CanvasCore.hasOverlap([shapes[j]], shapes[i].cx, shapes[i].cy, shapes[i].size, -1)) {
        overlaps++;
      }
    }
  }

  if (options['json']) {
    console.log(JSON.stringify({
      dbName: store.state.dbName,
      stageWidth: store.state.stageWidth,
      stageHeight: store.state.stageHeight,
      shapeCount: shapes.length,
      nextId: store.state.nextId,
      collisionOverlaps: overlaps
    }, null, 2));
    return EXIT_OK;
  }

  printHeader('CANVAS METRICS & STATUS');
  console.log(`  Database  : ${store.state.dbName}`);
  console.log(`  Stage Dim : ${store.state.stageWidth} x ${store.state.stageHeight} px`);
  console.log(`  Lanes     : ${CanvasCore.BEHTML_LANES} lanes (${store.state.stageWidth / CanvasCore.BEHTML_LANES} px/lane)`);
  console.log(`  Vertical  : Ry = ${CanvasCore.BEHTML_RY} px rhythm`);
  console.log(`  Shapes    : ${shapes.length} active`);
  console.log(`  Next ID   : ${store.state.nextId}`);
  console.log(`  Collisions: ${overlaps === 0 ? '0 (Fully MTV-Displaced)' : overlaps + ' ACTIVE OVERLAPS'}`);
  console.log(DIVIDER_49);
  return EXIT_OK;
}

/**
 * Command: export <file> [--output <out>]
 */
function handleExport(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing required argument: <file>');
    return EXIT_SYNTAX_ERROR;
  }

  const { store } = loadStoreFromFile(filePath);
  const schema = store.buildLivePositionSchema();
  const outputPath = options['output'];

  if (outputPath) {
    atomicWriteJson(outputPath, schema);
    printFeedback(true, `Live position schema exported to ${outputPath}`);
  } else {
    console.log(JSON.stringify(schema, null, 2));
  }
  return EXIT_OK;
}

/**
 * Command: help
 */
function handleHelp() {
  printHeader('CANVAS CLI · SHAPE & MOVEMENT ENGINE');
  console.log(' Usage: node canvas_cli.js <command> [options]\n');
  console.log(' Commands:');
  console.log('   init <file>     Initialize canvas MFDB-132');
  console.log('   add <file>      Add shape with MTV collision');
  console.log('   move <file>     Move shape to new (cx, cy)');
  console.log('   modify <file>   Modify shape attributes');
  console.log('   list <file>     List shapes on canvas');
  console.log('   get <file>      Inspect single shape');
  console.log('   delete <file>   Remove shape by id');
  console.log('   validate <file> Validate BEJSON & MFDB-132');
  console.log('   info <file>     Canvas metrics & status');
  console.log('   export <file>   Export live position schema\n');
  console.log(' Options:');
  console.log('   --cx <num>      Center X coordinate');
  console.log('   --cy <num>      Center Y coordinate');
  console.log('   --size <num>    Shape bounding size (px)');
  console.log('   --type <str>    Shape type (square, node)');
  console.log('   --label <str>   Human-readable label');
  console.log('   --id <num>      Target shape ID');
  console.log('   --name <str>    Canvas database name');
  console.log('   --width <num>   Stage width in px (1280)');
  console.log('   --height <num>  Stage height in px (720)');
  console.log('   --output <file> Destination output file');
  console.log('   --json          JSON machine output');
  console.log('   --help, -h      Show this help menu');
  console.log(DIVIDER_49);
  return EXIT_OK;
}

// ---------------------------------------------------------------------------
// 8. Main Entrypoint
// ---------------------------------------------------------------------------
function main(argv) {
  const parsed = parseArgs(argv.slice(2));

  if (!parsed.command || parsed.options['help']) {
    return handleHelp();
  }

  try {
    switch (parsed.command) {
      case 'init':
        return handleInit(parsed.targetFile, parsed.options);
      case 'add':
        return handleAdd(parsed.targetFile, parsed.options);
      case 'move':
        return handleMove(parsed.targetFile, parsed.options);
      case 'modify':
        return handleModify(parsed.targetFile, parsed.options);
      case 'list':
        return handleList(parsed.targetFile, parsed.options);
      case 'get':
        return handleGet(parsed.targetFile, parsed.options);
      case 'delete':
        return handleDelete(parsed.targetFile, parsed.options);
      case 'validate':
        return handleValidate(parsed.targetFile, parsed.options);
      case 'info':
      case 'status':
        return handleInfo(parsed.targetFile, parsed.options);
      case 'export':
        return handleExport(parsed.targetFile, parsed.options);
      default:
        printFeedback(false, `Unknown command: ${parsed.command}`);
        console.log(' Run with --help for command catalog.');
        return EXIT_SYNTAX_ERROR;
    }
  } catch (err) {
    printFeedback(false, `Execution fault: ${err.message}`);
    return EXIT_OP_ERROR;
  }
}

// ---------------------------------------------------------------------------
// 9. Module Exports & Execution
// ---------------------------------------------------------------------------
if (require.main === module) {
  const code = main(process.argv);
  process.exit(code);
} else {
  module.exports = {
    main,
    handleInit,
    handleAdd,
    handleMove,
    handleModify,
    handleList,
    handleGet,
    handleDelete,
    handleValidate,
    handleInfo,
    handleExport,
    loadStoreFromFile,
    atomicWriteJson,
    readJsonFile,
    Core,
    Validator,
    CanvasCore,
    CanvasSchemas
  };
}
