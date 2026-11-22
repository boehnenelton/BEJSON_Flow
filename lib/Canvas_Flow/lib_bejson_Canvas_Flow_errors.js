/**
 * Library:        lib_bejson_Canvas_Flow_errors.js
 * Family:         Canvas_Flow (libraries_105)
 * Description:    Unified error registry for Canvas_Flow 105 Family (650-669).
 * Version:        1.0.0
 * Date:           2026-11-22
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * License:        PolyForm-Noncommercial-1.0.0
 * RELATIONAL_ID:  5f2c9b18-7e44-4a91-8b3d-9c1f40e82a75
 * Release_Version: 300
 */

'use strict';

const E_CANVAS_FLOW_VALIDATION_FAILED       = 650;
const E_CANVAS_FLOW_MISSING_START           = 651;
const E_CANVAS_FLOW_MISSING_END             = 652;
const E_CANVAS_FLOW_DISCONNECTED            = 653;
const E_CANVAS_FLOW_INVALID_CONNECTOR       = 654;
const E_CANVAS_FLOW_INVALID_NODE_TYPE       = 655;
const E_CANVAS_FLOW_INVALID_VARIABLE_NODE   = 656;
const E_CANVAS_FLOW_DEAD_END_REDIRECT       = 657;
const E_CANVAS_FLOW_INVALID_ANCHOR          = 658;
const E_CANVAS_FLOW_SIMULATION_CYCLE_LIMIT  = 659;
const E_CANVAS_FLOW_BARRIER_OF_ENTRY_FAILED = 660;
// 661-669 reserved, unassigned.

const ERROR_NAMES = {
  650: 'E_CANVAS_FLOW_VALIDATION_FAILED',
  651: 'E_CANVAS_FLOW_MISSING_START',
  652: 'E_CANVAS_FLOW_MISSING_END',
  653: 'E_CANVAS_FLOW_DISCONNECTED',
  654: 'E_CANVAS_FLOW_INVALID_CONNECTOR',
  655: 'E_CANVAS_FLOW_INVALID_NODE_TYPE',
  656: 'E_CANVAS_FLOW_INVALID_VARIABLE_NODE',
  657: 'E_CANVAS_FLOW_DEAD_END_REDIRECT',
  658: 'E_CANVAS_FLOW_INVALID_ANCHOR',
  659: 'E_CANVAS_FLOW_SIMULATION_CYCLE_LIMIT',
  660: 'E_CANVAS_FLOW_BARRIER_OF_ENTRY_FAILED'
};

class CanvasFlowValidationError extends Error {
  constructor(message, code = E_CANVAS_FLOW_BARRIER_OF_ENTRY_FAILED) {
    const errorName = ERROR_NAMES[code] || `E_CANVAS_FLOW_${code}`;
    super(`[${errorName}] ${message}`);
    this.name = 'CanvasFlowValidationError';
    this.code = code;
  }
}

const CanvasFlowErrorsExports = {
  E_CANVAS_FLOW_VALIDATION_FAILED,
  E_CANVAS_FLOW_MISSING_START,
  E_CANVAS_FLOW_MISSING_END,
  E_CANVAS_FLOW_DISCONNECTED,
  E_CANVAS_FLOW_INVALID_CONNECTOR,
  E_CANVAS_FLOW_INVALID_NODE_TYPE,
  E_CANVAS_FLOW_INVALID_VARIABLE_NODE,
  E_CANVAS_FLOW_DEAD_END_REDIRECT,
  E_CANVAS_FLOW_INVALID_ANCHOR,
  E_CANVAS_FLOW_SIMULATION_CYCLE_LIMIT,
  E_CANVAS_FLOW_BARRIER_OF_ENTRY_FAILED,
  ERROR_NAMES,
  CanvasFlowValidationError
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasFlowErrorsExports;
}
if (typeof window !== 'undefined') {
  window.BEJSON_CANVAS_FLOW_ERRORS = CanvasFlowErrorsExports;
}
