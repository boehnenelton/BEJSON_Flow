/**
 * Test Suite:      test_canvas_flow.js
 * Family:          Canvas_Flow
 * Description:     Unit tests verifying Canvas Flow Start/End node invariants,
 *                  center-first address coordinate system, connectors layered behind shapes (zIndex: 1)
 *                  with flow arrows, midpoint connector anchor dots, redirection traffic shapes,
 *                  variable declaration and counter auto-incrementation (+1), shape-specific preset fields,
 *                  custom constant fields, end node stop conditions, multi-anchor loopback nodes,
 *                  and interactive Play/Pause/Resume/Stop runtime execution.
 * Author:          Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * License:         PolyForm Noncommercial 1.0.0
 */

'use strict';

const assert = require('assert');
const flow = require('../lib_bejson_Canvas_Flow_core.js');
const presets = require('../lib_bejson_Canvas_Flow_presets.js');
const runtimeMod = require('../lib_bejson_Canvas_Flow_runtime.js');

console.log('--- Starting Canvas Flow Test Suite ---');

// 1. Initial Flow Creation, Invariants & Center Address
const store = flow.createFlowStore({ name: 'order_processing', stageWidth: 1000, stageHeight: 600 });
const nodes = store.getNodes();
assert.strictEqual(nodes.length, 2, 'Default flow must contain Start and End nodes');
assert.strictEqual(nodes[0].type, 'start');
assert.strictEqual(nodes[1].type, 'end');

// Verify Center-First Coordinate Address System
const startAddr = store.getNodeAddress(nodes[0].id);
assert.strictEqual(startAddr.cx, nodes[0].cx, 'Primary address position must be center cx');
assert.strictEqual(startAddr.cy, nodes[0].cy, 'Primary address position must be center cy');
assert.strictEqual(startAddr.x, nodes[0].cx - nodes[0].size / 2, 'Top-left x must derive from center cx');
assert.strictEqual(startAddr.y, nodes[0].cy - nodes[0].size / 2, 'Top-left y must derive from center cy');
assert.strictEqual(nodes[0].zIndex, 2, 'Shape zIndex must be 2');
console.log('✓ Node center address coordinate system verified.');

// 2. Connectors Layered Behind Shapes with Directional Flow Arrow
const connectors = store.getConnectors();
assert.strictEqual(connectors.length, 1);
assert.strictEqual(connectors[0].zIndex, 1, 'Connector zIndex must be 1 (behind shapes)');

// Verify flow arrow points towards target shape
const arrow = connectors[0].flowArrow;
assert.ok(arrow, 'Connector must include directional flow arrow');
assert.ok(arrow.tipX > nodes[0].cx, 'Flow arrow must point in direction of flow towards target node');
assert.strictEqual(connectors[0].anchorDot.radius, 6);
console.log('✓ Connector layering (zIndex: 1 behind shapes) and flow arrow verified.');

// 3. Add Variable Counter Shape Node via Anchor Dot
const varRes = store.addVariableNodeOnConnector(connectors[0].id, {
  variableName: 'request_count',
  mode: 'counter',
  initialValue: 0,
  incrementBy: 1,
  label: 'Hit Counter'
});

assert.ok(varRes.newNode);
assert.strictEqual(varRes.newNode.type, 'variable');
assert.strictEqual(varRes.newNode.mode, 'counter');
assert.strictEqual(varRes.newNode.variableName, 'request_count');
assert.strictEqual(store.getNodes().length, 3);
console.log('✓ Variable counter node addition via anchor dot verified.');

// 4. Add Redirection Shape Node via Second Connector's Anchor Dot
const connToSplit = store.getConnectors()[1]; // Node -> End connector
const redirRes = store.addRedirectNodeOnConnector(connToSplit.id, {
  featureFlag: 'beta_access',
  label: 'Beta Feature Gate'
});

