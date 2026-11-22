/**
 * Library:        lib_bejson_Canvas_errors.js
 * Family:         Canvas (libraries_105)
 * Description:    Unified error registry for Canvas 105 Family (630-649).
 * Version:        1.0.0
 * Date:           2026-11-22
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * License:        PolyForm-Noncommercial-1.0.0
 * RELATIONAL_ID:  8c3e1a90-4b72-4d19-9a55-2e6f0c11b3d4
 * Release_Version: 300
 */

'use strict';

const E_CANVAS_CORE_VALIDATION_FAILED   = 630;
const E_CANVAS_INVALID_RECORDS_TYPE     = 631;
const E_CANVAS_INVALID_STAGE_DIMENSIONS = 632;
const E_CANVAS_INVALID_OBJECT_BOUNDS    = 633;
const E_CANVAS_COLLISION_OVERLAP        = 634;
const E_CANVAS_INVALID_FRAME_SEQUENCE   = 635;
const E_CANVAS_TEMPLATE_NOT_FOUND       = 636;
const E_CANVAS_MFDB132_PACKAGE_INVALID  = 637;
const E_CANVAS_OBJECT_NOT_FOUND         = 638;
const E_CANVAS_BARRIER_OF_ENTRY_FAILED  = 639;
// 640-649 reserved, unassigned.

const ERROR_NAMES = {
  630: 'E_CANVAS_CORE_VALIDATION_FAILED',
  631: 'E_CANVAS_INVALID_RECORDS_TYPE',
  632: 'E_CANVAS_INVALID_STAGE_DIMENSIONS',
  633: 'E_CANVAS_INVALID_OBJECT_BOUNDS',
  634: 'E_CANVAS_COLLISION_OVERLAP',
  635: 'E_CANVAS_INVALID_FRAME_SEQUENCE',
  636: 'E_CANVAS_TEMPLATE_NOT_FOUND',
  637: 'E_CANVAS_MFDB132_PACKAGE_INVALID',
  638: 'E_CANVAS_OBJECT_NOT_FOUND',
  639: 'E_CANVAS_BARRIER_OF_ENTRY_FAILED'
};

class CanvasValidationError extends Error {
  constructor(message, code = E_CANVAS_BARRIER_OF_ENTRY_FAILED) {
    const errorName = ERROR_NAMES[code] || `E_CANVAS_${code}`;
    super(`[${errorName}] ${message}`);
    this.name = 'CanvasValidationError';
    this.code = code;
  }
}

const CanvasErrorsExports = {
  E_CANVAS_CORE_VALIDATION_FAILED,
  E_CANVAS_INVALID_RECORDS_TYPE,
  E_CANVAS_INVALID_STAGE_DIMENSIONS,
  E_CANVAS_INVALID_OBJECT_BOUNDS,
  E_CANVAS_COLLISION_OVERLAP,
  E_CANVAS_INVALID_FRAME_SEQUENCE,
  E_CANVAS_TEMPLATE_NOT_FOUND,
  E_CANVAS_MFDB132_PACKAGE_INVALID,
  E_CANVAS_OBJECT_NOT_FOUND,
  E_CANVAS_BARRIER_OF_ENTRY_FAILED,
  ERROR_NAMES,
  CanvasValidationError
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasErrorsExports;
}
if (typeof window !== 'undefined') {
  window.BEJSON_CANVAS_ERRORS = CanvasErrorsExports;
}
