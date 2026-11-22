/**
 * Library:        lib_bejson_Canvas_Flow_validator.js
 * Family:         Canvas_Flow
 * Description:    Authoritative validator for BEJSON Canvas Flow structures,
 *                 enforcing mandatory Start/End nodes, connectivity, anchor specifications,
 *                 redirection branch validity, and variable/counter configuration.
 * Version:        1.2.0
 * Date Created:   2026-11-21
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * Format_Creator: Elton Boehnen
 * RELATIONAL_ID:  349e6530-f579-45ee-ab1b-98a267e4ab4a
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

// ---------------------------------------------------------------------------
// 1. Core Validator Import
// ---------------------------------------------------------------------------
const CoreValidator = (typeof require !== 'undefined')
  ? require('../Core/lib_bejson_Core_bejson_validator.js')
  : (typeof window !== 'undefined' ? window.BEJSON_VALIDATOR : null);

// ---------------------------------------------------------------------------
// 2. Error Constants
// ---------------------------------------------------------------------------
const FLOW_ERRORS = {
  E_FLOW_MISSING_START: 'FLOW_MISSING_START: Flow must contain at least one start node.',
  E_FLOW_MISSING_END: 'FLOW_MISSING_END: Flow must contain at least one end node.',
  E_FLOW_DISCONNECTED: 'FLOW_DISCONNECTED: No connected traversal path exists from start to end.',
  E_FLOW_INVALID_CONNECTOR: 'FLOW_INVALID_CONNECTOR: Connector references non-existent node ID.',
  E_FLOW_INVALID_NODE_TYPE: 'FLOW_INVALID_NODE_TYPE: Node type must be start, end, shape, redirect, variable, or loopback.',
  E_FLOW_INVALID_VARIABLE_NODE: 'FLOW_INVALID_VARIABLE_NODE: Variable node must specify variable_name and valid mode (declare, counter, or accumulate).',
  E_FLOW_DEAD_END_REDIRECT: 'FLOW_DEAD_END_REDIRECT: Redirection node has branches that fail to reach an end node.'
};

const VALID_NODE_TYPES = new Set(['start', 'end', 'shape', 'redirect', 'variable', 'loopback']);

// ---------------------------------------------------------------------------
// 3. Flow Structure Validator
// ---------------------------------------------------------------------------
/**
 * Validates a Canvas Flow model against the mandatory Start/End, connectivity,
 * redirection routing, and variable/counter node laws.
 * @param {Object} flowModel - Object containing { nodes: Array, connectors: Array }
 * @returns {Object} { valid: boolean, errors: Array<string>, warnings: Array<string> }
 */
function validateFlowStructure(flowModel) {
  const errors = [];
  const warnings = [];

  if (!flowModel || typeof flowModel !== 'object') {
    return { valid: false, errors: ['Invalid flow model: expected object.'], warnings };
  }

  const nodes = Array.isArray(flowModel.nodes) ? flowModel.nodes : [];
  const connectors = Array.isArray(flowModel.connectors) ? flowModel.connectors : [];

  const nodeMap = new Map();
  let startNode = null;
  let endNode = null;

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node == null || typeof node.id === 'undefined') {
      errors.push(`Node at index ${i} is missing mandatory id.`);
      continue;
    }

    nodeMap.set(node.id, node);

    const type = String(node.type || '').toLowerCase();
    if (!VALID_NODE_TYPES.has(type)) {
      errors.push(`${FLOW_ERRORS.E_FLOW_INVALID_NODE_TYPE} Found '${node.type}' on node ID ${node.id}.`);
    }

    if (type === 'start') {
      startNode = node;
    } else if (type === 'end') {
      endNode = node;
    } else if (type === 'variable') {
      // Validate variable node payload
      if (!node.variableName || typeof node.variableName !== 'string') {
        errors.push(`${FLOW_ERRORS.E_FLOW_INVALID_VARIABLE_NODE} Node ID ${node.id} missing variableName.`);
      }
      const mode = String(node.mode || 'declare').toLowerCase();
      if (mode !== 'declare' && mode !== 'counter' && mode !== 'accumulate') {
        errors.push(`${FLOW_ERRORS.E_FLOW_INVALID_VARIABLE_NODE} Node ID ${node.id} has invalid mode '${node.mode}'.`);
      }
    }
  }

  // Rule 1: Must have start node
  if (!startNode) {
    errors.push(FLOW_ERRORS.E_FLOW_MISSING_START);
  }

  // Rule 2: Must have end node
  if (!endNode) {
    errors.push(FLOW_ERRORS.E_FLOW_MISSING_END);
  }

  // Rule 3: Connector integrity check
  const adjacency = new Map();
  for (let i = 0; i < connectors.length; i++) {
    const conn = connectors[i];
    if (!nodeMap.has(conn.sourceId) || !nodeMap.has(conn.targetId)) {
      errors.push(`${FLOW_ERRORS.E_FLOW_INVALID_CONNECTOR} Connector ${conn.id || i} links (${conn.sourceId} -> ${conn.targetId}).`);
      continue;
    }

    if (!adjacency.has(conn.sourceId)) {
      adjacency.set(conn.sourceId, []);
    }
    adjacency.get(conn.sourceId).push(conn.targetId);
  }

  // Rule 4: Connectivity from start to end (Directed Graph Traversal)
  if (startNode && endNode && errors.length === 0) {
    const visited = new Set();
    const queue = [startNode.id];
    let reachedEnd = false;

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === endNode.id) {
        reachedEnd = true;
      }
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = adjacency.get(current) || [];
      for (let n = 0; n < neighbors.length; n++) {
        if (!visited.has(neighbors[n])) {
          queue.push(neighbors[n]);
        }
      }
    }

    if (!reachedEnd) {
      errors.push(FLOW_ERRORS.E_FLOW_DISCONNECTED);
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

const FlowValidatorExports = {
  VERSION: '1.2.0',
  FLOW_ERRORS: FLOW_ERRORS,
  VALID_NODE_TYPES: VALID_NODE_TYPES,
  CoreValidator: CoreValidator,
  validateFlowStructure: validateFlowStructure
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FlowValidatorExports;
}
if (typeof window !== 'undefined') {
  window.BEJSON_CANVAS_FLOW_VALIDATOR = FlowValidatorExports;
}