assert.ok(redirRes.newNode);
assert.strictEqual(redirRes.newNode.type, 'redirect');
assert.strictEqual(redirRes.newNode.featureFlag, 'beta_access');
assert.strictEqual(store.getNodes().length, 4); // Start -> Counter -> Redirect -> End
console.log('✓ Redirection shape node addition via anchor dot verified.');

// 5. Flow Traversal & Counter Incrementation Simulation
// Pass 1: feature_flag is false -> routes to End
const simResult1 = store.simulateFlow({ beta_access: false, request_count: 5 });
assert.strictEqual(simResult1.success, true);
assert.strictEqual(simResult1.finalContext.request_count, 6, 'Counter must increment by 1 when passed through');
console.log('✓ Flow simulation with auto-increment counter (+1) verified.');

// Pass 2: counter increments from initial 0
const simResult2 = store.simulateFlow({ beta_access: true });
assert.strictEqual(simResult2.success, true);
assert.strictEqual(simResult2.finalContext.request_count, 1, 'Counter must increment by 1 from initial value');
console.log('✓ Redirection feature flag routing and variable state verified.');

// 6. Full Structural Validation
const valRes = store.validate();
assert.strictEqual(valRes.valid, true, 'Flow with Start, End, Variable, and Redirect nodes must be valid');
assert.strictEqual(valRes.errors.length, 0);
console.log('✓ Full structural validation passed.');

// 7. Phase 1: Shape-Specific Preset Fields vs. Custom Constant Fields
const startPresets = presets.getPresetsForNodeType('start');
const endPresets = presets.getPresetsForNodeType('end');
const shapePresets = presets.getPresetsForNodeType('shape');
const loopPresets = presets.getPresetsForNodeType('loopback');
assert.ok(startPresets.some(p => p.name === 'initial_payload'), 'Start node must have initial_payload preset');
assert.ok(endPresets.some(p => p.name === 'stop_condition_type'), 'End node must have stop_condition_type preset');
assert.ok(shapePresets.some(p => p.name === 'action_fn'), 'Shape node must have action_fn preset');
assert.ok(loopPresets.some(p => p.name === 'loop_count_max'), 'Loopback node must have loop_count_max preset');

// Add preset field and custom constant fields to Start node
store.addOrUpdatePresetField(nodes[0].id, 'initial_payload', 'seed_alpha');
store.addOrUpdateCustomField(nodes[0].id, 'env_tag', 'string', 'production');
store.addOrUpdateCustomField(nodes[0].id, 'retry_budget', 'integer', '5');
store.addOrUpdateCustomField(nodes[0].id, 'audit_enabled', 'boolean', 'true');

const updatedStart = store.getNodeById(nodes[0].id);
assert.strictEqual(updatedStart.presetFields.length, 1);
assert.strictEqual(updatedStart.presetFields[0].value, 'seed_alpha');
assert.strictEqual(updatedStart.customFields.length, 3);
assert.strictEqual(updatedStart.customFields[0].value, 'production');
assert.strictEqual(updatedStart.customFields[1].value, 5);
assert.strictEqual(updatedStart.customFields[1].kind, 'constant');
assert.strictEqual(updatedStart.customFields[2].value, true);

// Edit custom field value
store.addOrUpdateCustomField(nodes[0].id, 'retry_budget', 'integer', '12');
assert.strictEqual(store.getNodeById(nodes[0].id).customFields[1].value, 12);

// Verify custom fields do nothing at runtime while preset fields apply functional attributes
const simPreset = store.simulateFlow({});
assert.strictEqual(simPreset.finalContext.initial_payload, 'seed_alpha');
assert.strictEqual(simPreset.finalContext.retry_budget, undefined, 'Custom fields must remain constants and not mutate runtime context');
console.log('✓ Phase 1: Shape-specific preset fields & typed custom constant fields verified.');

// 8. Phase 2: End (Stop) Node Stop Condition Field & Evaluation
const endNodeId = nodes[1].id;
store.setEndNodeStopCondition(endNodeId, {
  type: 'variable_equals',
  variableName: 'request_count',
  targetValue: '3'
});

