/**
 * Library:        lib_bejson_Canvas_Flow_core.js
 * Family:         Canvas_Flow
 * Description:    Flow library extension built on Universal Canvas Core.
 *                 Enforces Start/End node invariants, center-first coordinate addresses,
 *                 connectors positioned behind shapes with flow arrows and midpoint/loopback anchor dots,
 *                 shape-specific preset fields, constant custom fields, end node stop conditions,
 *                 loopback multi-anchor backward routing, redirection traffic branches,
 *                 and variable declaration / counter incrementation.
 * Version:        1.3.0
 * Date Created:   2026-11-21
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * Format_Creator: Elton Boehnen
 * RELATIONAL_ID:  0e19397a-bd76-4b6f-8984-eef7a11b30cf
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. Authoritative Core & Canvas Imports
// ---------------------------------------------------------------------------
const Core = (typeof require !== 'undefined')
  ? require('../Core/lib_bejson_Core_bejson_core.js')
  : (typeof window !== 'undefined' ? window.BEJSON_CORE : null);

const Validator = (typeof require !== 'undefined')
  ? require('../Core/lib_bejson_Core_bejson_validator.js')
  : (typeof window !== 'undefined' ? window.BEJSON_VALIDATOR : null);

const CanvasCore = (typeof require !== 'undefined')
  ? require('../Canvas/lib_bejson_canvas_core.js')
  : (typeof window !== 'undefined' ? window.BEJSON_CANVAS_CORE : null);

const FlowValidator = (typeof require !== 'undefined')
  ? require('./lib_bejson_Canvas_Flow_validator.js')
  : (typeof window !== 'undefined' ? window.BEJSON_CANVAS_FLOW_VALIDATOR : null);

const FlowSchemas = (typeof require !== 'undefined')
  ? require('./lib_bejson_Canvas_Flow_schemas.js')
  : (typeof window !== 'undefined' ? window.BEJSON_CANVAS_FLOW_SCHEMAS : null);

const FlowPresets = (typeof require !== 'undefined')
  ? require('./lib_bejson_Canvas_Flow_presets.js')
  : (typeof window !== 'undefined' ? window.BEJSON_CANVAS_FLOW_PRESETS : null);

// ---------------------------------------------------------------------------
// 2. Constants & Layering (Z-Index)
// ---------------------------------------------------------------------------
const NODE_TYPE_START    = 'start';
const NODE_TYPE_END      = 'end';
const NODE_TYPE_SHAPE    = 'shape';
const NODE_TYPE_REDIRECT = 'redirect';
const NODE_TYPE_VARIABLE = 'variable';
const NODE_TYPE_LOOPBACK = 'loopback';

// Layering discipline: connectors reside behind shapes
const Z_INDEX_CONNECTOR = 1;
const Z_INDEX_SHAPE     = 2;

const DEFAULT_ANCHOR_DOT_RADIUS = 6;
const DEFAULT_NODE_SIZE = 64;
const DEFAULT_STAGE_WIDTH = 1280;
const DEFAULT_STAGE_HEIGHT = 720;
const DEFAULT_LOOPBACK_OFFSET_Y = -96;

// BEJSON 104a schema for flow persistence
const FLOW_NODE_FIELDS = FlowSchemas ? FlowSchemas.FLOW_NODE_FIELDS : [
  { name: 'node_id',            type: 'integer' },
  { name: 'node_uuid',          type: 'string'  },
  { name: 'node_type',          type: 'string'  },
  { name: 'node_label',         type: 'string'  },
  { name: 'pos_cx',             type: 'number'  },
  { name: 'pos_cy',             type: 'number'  },
  { name: 'size',               type: 'number'  },
  { name: 'z_index',            type: 'integer' },
  { name: 'variable_name',      type: 'string'  },
  { name: 'variable_mode',      type: 'string'  },
  { name: 'redirect_key',       type: 'string'  },
  { name: 'stop_condition',     type: 'string'  },
  { name: 'preset_fields',      type: 'string'  },
  { name: 'custom_fields',      type: 'string'  },
  { name: 'loopback_target_id', type: 'integer' }
];

const FLOW_CONNECTOR_FIELDS = FlowSchemas ? FlowSchemas.FLOW_CONNECTOR_FIELDS : [
  { name: 'connector_id',     type: 'integer' },
  { name: 'source_id',        type: 'integer' },
  { name: 'target_id',        type: 'integer' },
  { name: 'z_index',          type: 'integer' },
  { name: 'anchor_cx',        type: 'number'  },
  { name: 'anchor_cy',        type: 'number'  },
  { name: 'branch_condition', type: 'string'  },
  { name: 'is_loopback',      type: 'boolean' },
  { name: 'anchor_points',    type: 'string'  }
];

// ---------------------------------------------------------------------------
// 3. Flow Model Factory (createFlowStore)
// ---------------------------------------------------------------------------
function createFlowStore(options = {}) {
  let stageWidth = options.stageWidth || DEFAULT_STAGE_WIDTH;
  let stageHeight = options.stageHeight || DEFAULT_STAGE_HEIGHT;
  const flowName = CanvasCore ? CanvasCore.sanitizeDbName(options.name || 'default_flow') : 'default_flow';

  // Backing CanvasCore store for spatial & MTV collision calculations.
  // canvasMode (0 legacy | 1 scaled world | 2 paged world) is gated inside the core; default 0.
  const canvasStore = CanvasCore ? CanvasCore.createCanvasStore({
    canvasMode: options.canvasMode,
    worldWidth: options.worldWidth,
    worldHeight: options.worldHeight,
    pageWidth: options.pageWidth,
    pageHeight: options.pageHeight,
    pageCols: options.pageCols,
    pageRows: options.pageRows
  }) : null;
  if (canvasStore) {
    canvasStore.createNewFile(flowName, stageWidth, stageHeight);
  }
  // Single source of truth: in modes >= 1 the stage is the core's fixed world, not the viewport.
  const canvasMode = canvasStore ? canvasStore.state.canvasMode : 0;
  if (canvasMode >= 1) {
    stageWidth = canvasStore.state.stageWidth;
    stageHeight = canvasStore.state.stageHeight;
  }

  // Internal state
  const state = {
    name: flowName,
    canvasMode: canvasMode,
    stageWidth: stageWidth,
    stageHeight: stageHeight,
    nodes: [],
    connectors: [],
    nextId: 1,
    nextConnectorId: 1,
    selectedNodeId: null,
    activeToolId: 'selector',
    activeOptionByTool: {
      selector: 'selector-primary',
      shape: 'square',
      flow: 'flow-stop'
    },
    runtimeState: {
      status: 'IDLE', // 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED'
      activeNodeId: null,
      activeConnectorId: null,
      stepCount: 0,
      timeRunningMs: 0,
      lastReason: ''
    },
    isInitialized: false,
    history: [],
    future: []
  };

  const subscribers = [];

  function subscribe(fn) {
    if (typeof fn === 'function') subscribers.push(fn);
  }

  function notify(reason) {
    subscribers.forEach(function (fn) {
      try { fn(state, reason); }
      catch (err) { console.error('[lib_bejson_Canvas_Flow_core] subscriber error:', err); }
    });
  }

  function snapshot() {
    state.history.push(JSON.stringify({
      nodes: state.nodes,
      connectors: state.connectors,
      nextId: state.nextId,
      nextConnectorId: state.nextConnectorId
    }));
    if (state.history.length > 50) state.history.shift();
    state.future = [];
  }

  function undo() {
    if (!state.history.length) return false;
    state.future.push(JSON.stringify({
      nodes: state.nodes,
      connectors: state.connectors,
      nextId: state.nextId,
      nextConnectorId: state.nextConnectorId
    }));
    const prev = JSON.parse(state.history.pop());
    state.nodes = prev.nodes;
    state.connectors = prev.connectors;
    state.nextId = prev.nextId;
    state.nextConnectorId = prev.nextConnectorId;
    if (!state.nodes.some(function (n) { return n.id === state.selectedNodeId; })) {
      state.selectedNodeId = null;
    }
    notify('edit:undo');
    return true;
  }

  function redo() {
    if (!state.future.length) return false;
    state.history.push(JSON.stringify({
      nodes: state.nodes,
      connectors: state.connectors,
      nextId: state.nextId,
      nextConnectorId: state.nextConnectorId
    }));
    const nxt = JSON.parse(state.future.pop());
    state.nodes = nxt.nodes;
    state.connectors = nxt.connectors;
    state.nextId = nxt.nextId;
    state.nextConnectorId = nxt.nextConnectorId;
    if (!state.nodes.some(function (n) { return n.id === state.selectedNodeId; })) {
      state.selectedNodeId = null;
    }
    notify('edit:redo');
    return true;
  }

  /**
   * Helper: normalize presetFields & customFields arrays on a node
   */
  function normalizeCustomFieldsList(customFields) {
    if (Array.isArray(customFields)) {
      return customFields.map(function (cf) {
        return {
          name: String(cf.name || '').trim(),
          type: String(cf.type || 'string').toLowerCase(),
          kind: 'constant',
          value: FlowPresets ? FlowPresets.coerceFieldValue(cf.value, cf.type) : cf.value
        };
      }).filter(function (cf) { return cf.name.length > 0; });
    }
    if (customFields && typeof customFields === 'object') {
      return Object.keys(customFields).map(function (key) {
        const val = customFields[key];
        const inferredType = typeof val === 'boolean' ? 'boolean' : (typeof val === 'number' ? 'number' : 'string');
        return {
          name: key,
          type: inferredType,
          kind: 'constant',
          value: val
        };
      });
    }
    return [];
  }

  function normalizePresetFieldsList(nodeType, presetFields) {
    if (!Array.isArray(presetFields)) return [];
    return presetFields.map(function (pf) {
      if (!pf || !pf.name) return null;
      if (FlowPresets) {
        try {
          return FlowPresets.buildPresetFieldEntry(nodeType, pf.name, pf.value);
        } catch (_e) {
          return {
            name: String(pf.name),
            label: String(pf.label || pf.name),
            type: String(pf.type || 'string'),
            role: String(pf.role || 'attribute'),
            value: pf.value
          };
        }
      }
      return pf;
    }).filter(Boolean);
  }

  /**
   * Helper: compute midpoint anchor dot circle for a connector
   */
  function computeAnchorDot(sourceNode, targetNode) {
    if (!sourceNode || !targetNode) return null;
    return {
      index: 0,
      role: 'midpoint',
      cx: Math.round((sourceNode.cx + targetNode.cx) / 2),
      cy: Math.round((sourceNode.cy + targetNode.cy) / 2),
      radius: DEFAULT_ANCHOR_DOT_RADIUS
    };
  }

  /**
   * Helper: compute multi-anchor backward return points (r anchors) for a loopback connector
   * Generates a 3-segment U-loop path above/below the primary axis with 3 interactive anchor points:
   *   Anchor 0 (rise_anchor): vertical exit segment from loopback node
   *   Anchor 1 (return_mid_anchor): horizontal backward return midpoint
   *   Anchor 2 (reentry_anchor): vertical re-entry segment into upstream target node
   */
  function computeLoopbackGeometry(sourceNode, targetNode, offsetY) {
    if (!sourceNode || !targetNode) return null;
    const rawOffset = Number.isFinite(Number(offsetY)) ? Number(offsetY) : DEFAULT_LOOPBACK_OFFSET_Y;
    const baseMinY = Math.min(sourceNode.cy, targetNode.cy);
    const baseMaxY = Math.max(sourceNode.cy, targetNode.cy);
    const archY = rawOffset < 0
      ? Math.max(40, Math.round(baseMinY + rawOffset))
      : Math.min(state.stageHeight - 40, Math.round(baseMaxY + rawOffset));

    const p0 = { x: Math.round(sourceNode.cx), y: Math.round(sourceNode.cy) };
    const p1 = { x: Math.round(sourceNode.cx), y: archY };
    const p2 = { x: Math.round(targetNode.cx), y: archY };
    const p3 = { x: Math.round(targetNode.cx), y: Math.round(targetNode.cy) };

    const anchorPoints = [
      {
        index: 0,
        role: 'loop_exit',
        label: 'Loop Exit Anchor',
        cx: Math.round((p0.x + p1.x) / 2),
        cy: Math.round((p0.y + p1.y) / 2),
        radius: DEFAULT_ANCHOR_DOT_RADIUS
      },
      {
        index: 1,
        role: 'loop_return',
        label: 'Loop Return Anchor',
        cx: Math.round((p1.x + p2.x) / 2),
        cy: archY,
        radius: DEFAULT_ANCHOR_DOT_RADIUS
      },
      {
        index: 2,
        role: 'loop_reentry',
        label: 'Loop Re-entry Anchor',
        cx: Math.round((p2.x + p3.x) / 2),
        cy: Math.round((p2.y + p3.y) / 2),
        radius: DEFAULT_ANCHOR_DOT_RADIUS
      }
    ];

    // Arrow tip enters top or bottom perimeter of targetNode
    const targetHalf = (targetNode.size || DEFAULT_NODE_SIZE) / 2;
    const dirY = p3.y >= p2.y ? 1 : -1;
    const tipX = p3.x;
    const tipY = Math.round(p3.y - dirY * targetHalf);
    const angleRad = dirY > 0 ? Math.PI / 2 : -Math.PI / 2;

    return {
      waypoints: [p0, p1, p2, p3],
      anchorPoints: anchorPoints,
      primaryAnchor: anchorPoints[1],
      flowArrow: {
        angleRad: angleRad,
        angleDeg: (angleRad * 180) / Math.PI,
        tipX: tipX,
        tipY: tipY,
        length: 10
      }
    };
  }

  /**
   * Helper: compute directional flow arrow pointing towards target shape
   */
  function computeFlowArrow(sourceNode, targetNode) {
    if (!sourceNode || !targetNode) return null;
    const dx = targetNode.cx - sourceNode.cx;
    const dy = targetNode.cy - sourceNode.cy;
    const rad = Math.atan2(dy, dx);
    const deg = (rad * 180) / Math.PI;

    // Arrow tip offset to border of target node
    const targetRadius = targetNode.size / 2;
    const tipX = Math.round(targetNode.cx - Math.cos(rad) * targetRadius);
    const tipY = Math.round(targetNode.cy - Math.sin(rad) * targetRadius);

    return {
      angleRad: rad,
      angleDeg: deg,
      tipX: tipX,
      tipY: tipY,
      length: 10
    };
  }

  /**
   * Initialize mandatory Start and End nodes and connect them by default
   */
  function initDefaultFlow() {
    state.nodes = [];
    state.connectors = [];
    state.nextId = 1;
    state.nextConnectorId = 1;

    // Start node placed at left quadrant, address is center (cx, cy)
    // Mode 2: Start/End live inside page (0,0) so a new flow looks exactly like a legacy one.
    const layoutW = (canvasMode === 2) ? canvasStore.state.pageWidth : state.stageWidth;
    const layoutH = (canvasMode === 2) ? canvasStore.state.pageHeight : state.stageHeight;
    const startCx = Math.round(layoutW * 0.25);
    const startCy = Math.round(layoutH * 0.5);
    const startNode = {
      id: state.nextId++,
      uuid: CanvasCore ? CanvasCore.generateUuidV4() : 'start-uuid',
      type: NODE_TYPE_START,
      label: 'Start',
      cx: startCx,
      cy: startCy,
      size: DEFAULT_NODE_SIZE,
      zIndex: Z_INDEX_SHAPE,
      presetFields: [],
      customFields: []
    };

    // End node placed at right quadrant, address is center (cx, cy)
    const endCx = Math.round(layoutW * 0.75);
    const endCy = Math.round(layoutH * 0.5);
    const endNode = {
      id: state.nextId++,
      uuid: CanvasCore ? CanvasCore.generateUuidV4() : 'end-uuid',
      type: NODE_TYPE_END,
      label: 'End',
      cx: endCx,
      cy: endCy,
      size: DEFAULT_NODE_SIZE,
      zIndex: Z_INDEX_SHAPE,
      stopCondition: FlowPresets
        ? FlowPresets.buildStopCondition({ type: 'always' })
        : { type: 'always', variableName: '', targetValue: '', maxTimeMs: 0 },
      presetFields: [],
      customFields: []
    };

    state.nodes.push(startNode);
    state.nodes.push(endNode);

    if (canvasStore) {
      canvasStore.addObject(NODE_TYPE_START, startCx, startCy, DEFAULT_NODE_SIZE, state.stageWidth, state.stageHeight);
      canvasStore.addObject(NODE_TYPE_END, endCx, endCy, DEFAULT_NODE_SIZE, state.stageWidth, state.stageHeight);
    }

    // Connect Start to End by default (zIndex: 1, behind shapes)
    const connId = state.nextConnectorId++;
    const defaultConnector = {
      id: connId,
      sourceId: startNode.id,
      targetId: endNode.id,
      zIndex: Z_INDEX_CONNECTOR,
      branchCondition: null,
      isLoopback: false,
      loopOffsetY: 0
    };
    state.connectors.push(defaultConnector);
  }

  // Auto-initialize default flow
  initDefaultFlow();

  /**
   * Get all nodes with center address positions and derived bounds
   */
  function getNodes() {
    return state.nodes.map(function (n) {
      return {
        id: n.id,
        uuid: n.uuid,
        type: n.type,
        label: n.label,
        cx: n.cx,
        cy: n.cy,
        x: n.cx - n.size / 2,
        y: n.cy - n.size / 2,
        size: n.size,
        zIndex: n.zIndex || Z_INDEX_SHAPE,
        variableName: n.variableName || null,
        mode: n.mode || null,
        initialValue: n.initialValue ?? null,
        incrementBy: n.incrementBy ?? null,
        redirectKey: n.redirectKey || null,
        featureFlag: n.featureFlag || null,
        stopCondition: n.stopCondition ? { ...n.stopCondition } : null,
        loopbackTargetId: n.loopbackTargetId || null,
        loopCountMax: n.loopCountMax ?? null,
        loopConditionVar: n.loopConditionVar || null,
        loopTargetValue: n.loopTargetValue ?? null,
        loopOffsetY: n.loopOffsetY ?? null,
        presetFields: Array.isArray(n.presetFields)
          ? n.presetFields.map(function (pf) { return { ...pf }; })
          : [],
        customFields: Array.isArray(n.customFields)
          ? n.customFields.map(function (cf) { return { ...cf }; })
          : normalizeCustomFieldsList(n.customFields)
      };
    });
  }

  function getNodeById(nodeId) {
    const all = getNodes();
    return all.find(function (n) { return n.id === Number(nodeId); }) || null;
  }

  /**
   * Get center address coordinate of a specific node
   */
  function getNodeAddress(nodeId) {
    const node = state.nodes.find(function (n) { return n.id === nodeId; });
    if (!node) return null;
    return {
      id: node.id,
      type: node.type,
      cx: node.cx,
      cy: node.cy,
      x: node.cx - node.size / 2,
      y: node.cy - node.size / 2
    };
  }

  /**
   * Get all connectors enriched with midpoint/loopback anchor dots and directional arrows (behind shapes)
   */
  function getConnectors() {
    const nodeMap = new Map();
    state.nodes.forEach(function (n) { nodeMap.set(n.id, n); });

    return state.connectors.map(function (conn) {
      const source = nodeMap.get(conn.sourceId);
      const target = nodeMap.get(conn.targetId);

      const isLoopback = Boolean(conn.isLoopback || conn.branchCondition === 'loopback');
      if (isLoopback && source && target) {
        const offsetY = conn.loopOffsetY || (source.loopOffsetY) || DEFAULT_LOOPBACK_OFFSET_Y;
        const loopGeom = computeLoopbackGeometry(source, target, offsetY);
        return {
          id: conn.id,
          sourceId: conn.sourceId,
          targetId: conn.targetId,
          zIndex: conn.zIndex || Z_INDEX_CONNECTOR,
          branchCondition: conn.branchCondition || 'loopback',
          isLoopback: true,
          loopOffsetY: offsetY,
          sourceCenter: { cx: source.cx, cy: source.cy },
          targetCenter: { cx: target.cx, cy: target.cy },
          waypoints: loopGeom.waypoints,
          anchorPoints: loopGeom.anchorPoints,
          anchorDot: loopGeom.primaryAnchor,
          flowArrow: loopGeom.flowArrow
        };
      }

      const anchorDot = computeAnchorDot(source, target);
      const flowArrow = computeFlowArrow(source, target);

      return {
        id: conn.id,
        sourceId: conn.sourceId,
        targetId: conn.targetId,
        zIndex: conn.zIndex || Z_INDEX_CONNECTOR,
        branchCondition: conn.branchCondition || null,
        isLoopback: false,
        sourceCenter: source ? { cx: source.cx, cy: source.cy } : null,
        targetCenter: target ? { cx: target.cx, cy: target.cy } : null,
        waypoints: (source && target)
          ? [{ x: source.cx, y: source.cy }, { x: target.cx, y: target.cy }]
          : [],
        anchorPoints: anchorDot ? [anchorDot] : [],
        anchorDot: anchorDot,
        flowArrow: flowArrow
      };
    });
  }

  /**
   * Base node insertion helper that splits an existing connector at its midpoint or specified anchor index
   */
  function _insertNodeOnConnector(connectorId, nodeData, anchorIndex) {
    const connIndex = state.connectors.findIndex(function (c) { return c.id === connectorId; });
    if (connIndex === -1) {
      throw new Error(`Connector ID ${connectorId} not found.`);
    }

    const conn = state.connectors[connIndex];
    const sourceNode = state.nodes.find(function (n) { return n.id === conn.sourceId; });
    const targetNode = state.nodes.find(function (n) { return n.id === conn.targetId; });
    if (!sourceNode || !targetNode) {
      throw new Error(`Invalid connector ${connectorId}: missing source or target node.`);
    }

    // Determine target anchor coordinates (supports multi-anchor loopback connectors)
    const enriched = getConnectors().find(function (c) { return c.id === connectorId; });
    let anchorDot = enriched ? enriched.anchorDot : computeAnchorDot(sourceNode, targetNode);
    if (
      enriched &&
      Array.isArray(enriched.anchorPoints) &&
      Number.isInteger(anchorIndex) &&
      enriched.anchorPoints[anchorIndex]
    ) {
      anchorDot = enriched.anchorPoints[anchorIndex];
    }

    const size = nodeData.size || DEFAULT_NODE_SIZE;
    let targetCx = anchorDot.cx;
    let targetCy = anchorDot.cy;

    if (canvasStore) {
      const placed = CanvasCore.resolveDropPosition(
        state.nodes,
        targetCx,
        targetCy,
        size,
        state.stageWidth,
        state.stageHeight
      );
      if (placed) {
        targetCx = placed.cx;
        targetCy = placed.cy;
      }
    }

    const nodeType = nodeData.type || NODE_TYPE_SHAPE;
    const rawCustom = nodeData.customFields;
    const customObjects = (!Array.isArray(rawCustom) && rawCustom && typeof rawCustom === 'object')
      ? rawCustom
      : null;

    const newNode = {
      id: state.nextId++,
      uuid: CanvasCore ? CanvasCore.generateUuidV4() : `uuid-${Date.now()}`,
      cx: targetCx,
      cy: targetCy,
      size: size,
      zIndex: Z_INDEX_SHAPE,
      ...nodeData,
      type: nodeType,
      presetFields: normalizePresetFieldsList(nodeType, nodeData.presetFields || []),
      customFields: normalizeCustomFieldsList(nodeData.customFields || []),
      _legacyCustomMap: customObjects
    };

    state.nodes.push(newNode);
    if (canvasStore) {
      canvasStore.addObject(newNode.type, targetCx, targetCy, size, state.stageWidth, state.stageHeight);
    }

    // Split connector: (source -> newNode) and (newNode -> target)
    // If splitting a loopback connector, the two child segments remain part of the return path
    const wasLoopback = Boolean(conn.isLoopback || conn.branchCondition === 'loopback');
    const conn1 = {
      id: state.nextConnectorId++,
      sourceId: sourceNode.id,
      targetId: newNode.id,
      zIndex: Z_INDEX_CONNECTOR,
      branchCondition: conn.branchCondition || null,
      isLoopback: false
    };
    const conn2 = {
      id: state.nextConnectorId++,
      sourceId: newNode.id,
      targetId: targetNode.id,
      zIndex: Z_INDEX_CONNECTOR,
      branchCondition: wasLoopback ? 'loopback_segment' : null,
      isLoopback: false
    };

    state.connectors.splice(connIndex, 1, conn1, conn2);
    snapshot();
    notify('node:add');

    return {
      newNode: newNode,
      newConnectors: [conn1, conn2]
    };
  }

  /**
   * Add a basic shape node at the midpoint (or anchorIndex) of a connector
   */
  function addNodeOnConnector(connectorId, nodeOptions = {}) {
    return _insertNodeOnConnector(connectorId, {
      type: nodeOptions.type || NODE_TYPE_SHAPE,
      label: nodeOptions.label || `Shape ${state.nextId}`,
      presetFields: nodeOptions.presetFields || [],
      customFields: nodeOptions.customFields || []
    }, nodeOptions.anchorIndex);
  }

  /**
   * Add a Redirection Shape node to direct traffic in a different flow until a feature is set
   */
  function addRedirectNodeOnConnector(connectorId, options = {}) {
    const flag = options.featureFlag || options.feature_flag || 'feature_active';
    const rKey = options.redirectKey || options.redirect_key || 'is_set';
    const defaultPresets = options.presetFields || (FlowPresets ? [
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_REDIRECT, 'feature_flag', flag),
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_REDIRECT, 'operator', options.operator || 'is_true')
    ] : []);

    return _insertNodeOnConnector(connectorId, {
      type: NODE_TYPE_REDIRECT,
      label: options.label || `Redirect ${state.nextId}`,
      featureFlag: flag,
      redirectKey: rKey,
      branches: options.branches || ['default', 'alternate'],
      presetFields: defaultPresets,
      customFields: options.customFields || []
    }, options.anchorIndex);
  }

  /**
   * Add a branch connector from a redirection shape to an alternative target node
   */
  function addRedirectBranch(redirectNodeId, targetNodeId, condition) {
    const redirectNode = state.nodes.find(function (n) { return n.id === redirectNodeId && n.type === NODE_TYPE_REDIRECT; });
    if (!redirectNode) {
      throw new Error(`Node ID ${redirectNodeId} is not a valid redirection shape.`);
    }
    const targetNode = state.nodes.find(function (n) { return n.id === targetNodeId; });
    if (!targetNode) {
      throw new Error(`Target node ID ${targetNodeId} not found.`);
    }

    const newConn = {
      id: state.nextConnectorId++,
      sourceId: redirectNode.id,
      targetId: targetNode.id,
      zIndex: Z_INDEX_CONNECTOR,
      branchCondition: condition || 'alternate',
      isLoopback: false
    };
    state.connectors.push(newConn);
    snapshot();
    notify('connector:add');
    return newConn;
  }

  /**
   * Return side anchor stubs for redirection gate nodes that do not yet have an alternate branch target.
   * Enables adding a side anchor to click and add a branch node that "goes nowhere until you add a node".
   */
  function getRedirectSideAnchors() {
    const anchors = [];
    state.nodes.forEach(function (node) {
      if (node.type !== NODE_TYPE_REDIRECT) return;
      const hasAlternate = state.connectors.some(function (c) {
        return c.sourceId === node.id && c.branchCondition === 'alternate';
      });
      if (!hasAlternate) {
        const stubStartX = Math.round(node.cx + node.size / 2);
        const stubStartY = Math.round(node.cy);
        const stubEndX = stubStartX + 36;
        const stubEndY = stubStartY;
        anchors.push({
          redirectNodeId: node.id,
          startX: stubStartX,
          startY: stubStartY,
          cx: stubEndX,
          cy: stubEndY,
          radius: DEFAULT_ANCHOR_DOT_RADIUS || 6,
          label: 'ALT'
        });
      }
    });
    return anchors;
  }

  /**
   * Insert a new node directly attached to a redirection shape's alternate side branch.
   * Places the new node at an offset from the redirect node and wires the alternate connector.
   */
  function insertNodeOnRedirectBranch(redirectNodeId, options = {}) {
    const redirectNode = state.nodes.find(function (n) { return n.id === redirectNodeId && n.type === NODE_TYPE_REDIRECT; });
    if (!redirectNode) {
      throw new Error(`Node ID ${redirectNodeId} is not a valid redirection shape.`);
    }

    const nodeType = options.type || NODE_TYPE_SHAPE;
    const newNodeId = state.nextId++;
    const targetCx = options.cx !== undefined ? Number(options.cx) : Math.round(redirectNode.cx + 180);
    const targetCy = options.cy !== undefined ? Number(options.cy) : Math.round(redirectNode.cy + 100);

    const newNode = {
      id: newNodeId,
      uuid: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `flow-node-${newNodeId}`,
      type: nodeType,
      label: options.label || (nodeType === NODE_TYPE_SHAPE ? `Action ${newNodeId}` : `${nodeType.toUpperCase()} ${newNodeId}`),
      cx: targetCx,
      cy: targetCy,
      size: Number(options.size) || DEFAULT_NODE_SIZE,
      zIndex: Z_INDEX_SHAPE,
      variableName: options.variableName || null,
      mode: options.mode || null,
      redirectKey: options.redirectKey || null,
      featureFlag: options.featureFlag || null,
      stopCondition: options.stopCondition || (nodeType === NODE_TYPE_END ? { type: 'always', variableName: '', targetValue: '', maxTimeMs: 0 } : null),
      presetFields: Array.isArray(options.presetFields) ? options.presetFields : [],
      customFields: Array.isArray(options.customFields) ? options.customFields : [],
      loopbackTargetId: options.loopbackTargetId || null,
      loopCountMax: options.loopCountMax || 2
    };

    state.nodes.push(newNode);

    const newConn = {
      id: state.nextConnectorId++,
      sourceId: redirectNode.id,
      targetId: newNode.id,
      zIndex: Z_INDEX_CONNECTOR,
      branchCondition: options.branchCondition || 'alternate',
      isLoopback: false
    };
    state.connectors.push(newConn);

    snapshot();
    notify('node:add');
    notify('connector:add');
    return { node: newNode, connector: newConn };
  }

  /**
   * Add a Variable / Counter shape node to declare custom fields or auto-increment by 1
   */
  function addVariableNodeOnConnector(connectorId, options = {}) {
    const mode = options.mode === 'counter' ? 'counter' : (options.mode === 'accumulate' ? 'accumulate' : 'declare');
    const varName = options.variableName || options.variable_name || `var_${state.nextId}`;
    const initVal = options.initialValue ?? (mode === 'counter' || mode === 'accumulate' ? 0 : null);
    const incBy = options.incrementBy ?? 1;

    const defaultPresets = options.presetFields || (FlowPresets ? [
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_VARIABLE, 'variable_name', varName),
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_VARIABLE, 'variable_mode', mode),
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_VARIABLE, 'initial_value', initVal ?? 0),
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_VARIABLE, 'step_delta', incBy)
    ] : []);

    return _insertNodeOnConnector(connectorId, {
      type: NODE_TYPE_VARIABLE,
      label: options.label || (mode === 'counter' ? `Counter: ${varName}` : `Var: ${varName}`),
      variableName: varName,
      mode: mode,
      initialValue: initVal,
      incrementBy: incBy,
      presetFields: defaultPresets,
      customFields: options.customFields || options.custom_fields || []
    }, options.anchorIndex);
  }

  /**
   * Add a Loopback shape node on a connector.
   * Creates the Loopback node in the forward path AND attaches a multi-anchor backward
   * return connector looping back to an upstream target node (defaults to the connector's source node
   * or the first non-start node if specified).
   */
  function addLoopbackNodeOnConnector(connectorId, options = {}) {
    const conn = state.connectors.find(function (c) { return c.id === connectorId; });
    if (!conn) {
      throw new Error(`Connector ID ${connectorId} not found.`);
    }

    const upstreamTargetId = Number.isInteger(Number(options.loopbackTargetId))
      ? Number(options.loopbackTargetId)
      : conn.sourceId;
    const loopCountMax = Number.isFinite(Number(options.loopCountMax))
      ? Math.max(1, parseInt(options.loopCountMax, 10))
      : 2;
    const loopConditionVar = options.loopConditionVar ? String(options.loopConditionVar).trim() : '';
    const loopTargetValue = options.loopTargetValue !== undefined ? String(options.loopTargetValue) : '';
    const loopOffsetY = Number.isFinite(Number(options.loopOffsetY))
      ? Number(options.loopOffsetY)
      : DEFAULT_LOOPBACK_OFFSET_Y;

    const defaultPresets = options.presetFields || (FlowPresets ? [
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_LOOPBACK, 'loop_count_max', loopCountMax),
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_LOOPBACK, 'loop_condition_var', loopConditionVar),
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_LOOPBACK, 'loop_target_value', loopTargetValue),
      FlowPresets.buildPresetFieldEntry(NODE_TYPE_LOOPBACK, 'loop_offset_y', loopOffsetY)
    ] : []);

    const inserted = _insertNodeOnConnector(connectorId, {
      type: NODE_TYPE_LOOPBACK,
      label: options.label || `Loopback ${state.nextId}`,
      loopbackTargetId: upstreamTargetId,
      loopCountMax: loopCountMax,
      loopConditionVar: loopConditionVar,
      loopTargetValue: loopTargetValue,
      loopOffsetY: loopOffsetY,
      presetFields: defaultPresets,
      customFields: options.customFields || []
    }, options.anchorIndex);

    // Create the backward return connector with multi-anchor geometry
    const loopbackConn = {
      id: state.nextConnectorId++,
      sourceId: inserted.newNode.id,
      targetId: upstreamTargetId,
      zIndex: Z_INDEX_CONNECTOR,
      branchCondition: 'loopback',
      isLoopback: true,
      loopOffsetY: loopOffsetY
    };
    state.connectors.push(loopbackConn);
    snapshot();
    notify('loopback:add');

    return {
      newNode: inserted.newNode,
      forwardConnectors: inserted.newConnectors,
      loopbackConnector: loopbackConn
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Node Properties, Preset Fields, Custom Fields & Stop Condition Mutators
  // ---------------------------------------------------------------------------
  function updateNodeProperties(nodeId, updates = {}) {
    const node = state.nodes.find(function (n) { return n.id === Number(nodeId); });
    if (!node) return null;

    snapshot();

    if (updates.label !== undefined) {
      node.label = String(updates.label).trim() || node.label;
    }
    if (updates.variableName !== undefined) {
      node.variableName = String(updates.variableName).trim();
    }
    if (updates.mode !== undefined) {
      node.mode = String(updates.mode).trim();
    }
    if (updates.initialValue !== undefined) {
      node.initialValue = updates.initialValue;
    }
    if (updates.incrementBy !== undefined) {
      node.incrementBy = Number(updates.incrementBy);
    }
    if (updates.featureFlag !== undefined) {
      node.featureFlag = String(updates.featureFlag).trim();
    }
    if (updates.redirectKey !== undefined) {
      node.redirectKey = String(updates.redirectKey).trim();
    }
    if (updates.loopCountMax !== undefined) {
      node.loopCountMax = Math.max(1, parseInt(updates.loopCountMax, 10) || 1);
    }
    if (updates.loopbackTargetId !== undefined && Number.isInteger(Number(updates.loopbackTargetId))) {
      const newTargetId = Number(updates.loopbackTargetId);
      node.loopbackTargetId = newTargetId;
      const lbConn = state.connectors.find(function (c) {
        return c.sourceId === node.id && (c.isLoopback || c.branchCondition === 'loopback');
      });
      if (lbConn) {
        lbConn.targetId = newTargetId;
      }
    }
    if (updates.stopCondition !== undefined && node.type === NODE_TYPE_END) {
      node.stopCondition = FlowPresets
        ? FlowPresets.buildStopCondition(updates.stopCondition)
        : updates.stopCondition;
    }

    notify('node:update');
    return getNodeById(node.id);
  }

  /**
   * Add or update a shape-specific Preset Field on a node's diagram entry
   */
  function addOrUpdatePresetField(nodeId, presetName, value) {
    const node = state.nodes.find(function (n) { return n.id === Number(nodeId); });
    if (!node) {
      throw new Error(`Node ID ${nodeId} not found.`);
    }
    if (!Array.isArray(node.presetFields)) {
      node.presetFields = [];
    }

    const entry = FlowPresets
      ? FlowPresets.buildPresetFieldEntry(node.type, presetName, value)
      : { name: presetName, label: presetName, type: 'string', role: 'attribute', value: value };

    snapshot();

    const existingIdx = node.presetFields.findIndex(function (pf) { return pf.name === entry.name; });
    if (existingIdx >= 0) {
      node.presetFields[existingIdx] = entry;
    } else {
      node.presetFields.push(entry);
    }

    // Synchronize core node properties when matching preset fields are updated
    if (node.type === NODE_TYPE_VARIABLE) {
      if (entry.name === 'variable_name') node.variableName = String(entry.value);
      if (entry.name === 'variable_mode') node.mode = String(entry.value);
      if (entry.name === 'initial_value') node.initialValue = Number(entry.value);
      if (entry.name === 'step_delta') node.incrementBy = Number(entry.value);
    } else if (node.type === NODE_TYPE_REDIRECT) {
      if (entry.name === 'feature_flag') node.featureFlag = String(entry.value);
    } else if (node.type === NODE_TYPE_END) {
      const currentStop = node.stopCondition || { type: 'always', variableName: '', targetValue: '', maxTimeMs: 0 };
      if (entry.name === 'stop_condition_type') currentStop.type = String(entry.value);
      if (entry.name === 'stop_variable') currentStop.variableName = String(entry.value);
      if (entry.name === 'stop_target_value') currentStop.targetValue = String(entry.value);
      if (entry.name === 'max_time_ms') currentStop.maxTimeMs = Number(entry.value);
      node.stopCondition = FlowPresets ? FlowPresets.buildStopCondition(currentStop) : currentStop;
    } else if (node.type === NODE_TYPE_LOOPBACK) {
      if (entry.name === 'loop_count_max') node.loopCountMax = Number(entry.value);
      if (entry.name === 'loop_condition_var') node.loopConditionVar = String(entry.value);
      if (entry.name === 'loop_target_value') node.loopTargetValue = String(entry.value);
      if (entry.name === 'loop_offset_y') {
        node.loopOffsetY = Number(entry.value);
        const lbConn = state.connectors.find(function (c) {
          return c.sourceId === node.id && (c.isLoopback || c.branchCondition === 'loopback');
        });
        if (lbConn) lbConn.loopOffsetY = Number(entry.value);
      }
    }

    notify('node:preset:update');
    return entry;
  }

  function removePresetField(nodeId, presetName) {
    const node = state.nodes.find(function (n) { return n.id === Number(nodeId); });
    if (!node || !Array.isArray(node.presetFields)) return false;
    const idx = node.presetFields.findIndex(function (pf) { return pf.name === presetName; });
    if (idx === -1) return false;
    snapshot();
    node.presetFields.splice(idx, 1);
    notify('node:preset:remove');
    return true;
  }

  /**
   * Add or update a user-defined Custom Field (constant) on a node's diagram entry.
   * Per spec: custom fields are stored as typed constants in the diagram entry and do nothing at execution time yet.
   */
  function addOrUpdateCustomField(nodeId, fieldName, fieldType, rawValue) {
    const node = state.nodes.find(function (n) { return n.id === Number(nodeId); });
    if (!node) {
      throw new Error(`Node ID ${nodeId} not found.`);
    }
    if (!Array.isArray(node.customFields)) {
      node.customFields = normalizeCustomFieldsList(node.customFields);
    }

    const entry = FlowPresets
      ? FlowPresets.buildCustomFieldEntry(fieldName, fieldType, rawValue)
      : { name: String(fieldName).trim(), type: String(fieldType || 'string'), kind: 'constant', value: rawValue };

    snapshot();

    const existingIdx = node.customFields.findIndex(function (cf) { return cf.name === entry.name; });
    if (existingIdx >= 0) {
      node.customFields[existingIdx] = entry;
    } else {
      node.customFields.push(entry);
    }

    notify('node:custom:update');
    return entry;
  }

  function removeCustomField(nodeId, fieldName) {
    const node = state.nodes.find(function (n) { return n.id === Number(nodeId); });
    if (!node || !Array.isArray(node.customFields)) return false;
    const idx = node.customFields.findIndex(function (cf) { return cf.name === fieldName; });
    if (idx === -1) return false;
    snapshot();
    node.customFields.splice(idx, 1);
    notify('node:custom:remove');
    return true;
  }

  /**
   * Configure the Stop Condition on an End node
   */
  function setEndNodeStopCondition(nodeId, conditionConfig = {}) {
    let targetEnd = null;
    if (nodeId != null) {
      targetEnd = state.nodes.find(function (n) { return n.id === Number(nodeId) && n.type === NODE_TYPE_END; });
    } else {
      targetEnd = state.nodes.find(function (n) { return n.type === NODE_TYPE_END; });
    }
    if (!targetEnd) {
      throw new Error('Target End node not found for stop condition update.');
    }

    snapshot();
    targetEnd.stopCondition = FlowPresets
      ? FlowPresets.buildStopCondition(conditionConfig)
      : {
          type: conditionConfig.type || 'always',
          variableName: conditionConfig.variableName || '',
          targetValue: conditionConfig.targetValue !== undefined ? String(conditionConfig.targetValue) : '',
          maxTimeMs: Number(conditionConfig.maxTimeMs || 0)
        };

    // Also mirror into targetEnd.presetFields so it is visible in the node's preset list
    if (!Array.isArray(targetEnd.presetFields)) targetEnd.presetFields = [];
    const syncPairs = [
      ['stop_condition_type', targetEnd.stopCondition.type],
      ['stop_variable', targetEnd.stopCondition.variableName],
      ['stop_target_value', targetEnd.stopCondition.targetValue],
      ['max_time_ms', targetEnd.stopCondition.maxTimeMs]
    ];
    syncPairs.forEach(function (pair) {
      const pName = pair[0];
      const pVal = pair[1];
      if (FlowPresets) {
        const entry = FlowPresets.buildPresetFieldEntry(NODE_TYPE_END, pName, pVal);
        const idx = targetEnd.presetFields.findIndex(function (pf) { return pf.name === pName; });
        if (idx >= 0) targetEnd.presetFields[idx] = entry;
        else targetEnd.presetFields.push(entry);
      }
    });

    notify('node:stopcondition:update');
    return { ...targetEnd.stopCondition };
  }

  /**
   * Move a node center (cx, cy) and clamp within stage boundaries
   */
  function moveNode(nodeId, newCx, newCy) {
    const node = state.nodes.find(function (n) { return n.id === nodeId; });
    if (!node) return null;

    let resolvedCx = newCx;
    let resolvedCy = newCy;

    if (CanvasCore) {
      const resolved = CanvasCore.resolveDragPosition(
        state.nodes,
        newCx,
        newCy,
        node.size,
        state.stageWidth,
        state.stageHeight,
        node.id,
        node.cx,
        node.cy
      );
      resolvedCx = resolved.cx;
      resolvedCy = resolved.cy;
    }

    node.cx = resolvedCx;
    node.cy = resolvedCy;

    if (canvasStore) {
      canvasStore.moveObject(node.id, resolvedCx, resolvedCy, state.stageWidth, state.stageHeight);
    }

    notify('node:move');
    return node;
  }

  /**
   * Execute a single node's action & determine the next connector/node in the traversal.
   * Shared by synchronous simulateFlow() and asynchronous interactive runtime.
   */
  function executeSingleStep(currentNode, context, loopCounters) {
    const stepRecord = {
      nodeId: currentNode.id,
      type: currentNode.type,
      label: currentNode.label,
      center: { cx: currentNode.cx, cy: currentNode.cy }
    };

    // Execute shape preset functions (note: customFields are constants and intentionally ignored here)
    if (FlowPresets && Array.isArray(currentNode.presetFields) && currentNode.presetFields.length > 0) {
      const presetOutcome = FlowPresets.executeNodePresets(currentNode, context);
      if (presetOutcome) {
        stepRecord.presetExecuted = presetOutcome;
      }
    }

    // Check End node stop condition
    if (currentNode.type === NODE_TYPE_END) {
      const stopEval = FlowPresets
        ? FlowPresets.evaluateStopCondition(currentNode, context)
        : { shouldStop: true, conditionType: 'always', reason: 'End node reached.' };
      stepRecord.stopEvaluation = stopEval;
      return {
        reachedEnd: true,
        shouldStop: stopEval.shouldStop,
        stopEvaluation: stopEval,
        stepRecord: stepRecord,
        nextNode: null,
        chosenConnector: null
      };
    }

    // Handle Variable / Counter shape execution
    if (currentNode.type === NODE_TYPE_VARIABLE) {
      const vName = currentNode.variableName;
      const inc = Number.isFinite(Number(currentNode.incrementBy)) ? Number(currentNode.incrementBy) : 1;
      if (currentNode.mode === 'counter' || currentNode.mode === 'accumulate') {
        const currentVal = Number.isFinite(context[vName]) ? context[vName] : (Number(currentNode.initialValue) || 0);
        context[vName] = currentVal + inc;
        stepRecord.counterValue = context[vName];
      } else {
        context[vName] = currentNode.initialValue;
        if (currentNode._legacyCustomMap) {
          Object.assign(context, currentNode._legacyCustomMap);
        }
        stepRecord.declared = context[vName];
      }
    }

    // Find next node via outgoing connectors
    const outgoing = state.connectors.filter(function (c) { return c.sourceId === currentNode.id; });
    if (outgoing.length === 0) {
      return {
        reachedEnd: false,
        shouldStop: true,
        error: `Dead end reached at node ${currentNode.id}`,
        stepRecord: stepRecord,
        nextNode: null,
        chosenConnector: null
      };
    }

    let chosenConnector = outgoing[0];

    // Handle Loopback shape execution
    if (currentNode.type === NODE_TYPE_LOOPBACK) {
      const countKey = `loop_${currentNode.id}`;
      const currentPass = loopCounters[countKey] || 0;
      const maxPasses = Number.isFinite(Number(currentNode.loopCountMax)) ? Number(currentNode.loopCountMax) : 2;
      const condVar = currentNode.loopConditionVar;
      const condTarget = currentNode.loopTargetValue;

      const condMetEarly = Boolean(
        condVar &&
        context[condVar] !== undefined &&
        String(context[condVar]) === String(condTarget)
      );

      const loopbackConn = outgoing.find(function (c) {
        return c.isLoopback || c.branchCondition === 'loopback' || c.branchCondition === 'loopback_segment';
      });
      const forwardConn = outgoing.find(function (c) {
        return !c.isLoopback && c.branchCondition !== 'loopback' && c.branchCondition !== 'loopback_segment';
      });

      if (!condMetEarly && currentPass < maxPasses && loopbackConn) {
        loopCounters[countKey] = currentPass + 1;
        context[`loopback_${currentNode.id}_count`] = loopCounters[countKey];
        chosenConnector = loopbackConn;
        stepRecord.loopbackTaken = true;
        stepRecord.loopIteration = loopCounters[countKey];
      } else {
        chosenConnector = forwardConn || outgoing[0];
        stepRecord.loopbackTaken = false;
        stepRecord.loopCompleted = true;
      }
    } else if (currentNode.type === NODE_TYPE_REDIRECT) {
      // Handle Redirection shape logic
      const flagKey = currentNode.featureFlag || currentNode.redirectKey;
      const presetOp = (Array.isArray(currentNode.presetFields)
        ? (currentNode.presetFields.find(function (pf) { return pf.name === 'operator'; }) || {}).value
        : null) || 'is_true';
      const presetTarget = (Array.isArray(currentNode.presetFields)
        ? (currentNode.presetFields.find(function (pf) { return pf.name === 'compare_value'; }) || {}).value
        : null);

      let conditionSatisfied = Boolean(context[flagKey]);
      if (presetOp === 'equals' && presetTarget !== undefined) {
        conditionSatisfied = String(context[flagKey]) === String(presetTarget);
      } else if (presetOp === 'gt' && presetTarget !== undefined) {
        conditionSatisfied = Number(context[flagKey]) > Number(presetTarget);
      } else if (presetOp === 'gte' && presetTarget !== undefined) {
        conditionSatisfied = Number(context[flagKey]) >= Number(presetTarget);
      } else if (presetOp === 'lt' && presetTarget !== undefined) {
        conditionSatisfied = Number(context[flagKey]) < Number(presetTarget);
      }

      if (conditionSatisfied) {
        chosenConnector = outgoing.find(function (c) { return c.branchCondition !== 'alternate'; }) || outgoing[0];
      } else {
        const alt = outgoing.find(function (c) { return c.branchCondition === 'alternate'; });
        if (alt) chosenConnector = alt;
      }
      stepRecord.redirectionChosen = chosenConnector.branchCondition || 'default';
    }

    const nextNode = state.nodes.find(function (n) { return n.id === chosenConnector.targetId; }) || null;
    return {
      reachedEnd: false,
      shouldStop: false,
      stepRecord: stepRecord,
      nextNode: nextNode,
      chosenConnector: chosenConnector
    };
  }

  /**
   * Simulate / Traverse flow from start to end, executing variable updates, loopback passes,
   * redirect branching, and end-node stop condition evaluation.
   * @param {Object} [initialContext] - Flow runtime variables, feature flags, and optional time_running / stepDurationMs
   * @returns {Object} { success: boolean, stopConditionMet: boolean, stopEvaluation?: Object, finalContext: Object, stepLog: Array, error?: string }
   */
  function simulateFlow(initialContext = {}) {
    const stepDurationMs = Number.isFinite(Number(initialContext.stepDurationMs))
      ? Number(initialContext.stepDurationMs)
      : 100;
    const context = {
      time_running: Number(initialContext.time_running || 0),
      ...initialContext
    };
    const stepLog = [];
    const loopCounters = {};

    const startNode = state.nodes.find(function (n) { return n.type === NODE_TYPE_START; });
    const endNode = state.nodes.find(function (n) { return n.type === NODE_TYPE_END; });

    if (!startNode || !endNode) {
      return {
        success: false,
        stopConditionMet: false,
        finalContext: context,
        stepLog: stepLog,
        error: 'Missing start or end node.'
      };
    }

    let currentNode = startNode;
    let steps = 0;
    const maxSteps = 100; // Loop limit guard

    while (currentNode && steps < maxSteps) {
      steps++;
      if (steps > 1 && initialContext.time_running === undefined) {
        context.time_running = (steps - 1) * stepDurationMs;
      }

      const outcome = executeSingleStep(currentNode, context, loopCounters);
      const entry = {
        step: steps,
        timeRunningMs: context.time_running,
        ...outcome.stepRecord
      };
      stepLog.push(entry);

      if (outcome.error) {
        return {
          success: false,
          stopConditionMet: false,
          finalContext: context,
          stepLog: stepLog,
          error: outcome.error
        };
      }

      if (outcome.reachedEnd) {
        return {
          success: outcome.shouldStop,
          stopConditionMet: outcome.shouldStop,
          stopEvaluation: outcome.stopEvaluation,
          finalContext: context,
          stepLog: stepLog,
          error: outcome.shouldStop ? undefined : `End node stop condition not satisfied: ${outcome.stopEvaluation.reason}`
        };
      }

      currentNode = outcome.nextNode;
    }

    return {
      success: false,
      stopConditionMet: false,
      finalContext: context,
      stepLog: stepLog,
      error: 'Exceeded maximum step execution threshold.'
    };
  }

  /**
   * Validate current flow state
   */
  function validate() {
    return FlowValidator.validateFlowStructure({
      nodes: state.nodes,
      connectors: state.connectors
    });
  }

  /**
   * Export flow model to canonical BEJSON 104a document
   * Includes preset_fields, custom_fields, stop_condition, and loopback anchor points in the diagram entry.
   */
  function exportBejson() {
    const nodeRows = state.nodes.map(function (n) {
      const stopCond = n.type === NODE_TYPE_END
        ? (n.stopCondition || { type: 'always', variableName: '', targetValue: '', maxTimeMs: 0 })
        : null;
      return [
        n.id,
        n.uuid,
        n.type,
        n.label,
        Math.round(n.cx),
        Math.round(n.cy),
        n.size,
        n.zIndex || Z_INDEX_SHAPE,
        n.variableName || '',
        n.mode || '',
        n.redirectKey || '',
        stopCond ? JSON.stringify(stopCond) : '',
        JSON.stringify(Array.isArray(n.presetFields) ? n.presetFields : []),
        JSON.stringify(Array.isArray(n.customFields) ? n.customFields : normalizeCustomFieldsList(n.customFields)),
        Number.isInteger(n.loopbackTargetId) ? n.loopbackTargetId : 0
      ];
    });

    const enrichedConnectors = getConnectors();
    const connectorRows = enrichedConnectors.map(function (c) {
      return [
        c.id,
        c.sourceId,
        c.targetId,
        c.zIndex || Z_INDEX_CONNECTOR,
        c.anchorDot ? c.anchorDot.cx : 0,
        c.anchorDot ? c.anchorDot.cy : 0,
        c.branchCondition || '',
        Boolean(c.isLoopback),
        JSON.stringify(Array.isArray(c.anchorPoints) ? c.anchorPoints : [])
      ];
    });

    return {
      Format: 'BEJSON',
      Format_Version: '104a',
      Format_Creator: 'Elton Boehnen',
      Flow_Name: state.name,
      Stage_Width: state.stageWidth,
      Stage_Height: state.stageHeight,
      ...(canvasMode >= 1 ? { Canvas_Mode: canvasMode, World_Width: state.stageWidth, World_Height: state.stageHeight } : {}),
      Records_Type: ['flow_nodes'],
      Fields: FLOW_NODE_FIELDS,
      Values: nodeRows,
      Node_Fields: FLOW_NODE_FIELDS,
      Node_Values: nodeRows,
      Connector_Fields: FLOW_CONNECTOR_FIELDS,
      Connector_Values: connectorRows
    };
  }

  /**
   * Import a BEJSON 104a Flow document (or legacy MFDB-132 Canvas package) back into the store.
   * Validates structure before mutating state so corrupt payloads never wipe active sessions.
   */
  function importBejson(doc) {
    if (!doc || typeof doc !== 'object' || doc.Format !== 'BEJSON') {
      throw new Error('Invalid BEJSON Flow document: missing Format="BEJSON" header.');
    }

    // Support importing an MFDB-132 Canvas package if user loads one via File -> Import MFDB-132
    if (
      Array.isArray(doc.Records_Type) &&
      doc.Records_Type[0] === 'MFDB_132_Package' &&
      canvasStore &&
      typeof canvasStore.importMfdb132 === 'function' &&
      !doc.Node_Fields
    ) {
      const mfdbRes = canvasStore.importMfdb132(doc);
      if (!mfdbRes || !mfdbRes.ok) {
        throw new Error(`Invalid MFDB-132 package: ${((mfdbRes && mfdbRes.errors) || []).join('; ')}`);
      }
      snapshot();
      state.name = canvasStore.state.dbName || state.name;
      state.stageWidth = canvasStore.state.stageWidth || state.stageWidth;
      state.stageHeight = canvasStore.state.stageHeight || state.stageHeight;
      initDefaultFlow();
      (canvasStore.state.shapes || []).forEach(function (s) {
        if (s.type !== NODE_TYPE_START && s.type !== NODE_TYPE_END && state.connectors.length > 0) {
          addNodeOnConnector(state.connectors[state.connectors.length - 1].id, {
            type: NODE_TYPE_SHAPE,
            label: s.label || s.type
          });
        }
      });
      state.isInitialized = true;
      notify('file:import');
      return { ok: true, nodeCount: state.nodes.length, connectorCount: state.connectors.length };
    }

    const nodeFields = doc.Node_Fields || doc.Fields;
    const nodeValues = doc.Node_Values || doc.Values;
    if (!Array.isArray(nodeFields) || !Array.isArray(nodeValues) || nodeValues.length === 0) {
      throw new Error('Invalid BEJSON Flow document: missing Node_Fields or non-empty Node_Values.');
    }

    const connFields = Array.isArray(doc.Connector_Fields) ? doc.Connector_Fields : FLOW_CONNECTOR_FIELDS;
    const connValues = Array.isArray(doc.Connector_Values) ? doc.Connector_Values : [];

    const nMap = FlowSchemas ? FlowSchemas.buildFieldMap(nodeFields) : {};
    const cMap = FlowSchemas ? FlowSchemas.buildFieldMap(connFields) : {};

    if (nMap.node_id === undefined || nMap.node_type === undefined) {
      throw new Error('Invalid BEJSON Flow document: required columns node_id and node_type missing.');
    }

    let maxNodeId = 0;
    const parsedNodes = nodeValues.map(function (row, idx) {
      if (!Array.isArray(row)) {
        throw new Error(`Invalid node row at index ${idx}.`);
      }
      const id = Number(row[nMap.node_id]);
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`Invalid node_id at row ${idx}.`);
      }
      if (id > maxNodeId) maxNodeId = id;
      const type = String(row[nMap.node_type] || 'shape').trim().toLowerCase();
      let stopCond = null;
      if (nMap.stop_condition !== undefined && row[nMap.stop_condition]) {
        try { stopCond = JSON.parse(row[nMap.stop_condition]); } catch (_e) { stopCond = null; }
      }
      let presets = [];
      if (nMap.preset_fields !== undefined && row[nMap.preset_fields]) {
        try { presets = JSON.parse(row[nMap.preset_fields]); } catch (_e) { presets = []; }
      }
      let customs = [];
      if (nMap.custom_fields !== undefined && row[nMap.custom_fields]) {
        try { customs = JSON.parse(row[nMap.custom_fields]); } catch (_e) { customs = []; }
      }
      const lbTarget = (nMap.loopback_target_id !== undefined) ? Number(row[nMap.loopback_target_id]) : 0;

      const nodeObj = {
        id: id,
        uuid: String(row[nMap.node_uuid] || ''),
        type: type,
        label: String(row[nMap.node_label] || type).trim(),
        cx: Number.isFinite(Number(row[nMap.pos_cx])) ? Number(row[nMap.pos_cx]) : 0,
        cy: Number.isFinite(Number(row[nMap.pos_cy])) ? Number(row[nMap.pos_cy]) : 0,
        size: Number.isFinite(Number(row[nMap.size])) && Number(row[nMap.size]) > 0 ? Number(row[nMap.size]) : DEFAULT_NODE_SIZE,
        zIndex: Number(row[nMap.z_index] || Z_INDEX_SHAPE),
        variableName: (nMap.variable_name !== undefined && row[nMap.variable_name]) ? String(row[nMap.variable_name]).trim() : null,
        mode: (nMap.variable_mode !== undefined && row[nMap.variable_mode]) ? String(row[nMap.variable_mode]).trim() : null,
        redirectKey: (nMap.redirect_key !== undefined && row[nMap.redirect_key]) ? String(row[nMap.redirect_key]).trim() : null,
        featureFlag: (nMap.redirect_key !== undefined && row[nMap.redirect_key]) ? String(row[nMap.redirect_key]).trim() : null,
        stopCondition: stopCond || (type === NODE_TYPE_END ? { type: 'always', variableName: '', targetValue: '', maxTimeMs: 0 } : null),
        presetFields: normalizePresetFieldsList(type, Array.isArray(presets) ? presets : []),
        customFields: normalizeCustomFieldsList(Array.isArray(customs) ? customs : []),
        loopbackTargetId: lbTarget > 0 ? lbTarget : null
      };

      // Restore preset-driven properties
      nodeObj.presetFields.forEach(function (pf) {
        if (pf.name === 'feature_flag') nodeObj.featureFlag = String(pf.value);
        if (pf.name === 'initial_value') nodeObj.initialValue = Number(pf.value);
        if (pf.name === 'step_delta') nodeObj.incrementBy = Number(pf.value);
        if (pf.name === 'loop_count_max') nodeObj.loopCountMax = Number(pf.value);
        if (pf.name === 'loop_condition_var') nodeObj.loopConditionVar = String(pf.value);
        if (pf.name === 'loop_target_value') nodeObj.loopTargetValue = String(pf.value);
        if (pf.name === 'loop_offset_y') nodeObj.loopOffsetY = Number(pf.value);
      });

      return nodeObj;
    });

    if (!parsedNodes.some(function (n) { return n.type === NODE_TYPE_START; }) ||
        !parsedNodes.some(function (n) { return n.type === NODE_TYPE_END; })) {
      throw new Error('Invalid BEJSON Flow document: flow must contain both start and end nodes.');
    }

    let maxConnId = 0;
    const parsedConnectors = connValues.map(function (row) {
      const cid = Number(row[cMap.connector_id ?? 0]);
      if (cid > maxConnId) maxConnId = cid;
      const bCond = (cMap.branch_condition !== undefined && row[cMap.branch_condition])
        ? String(row[cMap.branch_condition]).trim()
        : null;
      const isLb = (cMap.is_loopback !== undefined) ? Boolean(row[cMap.is_loopback]) : (bCond === 'loopback');
      return {
        id: cid,
        sourceId: Number(row[cMap.source_id ?? 1]),
        targetId: Number(row[cMap.target_id ?? 2]),
        zIndex: Number(row[cMap.z_index ?? 3] || Z_INDEX_CONNECTOR),
        branchCondition: bCond,
        isLoopback: isLb
      };
    });

    snapshot();
    state.name = doc.Flow_Name || state.name || 'imported_flow';
    if (canvasMode === 0) {
      state.stageWidth = Number(doc.Stage_Width) > 0 ? Number(doc.Stage_Width) : state.stageWidth;
      state.stageHeight = Number(doc.Stage_Height) > 0 ? Number(doc.Stage_Height) : state.stageHeight;
    }
    state.nodes = parsedNodes;
    state.connectors = parsedConnectors;
    state.nextId = maxNodeId + 1;
    state.nextConnectorId = maxConnId + 1;
    state.isInitialized = true;
    state.selectedNodeId = null;

    // Synchronize backing CanvasCore store for MTV collision calculations
    if (canvasStore) {
      canvasStore.createNewFile(state.name, state.stageWidth, state.stageHeight);
      state.nodes.forEach(function (n) {
        canvasStore.addObject(n.type, n.cx, n.cy, n.size, state.stageWidth, state.stageHeight);
      });
    }

    notify('file:import');
    return { ok: true, nodeCount: state.nodes.length, connectorCount: state.connectors.length };
  }

  function selectNode(id) {
    state.selectedNodeId = id;
    notify('node:select');
    return state.selectedNodeId;
  }

  function deleteNode(id) {
    const targetId = Number(id);
    const nodeIndex = state.nodes.findIndex(function (n) { return n.id === targetId; });
    if (nodeIndex === -1) return false;
    const targetNode = state.nodes[nodeIndex];
    if (targetNode.type === NODE_TYPE_START || targetNode.type === NODE_TYPE_END) {
      return false; // Start and End are immutable boundaries
    }

    snapshot();

    // Only bridge forward non-loopback connectors when deleting a node
    const incoming = state.connectors.filter(function (c) {
      return c.targetId === targetId && !c.isLoopback && c.branchCondition !== 'loopback';
    });
    const outgoing = state.connectors.filter(function (c) {
      return c.sourceId === targetId && !c.isLoopback && c.branchCondition !== 'loopback';
    });

    state.connectors = state.connectors.filter(function (c) { return c.sourceId !== targetId && c.targetId !== targetId; });

    // Reassign any remaining loopback nodes that targeted the deleted node back to Start
    const startNode = state.nodes.find(function (n) { return n.type === NODE_TYPE_START; });
    state.nodes.forEach(function (n) {
      if (n.loopbackTargetId === targetId && startNode) {
        n.loopbackTargetId = startNode.id;
      }
    });

    if (incoming.length > 0 && outgoing.length > 0) {
      incoming.forEach(function (inConn) {
        outgoing.forEach(function (outConn) {
          if (inConn.sourceId === outConn.targetId) return; // Never create self-loops
          const alreadyConnected = state.connectors.some(function (c) {
            return c.sourceId === inConn.sourceId &&
                   c.targetId === outConn.targetId &&
                   !c.isLoopback &&
                   (c.branchCondition || null) === (inConn.branchCondition || outConn.branchCondition || null);
          });
          if (!alreadyConnected) {
            state.connectors.push({
              id: state.nextConnectorId++,
              sourceId: inConn.sourceId,
              targetId: outConn.targetId,
              zIndex: Z_INDEX_CONNECTOR,
              branchCondition: inConn.branchCondition || outConn.branchCondition || null,
              isLoopback: false
            });
          }
        });
      });
    }

    state.nodes.splice(nodeIndex, 1);
    if (canvasStore && typeof canvasStore.deleteObject === 'function') {
      canvasStore.deleteObject(targetId);
    }
    if (state.selectedNodeId === targetId) {
      state.selectedNodeId = null;
    }
    notify('node:delete');
    return true;
  }

  function deleteSelected() {
    if (state.selectedNodeId == null) return false;
    return deleteNode(state.selectedNodeId);
  }

  function createNewFile(name, stageW, stageH) {
    if (canvasMode === 0) {
      if (stageW) state.stageWidth = stageW;
      if (stageH) state.stageHeight = stageH;
    }
    state.name = CanvasCore ? CanvasCore.sanitizeDbName(name || 'untitled_flow') : (name || 'untitled_flow');
    state.isInitialized = true;
    initDefaultFlow();
    state.history = [];
    state.future = [];
    state.selectedNodeId = null;
    snapshot();
    notify('file:new');
    return state;
  }

  function buildLiveSchema() {
    return JSON.stringify(exportBejson(), null, 2);
  }

  function setStageMetrics(w, h) {
    if (canvasStore && typeof canvasStore.setStageMetrics === 'function') {
      canvasStore.setStageMetrics(w, h);
    }
    if (canvasMode === 0) {
      if (w) state.stageWidth = w;
      if (h) state.stageHeight = h;
    }
  }

  function setShowGrid(val) {
    if (canvasStore && typeof canvasStore.setShowGrid === 'function') {
      canvasStore.setShowGrid(val);
    }
    state.showGrid = Boolean(val);
  }

  function selectObject(id) {
    selectNode(id);
  }

  function moveObject(id, targetCx, targetCy) {
    return moveNode(id, targetCx, targetCy);
  }

  /**
   * Export a node's structural options schema (BEJSON 104a) stripped of all personal identifiers,
   * UUIDs, session/node IDs, coordinates, and values.
   */
  function exportNodeOptionsSchema(nodeId) {
    const node = state.nodes.find(function (n) { return n.id === Number(nodeId); });
    if (!node) {
      throw new Error(`Node ID ${nodeId} not found.`);
    }
    if (!FlowPresets || typeof FlowPresets.exportNodeOptionsSchema !== 'function') {
      throw new Error('FlowPresets.exportNodeOptionsSchema is unavailable.');
    }
    return FlowPresets.exportNodeOptionsSchema(node);
  }

  /**
   * Import a sanitized BEJSON 104a Node Options Schema onto a target node.
   * Applies structural preset fields, custom fields (with blank/type-default values),
   * and stop_condition type (if End node) without importing any personal identifiers, UUIDs, or values.
   */
  function importNodeOptionsSchema(nodeId, schemaDocOrStr, options = {}) {
    const node = state.nodes.find(function (n) { return n.id === Number(nodeId); });
    if (!node) {
      throw new Error(`Node ID ${nodeId} not found.`);
    }
    if (!FlowPresets || typeof FlowPresets.parseNodeOptionsSchema !== 'function') {
      throw new Error('FlowPresets.parseNodeOptionsSchema is unavailable.');
    }

    const parsed = FlowPresets.parseNodeOptionsSchema(schemaDocOrStr, node.type);
    snapshot();

    const mergeMode = options.replace === true ? 'replace' : 'merge';
    if (mergeMode === 'replace') {
      node.presetFields = [];
      node.customFields = [];
    } else {
      if (!Array.isArray(node.presetFields)) node.presetFields = [];
      if (!Array.isArray(node.customFields)) node.customFields = [];
    }

    parsed.presetFields.forEach(function (pf) {
      const existingIdx = node.presetFields.findIndex(function (e) { return e.name === pf.name; });
      if (existingIdx >= 0) {
        node.presetFields[existingIdx] = pf;
      } else {
        node.presetFields.push(pf);
      }
    });

    parsed.customFields.forEach(function (cf) {
      const existingIdx = node.customFields.findIndex(function (e) { return e.name === cf.name; });
      if (existingIdx >= 0) {
        node.customFields[existingIdx] = cf;
      } else {
        node.customFields.push(cf);
      }
    });

    if (node.type === NODE_TYPE_END && parsed.stopConditionType) {
      node.stopCondition = FlowPresets.buildStopCondition({
        type: parsed.stopConditionType,
        variableName: '',
        targetValue: '',
        maxTimeMs: 0
      });
    }

    notify('node:options:import');
    return {
      ok: true,
      nodeId: node.id,
      presetCount: node.presetFields.length,
      customCount: node.customFields.length
    };
  }

  return {
    state: state,
    subscribe: subscribe,
    notify: notify,
    snapshot: snapshot,
    undo: undo,
    redo: redo,
    createNewFile: createNewFile,
    initDefaultFlow: initDefaultFlow,
    getNodes: getNodes,
    getNodeById: getNodeById,
    getNodeAddress: getNodeAddress,
    getConnectors: getConnectors,
    addNodeOnConnector: addNodeOnConnector,
    addRedirectNodeOnConnector: addRedirectNodeOnConnector,
    addRedirectBranch: addRedirectBranch,
    getRedirectSideAnchors: getRedirectSideAnchors,
    insertNodeOnRedirectBranch: insertNodeOnRedirectBranch,
    addVariableNodeOnConnector: addVariableNodeOnConnector,
    addLoopbackNodeOnConnector: addLoopbackNodeOnConnector,
    updateNodeProperties: updateNodeProperties,
    addOrUpdatePresetField: addOrUpdatePresetField,
    removePresetField: removePresetField,
    addOrUpdateCustomField: addOrUpdateCustomField,
    removeCustomField: removeCustomField,
    setEndNodeStopCondition: setEndNodeStopCondition,
    exportNodeOptionsSchema: exportNodeOptionsSchema,
    importNodeOptionsSchema: importNodeOptionsSchema,
    executeSingleStep: executeSingleStep,
    moveNode: moveNode,
    moveObject: moveObject,
    selectNode: selectNode,
    selectObject: selectObject,
    deleteNode: deleteNode,
    deleteSelected: deleteSelected,
    simulateFlow: simulateFlow,
    validate: validate,
    exportBejson: exportBejson,
    importBejson: importBejson,
    buildLiveSchema: buildLiveSchema,
    setStageMetrics: setStageMetrics,
    setShowGrid: setShowGrid
  };
}

