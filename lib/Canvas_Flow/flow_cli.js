#!/usr/bin/env node
/**
 * Script Name:    flow_cli.js
 * Description:    49-Column CLI tool for BEJSON Canvas Flow lifecycle, node insertion,
 *                 preset fields, custom constant fields, stop conditions, loopback routing,
 *                 and flow traversal simulation.
 * Version:        1.0.0
 * Date Created:   2026-11-22
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * Format_Creator: Elton Boehnen
 * RELATIONAL_ID:  2c8a71e5-9b13-4c22-8f64-7d1e90a3b521
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const Core = require('../Core/lib_bejson_Core_bejson_core.js');
const Validator = require('../Core/lib_bejson_Core_bejson_validator.js');
const FlowCore = require('./lib_bejson_Canvas_Flow_core.js');
const FlowPresets = require('./lib_bejson_Canvas_Flow_presets.js');

const DIVIDER_49 = '='.repeat(49);
const DIVIDER_DASH_49 = '-'.repeat(49);

const EXIT_OK = 0;
const EXIT_OP_ERROR = 1;
const EXIT_SYNTAX_ERROR = 2;

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
  return JSON.parse(fs.readFileSync(resolved, 'utf8'));
}

function loadFlowFromFile(filePath) {
  const doc = readJsonFile(filePath);
  const store = FlowCore.createFlowStore();
  store.importBejson(doc);
  return { store, doc };
}

function saveFlowToFile(filePath, store) {
  const doc = store.exportBejson();
  atomicWriteJson(filePath, doc);
  return doc;
}

function parseArgs(args) {
  const parsed = { command: null, targetFile: null, options: {} };
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
    } else if (arg === '-h') {
      parsed.options.help = true;
      i += 1;
    } else if (arg === '-j') {
      parsed.options.json = true;
      i += 1;
    } else {
      if (!parsed.command) parsed.command = arg.toLowerCase();
      else if (!parsed.targetFile) parsed.targetFile = arg;
      i += 1;
    }
  }
  return parsed;
}

function printHeader(title) {
  console.log(DIVIDER_49);
  console.log(` ${title}`.slice(0, 49));
  console.log(DIVIDER_49);
}

function printFeedback(ok, message) {
  const prefix = ok ? '[OK]' : '[!!]';
  console.log(`${prefix} ${message}`);
}

function handleInit(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing <file> path.');
    return EXIT_SYNTAX_ERROR;
  }
  const name = options.name || path.basename(filePath, path.extname(filePath));
  const width = parseInt(options.width || 1280, 10);
  const height = parseInt(options.height || 720, 10);

  const store = FlowCore.createFlowStore({ name, stageWidth: width, stageHeight: height });
  const doc = saveFlowToFile(filePath, store);

  if (options.json) {
    console.log(JSON.stringify({ status: 'ok', file: filePath, flowName: doc.Flow_Name, nodes: store.getNodes().length }, null, 2));
  } else {
    printHeader('BEJSON FLOW INITIALIZED');
    printFeedback(true, `Flow saved: ${path.basename(filePath)}`);
    console.log(`  Name       : ${doc.Flow_Name}`);
    console.log(`  Stage      : ${width}x${height} px`);
    console.log(`  Nodes      : ${store.getNodes().length} (Start -> End)`);
    console.log(`  Connectors : ${store.getConnectors().length}`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

function handleAddNode(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing <file> path.');
    return EXIT_SYNTAX_ERROR;
  }
  const { store } = loadFlowFromFile(filePath);
  const connectors = store.getConnectors();
  const connectorId = options.connector !== undefined
    ? Number(options.connector)
    : (connectors[connectors.length - 1] ? connectors[connectors.length - 1].id : 1);
  const anchorIndex = options.anchor !== undefined ? Number(options.anchor) : 0;
  const type = String(options.type || 'shape').toLowerCase();
  const label = options.label || `${type}_${store.state.nextId}`;

  let res;
  if (type === 'redirect') {
    res = store.addRedirectNodeOnConnector(connectorId, {
      label: label,
      featureFlag: options.flag || 'feature_active',
      anchorIndex: anchorIndex
    });
  } else if (type === 'variable') {
    res = store.addVariableNodeOnConnector(connectorId, {
      label: label,
      variableName: options.var || 'counter_var',
      mode: options.mode || 'counter',
      initialValue: options.initial !== undefined ? Number(options.initial) : 0,
      incrementBy: options.step !== undefined ? Number(options.step) : 1,
      anchorIndex: anchorIndex
    });
  } else if (type === 'loopback') {
    res = store.addLoopbackNodeOnConnector(connectorId, {
      label: label,
      loopbackTargetId: options.target !== undefined ? Number(options.target) : undefined,
      loopCountMax: options.loops !== undefined ? Number(options.loops) : 2,
      anchorIndex: anchorIndex
    });
  } else {
    res = store.addNodeOnConnector(connectorId, {
      type: 'shape',
      label: label,
      anchorIndex: anchorIndex
    });
  }

  saveFlowToFile(filePath, store);

  if (options.json) {
    console.log(JSON.stringify({ status: 'ok', node: res.newNode }, null, 2));
  } else {
    printHeader('FLOW NODE INSERTED');
    printFeedback(true, `Inserted [${res.newNode.id}] ${res.newNode.label}`);
    console.log(`  Type   : ${res.newNode.type}`);
    console.log(`  Center : (${res.newNode.cx}, ${res.newNode.cy})`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

function handleAddPreset(filePath, options) {
  if (!filePath || options.id === undefined || !options.preset) {
    printFeedback(false, 'Required: <file> --id <nodeId> --preset <name> [--value <val>]');
    return EXIT_SYNTAX_ERROR;
  }
  const { store } = loadFlowFromFile(filePath);
  const entry = store.addOrUpdatePresetField(Number(options.id), options.preset, options.value);
  saveFlowToFile(filePath, store);

  if (options.json) {
    console.log(JSON.stringify({ status: 'ok', nodeId: Number(options.id), preset: entry }, null, 2));
  } else {
    printHeader('PRESET FIELD UPDATED');
    printFeedback(true, `Node ${options.id}: ${entry.name} = ${entry.value}`);
    console.log(`  Role : ${entry.role} (${entry.type})`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

function handleAddCustom(filePath, options) {
  if (!filePath || options.id === undefined || !options.name) {
    printFeedback(false, 'Required: <file> --id <nodeId> --name <field> [--type <type>] [--value <val>]');
    return EXIT_SYNTAX_ERROR;
  }
  const { store } = loadFlowFromFile(filePath);
  const entry = store.addOrUpdateCustomField(
    Number(options.id),
    options.name,
    options.type || 'string',
    options.value !== undefined ? options.value : ''
  );
  saveFlowToFile(filePath, store);

  if (options.json) {
    console.log(JSON.stringify({ status: 'ok', nodeId: Number(options.id), customField: entry }, null, 2));
  } else {
    printHeader('CUSTOM CONSTANT FIELD SET');
    printFeedback(true, `Node ${options.id}: ${entry.name} (${entry.type})`);
    console.log(`  Value : ${JSON.stringify(entry.value)}`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

function handleSetStop(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Required: <file> --condition <always|time_running|variable_equals|variable_gte>');
    return EXIT_SYNTAX_ERROR;
  }
  const { store } = loadFlowFromFile(filePath);
  const stopCond = store.setEndNodeStopCondition(options.id ? Number(options.id) : null, {
    type: options.condition || 'always',
    variableName: options.var || '',
    targetValue: options.target !== undefined ? options.target : '',
    maxTimeMs: options.time !== undefined ? Number(options.time) : 0
  });
  saveFlowToFile(filePath, store);

  if (options.json) {
    console.log(JSON.stringify({ status: 'ok', stopCondition: stopCond }, null, 2));
  } else {
    printHeader('END NODE STOP CONDITION');
    printFeedback(true, `Condition: ${stopCond.type}`);
    if (stopCond.variableName) console.log(`  Variable : ${stopCond.variableName} -> ${stopCond.targetValue}`);
    if (stopCond.maxTimeMs) console.log(`  Max Time : ${stopCond.maxTimeMs} ms`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

function handleSimulate(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing <file> path.');
    return EXIT_SYNTAX_ERROR;
  }
  const { store } = loadFlowFromFile(filePath);
  const initialCtx = options.context ? JSON.parse(options.context) : {};
  if (options.time !== undefined) initialCtx.time_running = Number(options.time);

  const result = store.simulateFlow(initialCtx);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.success ? EXIT_OK : EXIT_OP_ERROR;
  }

  printHeader('FLOW SIMULATION REPORT');
  printFeedback(result.success, result.success ? 'FLOW COMPLETED & STOP MET' : (result.error || 'STOP NOT MET'));
  console.log(`  Steps Executed : ${result.stepLog.length}`);
  console.log(`  Stop Met       : ${result.stopConditionMet}`);
  console.log(DIVIDER_DASH_49);
  result.stepLog.forEach(function (s) {
    console.log(`  #${s.step} [${s.nodeId}] ${s.label} (${s.type})`.slice(0, 49));
  });
  console.log(DIVIDER_49);
  return result.success ? EXIT_OK : EXIT_OP_ERROR;
}

function handleList(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing <file> path.');
    return EXIT_SYNTAX_ERROR;
  }
  const { store } = loadFlowFromFile(filePath);
  const nodes = store.getNodes();
  const connectors = store.getConnectors();

  if (options.json) {
    console.log(JSON.stringify({ flowName: store.state.name, nodes, connectors }, null, 2));
    return EXIT_OK;
  }

  printHeader(`FLOW NODES (${nodes.length}) & EDGES (${connectors.length})`);
  nodes.forEach(function (n) {
    console.log(` [${n.id}] ${n.label} (${n.type.toUpperCase()}) @ (${n.cx},${n.cy})`.slice(0, 49));
    console.log(`     Presets: ${n.presetFields.length} | Custom: ${n.customFields.length}`.slice(0, 49));
  });
  console.log(DIVIDER_DASH_49);
  connectors.forEach(function (c) {
    const tag = c.isLoopback ? `LOOP (${c.anchorPoints.length} anchors)` : 'EDGE';
    console.log(` (${c.id}) ${c.sourceId} -> ${c.targetId} [${tag}]`.slice(0, 49));
  });
  console.log(DIVIDER_49);
  return EXIT_OK;
}

function handleValidate(filePath, options) {
  if (!filePath) {
    printFeedback(false, 'Missing <file> path.');
    return EXIT_SYNTAX_ERROR;
  }
  const { store, doc } = loadFlowFromFile(filePath);
  const bejsonRes = Validator.validate_bejson(doc);
  const flowRes = store.validate();
  const valid = bejsonRes.valid && flowRes.valid;

  if (options.json) {
    console.log(JSON.stringify({ valid, bejson: bejsonRes, flow: flowRes }, null, 2));
    return valid ? EXIT_OK : EXIT_OP_ERROR;
  }

  printHeader('FLOW VALIDATION AUDIT');
  printFeedback(valid, valid ? '100% VALID BEJSON 104a FLOW' : 'VALIDATION ERRORS FOUND');
  console.log(`  BEJSON 104a : ${bejsonRes.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  Flow Graph  : ${flowRes.valid ? 'PASS' : 'FAIL'}`);
  console.log(DIVIDER_49);
  return valid ? EXIT_OK : EXIT_OP_ERROR;
}

function handleExportNodeOptions(filePath, options) {
  if (!filePath || options.id === undefined) {
    printFeedback(false, 'Required: <file> --id <nodeId> [--output <schemaFile>]');
    return EXIT_SYNTAX_ERROR;
  }
  const { store } = loadFlowFromFile(filePath);
  const schemaDoc = store.exportNodeOptionsSchema(Number(options.id));
  const bejsonCheck = Validator.validate_bejson(schemaDoc);
  if (!bejsonCheck.valid) {
    printFeedback(false, 'Sanitized Node Options Schema failed BEJSON 104a validation.');
    return EXIT_OP_ERROR;
  }

  if (options.output) {
    atomicWriteJson(options.output, schemaDoc);
  }

  if (options.json) {
    console.log(JSON.stringify(schemaDoc, null, 2));
  } else {
    printHeader('SANITIZED NODE OPTIONS EXPORT');
    printFeedback(true, `Node [${options.id}] options schema exported`);
    console.log(`  Node Type  : ${schemaDoc.Node_Type}`);
    console.log(`  Fields     : ${schemaDoc.Values.length} definitions (0 UUIDs/values)`);
    if (options.output) console.log(`  Output     : ${path.basename(options.output)}`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

function handleImportNodeOptions(filePath, options) {
  if (!filePath || options.id === undefined || !options.schema) {
    printFeedback(false, 'Required: <file> --id <nodeId> --schema <schemaFile>');
    return EXIT_SYNTAX_ERROR;
  }
  const { store } = loadFlowFromFile(filePath);
  const schemaDoc = readJsonFile(options.schema);
  const res = store.importNodeOptionsSchema(Number(options.id), schemaDoc, {
    replace: Boolean(options.replace)
  });
  saveFlowToFile(filePath, store);

  if (options.json) {
    console.log(JSON.stringify({ status: 'ok', ...res }, null, 2));
  } else {
    printHeader('SANITIZED NODE OPTIONS IMPORT');
    printFeedback(true, `Applied schema to Node [${res.nodeId}]`);
    console.log(`  Presets : ${res.presetCount}`);
    console.log(`  Custom  : ${res.customCount}`);
    console.log(DIVIDER_49);
  }
  return EXIT_OK;
}

function handleHelp() {
  printHeader('BEJSON FLOW CLI · ENGINE');
  console.log(' Usage: node flow_cli.js <cmd> <file> [opts]\n');
  console.log(' Commands:');
  console.log('   init <file>                 Create new flow');
  console.log('   add-node <file>             Insert node');
  console.log('   add-preset <file>           Add preset field');
  console.log('   add-custom <file>           Add custom field');
  console.log('   set-stop <file>             Set stop cond');
  console.log('   export-node-options <file>  Export node opts');
  console.log('   import-node-options <file>  Import node opts');
  console.log('   simulate <file>             Run traversal');
  console.log('   list <file>                 List nodes/edges');
  console.log('   validate <file>             Validate flow');
  console.log(DIVIDER_49);
  return EXIT_OK;
}

function main(argv) {
  const parsed = parseArgs(argv.slice(2));
  if (!parsed.command || parsed.options.help) {
    return handleHelp();
  }
  try {
    switch (parsed.command) {
      case 'init': return handleInit(parsed.targetFile, parsed.options);
      case 'add-node': return handleAddNode(parsed.targetFile, parsed.options);
      case 'add-preset': return handleAddPreset(parsed.targetFile, parsed.options);
      case 'add-custom': return handleAddCustom(parsed.targetFile, parsed.options);
      case 'set-stop': return handleSetStop(parsed.targetFile, parsed.options);
      case 'export-node-options': return handleExportNodeOptions(parsed.targetFile, parsed.options);
      case 'import-node-options': return handleImportNodeOptions(parsed.targetFile, parsed.options);
      case 'simulate': return handleSimulate(parsed.targetFile, parsed.options);
      case 'list': return handleList(parsed.targetFile, parsed.options);
      case 'validate': return handleValidate(parsed.targetFile, parsed.options);
      default:
        printFeedback(false, `Unknown command: ${parsed.command}`);
        return EXIT_SYNTAX_ERROR;
    }
  } catch (err) {
    printFeedback(false, err.message);
    return EXIT_OP_ERROR;
  }
}

if (require.main === module) {
  process.exit(main(process.argv));
} else {
  module.exports = {
    main,
    FlowCore,
    FlowPresets,
    Core,
    Validator
  };
}