const simFailStop = store.simulateFlow({ request_count: 0 }); // increments to 1 != 3
assert.strictEqual(simFailStop.stopConditionMet, false, 'Stop condition must fail when request_count is 1 != 3');

const simPassStop = store.simulateFlow({ request_count: 2 }); // increments to 3 == 3
assert.strictEqual(simPassStop.stopConditionMet, true, 'Stop condition must pass when request_count reaches 3');

// Test time_running stop condition
store.setEndNodeStopCondition(endNodeId, {
  type: 'time_running',
  maxTimeMs: 250
});
const simFast = store.simulateFlow({ stepDurationMs: 50 }); // 4 steps -> 150ms < 250ms
assert.strictEqual(simFast.stopConditionMet, false);
const simSlow = store.simulateFlow({ stepDurationMs: 120 }); // 4 steps -> 360ms >= 250ms
assert.strictEqual(simSlow.stopConditionMet, true);

// Reset End node stop condition to 'always'
store.setEndNodeStopCondition(endNodeId, { type: 'always' });
console.log('✓ Phase 2: End node stop conditions (variable_equals, time_running, always) verified.');

// 9. Phase 3: Loopback Node Shape & Multi-Anchor Backward Routing
const loopFlow = flow.createFlowStore({ name: 'loopback_test' });
const c0 = loopFlow.getConnectors()[0];
const ctrNode = loopFlow.addVariableNodeOnConnector(c0.id, {
  variableName: 'cycles',
  mode: 'counter',
  initialValue: 0,
  incrementBy: 1,
  label: 'Cycle Counter'
});

// Insert Loopback node after Cycle Counter, looping back to Cycle Counter for 3 iterations
const afterCtrConn = loopFlow.getConnectors().find(c => c.sourceId === ctrNode.newNode.id);
const lbRes = loopFlow.addLoopbackNodeOnConnector(afterCtrConn.id, {
  label: 'Retry Loopback',
  loopbackTargetId: ctrNode.newNode.id,
  loopCountMax: 3,
  loopOffsetY: -96
});

assert.strictEqual(lbRes.newNode.type, 'loopback');
const enrichedLoopConn = loopFlow.getConnectors().find(c => c.id === lbRes.loopbackConnector.id);
assert.strictEqual(enrichedLoopConn.isLoopback, true);
assert.strictEqual(enrichedLoopConn.anchorPoints.length, 3, 'Loopback connector must expose 3 interactive anchor points');

// Simulate loopback traversal: initial pass (cycles=1) + 3 loopbacks (cycles=2,3,4) = 4
const lbSim = loopFlow.simulateFlow({});
assert.strictEqual(lbSim.success, true);
assert.strictEqual(lbSim.finalContext.cycles, 4, 'Counter inside 3-iteration loopback must execute 4 times total');

// Insert an intermediate process node on the loopback return anchor (anchorIndex: 1)
const midLoopInserted = loopFlow.addNodeOnConnector(enrichedLoopConn.id, {
  label: 'Backoff Step',
  anchorIndex: 1
});
assert.strictEqual(midLoopInserted.newNode.label, 'Backoff Step');
store.addOrUpdatePresetField(nodes[0].id, 'initial_payload', 'seed_alpha');
const lbSimWithMid = loopFlow.simulateFlow({});
assert.strictEqual(lbSimWithMid.success, true);
assert.strictEqual(lbSimWithMid.finalContext.cycles, 4);
assert.ok(lbSimWithMid.stepLog.some(s => s.label === 'Backoff Step'), 'Intermediate node inserted on loopback anchor must execute during loop');
console.log('✓ Phase 3: Loopback node shape, 3-anchor backward routing, and in-loop anchor insertion verified.');

