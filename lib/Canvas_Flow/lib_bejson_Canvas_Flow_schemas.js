/**
 * Library:        lib_bejson_Canvas_Flow_schemas.js
 * Family:         Canvas_Flow
 * Description:    Authoritative BEJSON 104a and MFDB Schema Definitions,
 *                 Field Maps, and Record Builders for Canvas Flow Models.
 * Version:        1.0.0
 * Date Created:   2026-11-22
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * Format_Creator: Elton Boehnen
 * RELATIONAL_ID:  5a7e9123-bc44-4e12-8877-3a1b4c9e5521
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

(function () {
  const Core = (typeof require !== 'undefined')
    ? require('../Core/lib_bejson_Core_bejson_core.js')
    : (typeof window !== 'undefined' ? (window.BEJSON_CORE || window.BEJSON) : null);

  // ---------------------------------------------------------------------------
  // 1. Authoritative Schema Field Arrays
  // ---------------------------------------------------------------------------
  const FLOW_NODE_FIELDS = [
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

  const FLOW_CONNECTOR_FIELDS = [
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

  const FLOW_TRACE_STEP_FIELDS = [
    { name: 'step_index',       type: 'integer' },
    { name: 'node_id',          type: 'integer' },
    { name: 'node_type',        type: 'string'  },
    { name: 'node_label',       type: 'string'  },
    { name: 'executed_action',  type: 'string'  },
    { name: 'variable_state',   type: 'string'  },
    { name: 'next_connector_id',type: 'integer' }
  ];

  const FLOW_META_FIELDS = [
    { name: 'flow_name',        type: 'string'  },
    { name: 'stage_width',      type: 'integer' },
    { name: 'stage_height',     type: 'integer' },
    { name: 'total_nodes',      type: 'integer' },
    { name: 'total_connectors', type: 'integer' },
    { name: 'created_at',       type: 'string'  },
    { name: 'updated_at',       type: 'string'  }
  ];

  // ---------------------------------------------------------------------------
  // 2. Field Map Cache Builders (O(1) lookups)
  // ---------------------------------------------------------------------------
  function buildFieldMap(fields) {
    if (Core && typeof Core.bejson_core_get_field_map === 'function') {
      return Core.bejson_core_get_field_map({ Fields: fields });
    }
    const map = {};
    for (let i = 0; i < fields.length; i++) {
      map[fields[i].name] = i;
    }
    return map;
  }

  const FIELD_MAP_CACHE = {
    nodes: buildFieldMap(FLOW_NODE_FIELDS),
    connectors: buildFieldMap(FLOW_CONNECTOR_FIELDS),
    trace: buildFieldMap(FLOW_TRACE_STEP_FIELDS),
    meta: buildFieldMap(FLOW_META_FIELDS)
  };

  // ---------------------------------------------------------------------------
  // 3. Document Builders
  // ---------------------------------------------------------------------------
  function buildFlowNodeRecord(data = {}) {
    const stopCondStr = typeof data.stop_condition === 'string'
      ? data.stop_condition
      : JSON.stringify(data.stop_condition || { type: 'always', variableName: '', targetValue: '', maxTimeMs: 0 });
    const presetStr = typeof data.preset_fields === 'string'
      ? data.preset_fields
      : JSON.stringify(Array.isArray(data.preset_fields) ? data.preset_fields : []);
    const customStr = typeof data.custom_fields === 'string'
      ? data.custom_fields
      : JSON.stringify(Array.isArray(data.custom_fields) ? data.custom_fields : []);

    return [
      Number.isInteger(data.node_id) ? data.node_id : 0,
      data.node_uuid || '',
      data.node_type || 'shape',
      data.node_label || '',
      Number.isFinite(data.pos_cx) ? data.pos_cx : 0,
      Number.isFinite(data.pos_cy) ? data.pos_cy : 0,
      Number.isFinite(data.size) ? data.size : 64,
      Number.isInteger(data.z_index) ? data.z_index : 2,
      data.variable_name || '',
      data.variable_mode || '',
      data.redirect_key || '',
      stopCondStr,
      presetStr,
      customStr,
      Number.isInteger(data.loopback_target_id) ? data.loopback_target_id : 0
    ];
  }

  function buildFlowConnectorRecord(data = {}) {
    const anchorPtsStr = typeof data.anchor_points === 'string'
      ? data.anchor_points
      : JSON.stringify(Array.isArray(data.anchor_points) ? data.anchor_points : []);
    return [
      Number.isInteger(data.connector_id) ? data.connector_id : 0,
      Number.isInteger(data.source_id) ? data.source_id : 0,
      Number.isInteger(data.target_id) ? data.target_id : 0,
      Number.isInteger(data.z_index) ? data.z_index : 1,
      Number.isFinite(data.anchor_cx) ? data.anchor_cx : 0,
      Number.isFinite(data.anchor_cy) ? data.anchor_cy : 0,
      data.branch_condition || '',
      Boolean(data.is_loopback),
      anchorPtsStr
    ];
  }

  function buildFlowMetaDocument(meta = {}) {
    const now = new Date().toISOString();
    return {
      Format: 'BEJSON',
      Format_Version: '104a',
      Format_Creator: 'Elton Boehnen',
      Records_Type: ['flow_meta'],
      Fields: FLOW_META_FIELDS,
      Values: [
        [
          meta.flow_name || 'untitled_flow',
          meta.stage_width || 1280,
          meta.stage_height || 720,
          meta.total_nodes || 0,
          meta.total_connectors || 0,
          meta.created_at || now,
          meta.updated_at || now
        ]
      ]
    };
  }

  const FlowSchemasExports = {
    VERSION: '1.1.0',
    FLOW_NODE_FIELDS: FLOW_NODE_FIELDS,
    FLOW_CONNECTOR_FIELDS: FLOW_CONNECTOR_FIELDS,
    FLOW_TRACE_STEP_FIELDS: FLOW_TRACE_STEP_FIELDS,
    FLOW_META_FIELDS: FLOW_META_FIELDS,
    FIELD_MAP_CACHE: FIELD_MAP_CACHE,
    buildFieldMap: buildFieldMap,
    buildFlowNodeRecord: buildFlowNodeRecord,
    buildFlowConnectorRecord: buildFlowConnectorRecord,
    buildFlowMetaDocument: buildFlowMetaDocument
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowSchemasExports;
  }
  if (typeof window !== 'undefined') {
    window.BEJSON_CANVAS_FLOW_SCHEMAS = FlowSchemasExports;
  }
})();