const CanvasFlowExports = {
  VERSION: '1.3.0',
  NODE_TYPE_START: NODE_TYPE_START,
  NODE_TYPE_END: NODE_TYPE_END,
  NODE_TYPE_SHAPE: NODE_TYPE_SHAPE,
  NODE_TYPE_REDIRECT: NODE_TYPE_REDIRECT,
  NODE_TYPE_VARIABLE: NODE_TYPE_VARIABLE,
  NODE_TYPE_LOOPBACK: NODE_TYPE_LOOPBACK,
  Z_INDEX_CONNECTOR: Z_INDEX_CONNECTOR,
  Z_INDEX_SHAPE: Z_INDEX_SHAPE,
  DEFAULT_ANCHOR_DOT_RADIUS: DEFAULT_ANCHOR_DOT_RADIUS,
  FLOW_NODE_FIELDS: FLOW_NODE_FIELDS,
  FLOW_CONNECTOR_FIELDS: FLOW_CONNECTOR_FIELDS,
  Core: Core,
  Validator: Validator,
  CanvasCore: CanvasCore,
  FlowValidator: FlowValidator,
  FlowSchemas: FlowSchemas,
  FlowPresets: FlowPresets,
  createFlowStore: createFlowStore
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasFlowExports;
}
if (typeof window !== 'undefined') {
  window.BEJSON_CANVAS_FLOW = CanvasFlowExports;
}