// 10. Phase 5: Interactive Flow Runtime (Play, Pause, Resume, Stop)
const rt = runtimeMod.createFlowRuntime(loopFlow, { stepIntervalMs: 1000 });
assert.strictEqual(rt.getSnapshot().status, 'IDLE');
rt.play({});
assert.strictEqual(rt.getSnapshot().status, 'RUNNING');
assert.strictEqual(rt.getSnapshot().stepCount, 1);

rt.pause();
assert.strictEqual(rt.getSnapshot().status, 'PAUSED');
const pausedSteps = rt.getSnapshot().stepCount;

rt.resume();
assert.strictEqual(rt.getSnapshot().status, 'RUNNING');
assert.strictEqual(rt.getSnapshot().stepCount, pausedSteps + 1);

rt.stop();
assert.strictEqual(rt.getSnapshot().status, 'STOPPED');
assert.strictEqual(rt.getSnapshot().stepCount, 0);
console.log('✓ Phase 5: Interactive Flow Runtime (Play, Pause, Resume, Stop) verified.');

// 11. BEJSON 104a Export & Import Round-Trip Verification
const bejsonDoc = store.exportBejson();
assert.strictEqual(bejsonDoc.Format, 'BEJSON');
assert.strictEqual(bejsonDoc.Format_Version, '104a');
assert.strictEqual(bejsonDoc.Node_Values.length, 4);
const roundTripStore = flow.createFlowStore({ name: 'reimported' });
const importRes = roundTripStore.importBejson(bejsonDoc);
assert.strictEqual(importRes.ok, true);
assert.strictEqual(roundTripStore.getNodeById(1).customFields.length, 3);
assert.strictEqual(roundTripStore.getNodeById(1).presetFields[0].value, 'seed_alpha');
console.log('✓ BEJSON 104a export/import round-trip with preset and custom fields verified.');

// 11b. Sanitized Node Options Schema Export & Import (Zero UUIDs, Zero Session Data, Zero Values)
const startNodeForSchema = store.getNodeById(1);
const exportedOptsSchema = store.exportNodeOptionsSchema(1);
const exportedSchemaStr = JSON.stringify(exportedOptsSchema);
assert.strictEqual(exportedOptsSchema.Format, 'BEJSON');
assert.strictEqual(exportedOptsSchema.Format_Version, '104a');
assert.deepStrictEqual(exportedOptsSchema.Records_Type, ['flow_node_options_schema']);
assert.strictEqual(exportedSchemaStr.includes(startNodeForSchema.uuid), false, 'Exported node options schema must NOT contain node UUID');
assert.strictEqual(exportedSchemaStr.includes('seed_alpha'), false, 'Exported node options schema must NOT contain preset field values');
assert.strictEqual(exportedSchemaStr.includes('production'), false, 'Exported node options schema must NOT contain custom field values');
assert.strictEqual(exportedSchemaStr.includes('12'), false, 'Exported node options schema must NOT contain numeric field values');

// Import the sanitized schema onto a fresh store's Start node and verify fields exist with blank/type defaults
const targetOptStore = flow.createFlowStore({ name: 'target_opt_flow' });
const optImpRes = targetOptStore.importNodeOptionsSchema(1, exportedOptsSchema, { replace: true });
assert.strictEqual(optImpRes.ok, true);
assert.strictEqual(optImpRes.presetCount, 1);
assert.strictEqual(optImpRes.customCount, 3);
const importedStartNode = targetOptStore.getNodeById(1);
assert.strictEqual(importedStartNode.presetFields[0].name, 'initial_payload');
assert.strictEqual(importedStartNode.presetFields[0].value, '', 'Imported preset string value must be blank default');
assert.strictEqual(importedStartNode.customFields[0].name, 'env_tag');
assert.strictEqual(importedStartNode.customFields[0].value, '', 'Imported custom string value must be blank default');
assert.strictEqual(importedStartNode.customFields[1].name, 'retry_budget');
assert.strictEqual(importedStartNode.customFields[1].value, 0, 'Imported custom integer value must be 0 default');
assert.strictEqual(importedStartNode.customFields[2].name, 'audit_enabled');
assert.strictEqual(importedStartNode.customFields[2].value, false, 'Imported custom boolean value must be false default');
console.log('✓ Sanitized Node Options Schema export/import (no UUIDs, no session specifics, no values) verified.');

// 12. Canvas Flow Schemas & Field Map Cache
const schemas = require('../lib_bejson_Canvas_Flow_schemas.js');
assert.ok(schemas.FLOW_NODE_FIELDS.length >= 15);
assert.ok(schemas.FIELD_MAP_CACHE.nodes.preset_fields !== undefined);
assert.ok(schemas.FIELD_MAP_CACHE.nodes.custom_fields !== undefined);
assert.ok(schemas.FIELD_MAP_CACHE.nodes.stop_condition !== undefined);
assert.ok(schemas.FIELD_MAP_CACHE.connectors.anchor_points !== undefined);
const nodeRow = schemas.buildFlowNodeRecord({ node_id: 10, node_type: 'variable', pos_cx: 120, pos_cy: 80 });
assert.strictEqual(nodeRow[0], 10);
assert.strictEqual(nodeRow[2], 'variable');
assert.strictEqual(nodeRow[4], 120);
console.log('✓ Flow schemas and O(1) field map cache verified.');

// 13. Flow Templates (Linear Pipeline, Feature Gate, Accumulator Loop)
const templates = require('../lib_bejson_Canvas_Flow_templates.js');
const pipelineStore = templates.createLinearPipeline({ name: 'etl_pipeline' });
assert.strictEqual(pipelineStore.getNodes().length, 4); // Start -> Step1 -> Step2 -> End
assert.strictEqual(pipelineStore.validate().valid, true);
console.log('✓ Linear pipeline template verified.');

const gateStore = templates.createFeatureGate({ name: 'beta_gate', featureFlag: 'beta_active' });
assert.strictEqual(gateStore.getNodes().length, 3); // Start -> Gate -> End
assert.strictEqual(gateStore.validate().valid, true);
console.log('✓ Feature gate branching template verified.');

const loopStore = templates.createAccumulatorLoop({ name: 'loop_accumulator' });
assert.strictEqual(loopStore.getNodes().length, 4); // Start -> Var -> Threshold -> End
assert.strictEqual(loopStore.validate().valid, true);
console.log('✓ Accumulator loop template verified.');

// 14. Error Registry Verification (650-669)
const flowErrors = require('../lib_bejson_Canvas_Flow_errors.js');
assert.strictEqual(flowErrors.E_CANVAS_FLOW_VALIDATION_FAILED, 650);
assert.strictEqual(flowErrors.E_CANVAS_FLOW_MISSING_START, 651);
assert.strictEqual(flowErrors.E_CANVAS_FLOW_BARRIER_OF_ENTRY_FAILED, 660);
const errInst = new flowErrors.CanvasFlowValidationError('Missing start node', flowErrors.E_CANVAS_FLOW_MISSING_START);
assert.strictEqual(errInst.code, 651);
assert.ok(errInst.message.includes('E_CANVAS_FLOW_MISSING_START'));
console.log('✓ Canvas_Flow error registry (650-660) verified.');

// 15. Hostile Boundary, Prototype-Pollution, Corrupt Import & Mid-Run Deletion Audit Tests
// 15a. Reject prototype-pollution and underscore-prefixed custom field names
assert.throws(
  () => store.addOrUpdateCustomField(1, '__proto__', 'string', 'polluted'),
  /Invalid or reserved custom field identifier/,
  'Must reject __proto__ custom field name'
);
assert.throws(
  () => store.addOrUpdateCustomField(1, 'constructor', 'string', 'polluted'),
  /Invalid or reserved custom field identifier/,
  'Must reject constructor custom field name'
);
assert.throws(
  () => store.addOrUpdateCustomField(1, '_bejson_field_map', 'string', 'polluted'),
  /Invalid or reserved custom field identifier/,
  'Must reject underscore-prefixed reserved field name'
);

// 15b. Corrupt importBejson payload must throw without wiping existing store state
const preImportNodeCount = store.getNodes().length;
assert.throws(
  () => store.importBejson({ Format: 'BEJSON', Format_Version: '104a', Node_Fields: [], Node_Values: [] }),
  /Invalid BEJSON Flow document/,
  'Corrupt empty flow import must throw'
);
assert.strictEqual(store.getNodes().length, preImportNodeCount, 'Store state must remain intact after failed import');

// 15c. Mid-run structural mutation (file:new) must automatically stop active runtime timer
const hostileRuntime = runtimeMod.createFlowRuntime(loopFlow, { stepIntervalMs: 500 });
hostileRuntime.play({});
assert.strictEqual(hostileRuntime.getSnapshot().status, 'RUNNING');
loopFlow.createNewFile('reset_mid_run', 1280, 720);
assert.strictEqual(hostileRuntime.getSnapshot().status, 'STOPPED', 'Runtime must auto-stop when flow is reset mid-run');

// 15d. Deleting a node targeted by a loopback node must safely reassign loopbackTargetId to Start and avoid duplicate connectors
const delFlow = flow.createFlowStore({ name: 'delete_test' });
const stepA = delFlow.addNodeOnConnector(delFlow.getConnectors()[0].id, { label: 'Step A' });
const afterStepAConn = delFlow.getConnectors().find(c => c.sourceId === stepA.newNode.id);
const lbNode = delFlow.addLoopbackNodeOnConnector(afterStepAConn.id, {
  label: 'Loop to A',
  loopbackTargetId: stepA.newNode.id
});
assert.strictEqual(delFlow.getNodeById(lbNode.newNode.id).loopbackTargetId, stepA.newNode.id);
delFlow.deleteNode(stepA.newNode.id);
assert.strictEqual(delFlow.getNodeById(lbNode.newNode.id).loopbackTargetId, 1, 'Loopback target must fall back to Start node (1) when target is deleted');
console.log('✓ Hostile boundary, prototype-pollution, corrupt import, and mid-run mutation tests verified.');

// 16. Redirection Gate side anchor stubs and branch node insertion
const branchFlow = flow.createFlowStore({ name: 'branch_test' });
const rNodeRes = branchFlow.addRedirectNodeOnConnector(branchFlow.getConnectors()[0].id, {
  label: 'Branch Gate',
  featureFlag: 'beta_flag'
});
const gateId = rNodeRes.newNode.id;

// Initially, gate has no alternate branch connector, so getRedirectSideAnchors() must return 1 anchor stub
const sideAnchors = branchFlow.getRedirectSideAnchors();
assert.strictEqual(sideAnchors.length, 1, 'Must expose 1 side anchor stub for gate without alternate branch');
assert.strictEqual(sideAnchors[0].redirectNodeId, gateId);
assert.strictEqual(sideAnchors[0].label, 'ALT');

// Clicking/adding via side anchor wires the alternate connector to the new node
const branchRes = branchFlow.insertNodeOnRedirectBranch(gateId, {
  type: 'shape',
  label: 'Beta Feature Action'
});
assert.strictEqual(branchRes.connector.sourceId, gateId);
assert.strictEqual(branchRes.connector.targetId, branchRes.node.id);
assert.strictEqual(branchRes.connector.branchCondition, 'alternate');

// After adding node to alternate branch, side stub is now satisfied and disappears
assert.strictEqual(branchFlow.getRedirectSideAnchors().length, 0, 'Side stub must be resolved once alternate branch is wired');
console.log('✓ Redirection Gate side anchor stub and branch node insertion verified.');

console.log('--- All Canvas Flow Tests Passed Successfully! ---');
