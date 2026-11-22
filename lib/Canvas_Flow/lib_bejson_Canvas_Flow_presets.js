/**
 * Library:        lib_bejson_Canvas_Flow_presets.js
 * Family:         Canvas_Flow
 * Description:    Shape-Specific Preset Field Catalogs (Flow Functions & Attributes),
 *                 Custom Constant Field Type Coercion/Validation, and End Node Stop
 *                 Condition Evaluators for BEJSON Canvas Flow.
 * Version:        1.0.0
 * Date Created:   2026-11-22
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * Format_Creator: Elton Boehnen
 * RELATIONAL_ID:  8c4d19f2-4a2b-47e9-91c3-5f8e20a7b614
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

(function () {
  const Core = (typeof require !== 'undefined')
    ? require('../Core/lib_bejson_Core_bejson_core.js')
    : (typeof window !== 'undefined' ? (window.BEJSON_CORE || window.BEJSON) : null);

  // ---------------------------------------------------------------------------
  // 1. Permitted Custom Field Types, Reserved Prototype Keys & Stop Condition Types
  // ---------------------------------------------------------------------------
  const CUSTOM_FIELD_TYPES = ['string', 'number', 'integer', 'boolean'];
  const FORBIDDEN_FIELD_NAMES = new Set([
    '__proto__',
    'prototype',
    'constructor',
    'toString',
    'valueOf',
    'hasOwnProperty',
    '_bejson_field_map',
    '_field_map_cache'
  ]);

  const STOP_CONDITION_TYPES = [
    {
      id: 'always',
      label: 'Immediate Stop (Always)',
      description: 'Stops flow traversal immediately when End node is reached.'
    },
    {
      id: 'time_running',
      label: 'Time Running (>= ms)',
      description: 'Stops when elapsed runtime (time_running) reaches or exceeds target milliseconds.'
    },
    {
      id: 'variable_equals',
      label: 'Variable Value Equals (==)',
      description: 'Stops when the specified flow variable equals the target value.'
    },
    {
      id: 'variable_gte',
      label: 'Variable Value >= Target',
      description: 'Stops when the specified numeric flow variable is greater than or equal to target.'
    }
  ];

  // ---------------------------------------------------------------------------
  // 2. Shape-Specific Preset Field Catalogs
  //    Each node shape ("shield") provides distinct functional preset fields
  //    that act as flow functions or attributes and are added to the diagram.
  // ---------------------------------------------------------------------------
  const SHAPE_PRESET_CATALOG = {
    start: [
      {
        name: 'initial_payload',
        label: 'Initial Payload',
        type: 'string',
        defaultValue: 'default',
        role: 'attribute',
        description: 'Seed payload string injected into flow context at start.'
      },
      {
        name: 'auto_start',
        label: 'Auto Start on Load',
        type: 'boolean',
        defaultValue: false,
        role: 'attribute',
        description: 'Flag indicating whether flow triggers automatically.'
      },
      {
        name: 'max_steps',
        label: 'Max Traversal Steps',
        type: 'integer',
        defaultValue: 100,
        role: 'attribute',
        description: 'Safety step ceiling for traversal loops.'
      }
    ],
    end: [
      {
        name: 'stop_condition_type',
        label: 'Stop Condition Type',
        type: 'string',
        defaultValue: 'always',
        options: ['always', 'time_running', 'variable_equals', 'variable_gte'],
        role: 'function',
        description: 'Condition evaluated when flow arrives at the stop node.'
      },
      {
        name: 'stop_variable',
        label: 'Stop Variable Name',
        type: 'string',
        defaultValue: 'request_count',
        role: 'attribute',
        description: 'Runtime variable inspected by variable_equals or variable_gte.'
      },
      {
        name: 'stop_target_value',
        label: 'Stop Target Value',
        type: 'string',
        defaultValue: '1',
        role: 'attribute',
        description: 'Target threshold or equality value required to satisfy stop condition.'
      },
      {
        name: 'max_time_ms',
        label: 'Target Time Running (ms)',
        type: 'integer',
        defaultValue: 500,
        role: 'attribute',
        description: 'Elapsed time_running threshold in milliseconds.'
      }
    ],
    shape: [
      {
        name: 'action_fn',
        label: 'Action Function',
        type: 'string',
        defaultValue: 'transform',
        options: ['noop', 'transform', 'set_var', 'append_tag', 'delay_ms'],
        role: 'function',
        description: 'Built-in operation executed when flow passes through this process node.'
      },
      {
        name: 'target_variable',
        label: 'Target Variable',
        type: 'string',
        defaultValue: 'last_step',
        role: 'attribute',
        description: 'Context variable written or mutated by action_fn.'
      },
      {
        name: 'action_param',
        label: 'Action Parameter',
        type: 'string',
        defaultValue: 'processed',
        role: 'attribute',
        description: 'Argument value passed to action_fn.'
      }
    ],
    redirect: [
      {
        name: 'feature_flag',
        label: 'Feature Flag Key',
        type: 'string',
        defaultValue: 'feature_active',
        role: 'attribute',
        description: 'Context variable or feature flag key evaluated by redirection gate.'
      },
      {
        name: 'operator',
        label: 'Comparison Operator',
        type: 'string',
        defaultValue: 'is_true',
        options: ['is_true', 'equals', 'gt', 'gte', 'lt'],
        role: 'function',
        description: 'Logical operator used to route between primary and alternate branches.'
      },
      {
        name: 'compare_value',
        label: 'Comparison Target',
        type: 'string',
        defaultValue: 'true',
        role: 'attribute',
        description: 'Target comparison value when operator is equals/gt/gte/lt.'
      },
      {
        name: 'fallback_branch',
        label: 'Fallback Branch Tag',
        type: 'string',
        defaultValue: 'alternate',
        role: 'attribute',
        description: 'Connector branchCondition chosen when condition evaluates false.'
      }
    ],
    variable: [
      {
        name: 'variable_name',
        label: 'Variable Identifier',
        type: 'string',
        defaultValue: 'counter_var',
        role: 'attribute',
        description: 'Name of the flow context variable mutated by this node.'
      },
      {
        name: 'variable_mode',
        label: 'Mutation Function',
        type: 'string',
        defaultValue: 'counter',
        options: ['counter', 'declare', 'accumulate'],
        role: 'function',
        description: 'Operation mode: counter (+1), declare (assign initial), or accumulate (+step_delta).'
      },
      {
        name: 'initial_value',
        label: 'Initial Value',
        type: 'number',
        defaultValue: 0,
        role: 'attribute',
        description: 'Starting numeric or literal value for the variable.'
      },
      {
        name: 'step_delta',
        label: 'Increment Step Delta',
        type: 'number',
        defaultValue: 1,
        role: 'attribute',
        description: 'Amount added per pass when in counter or accumulate mode.'
      }
    ],
    loopback: [
      {
        name: 'loop_count_max',
        label: 'Max Loop Iterations',
        type: 'integer',
        defaultValue: 3,
        role: 'function',
        description: 'Number of backward loop passes before advancing forward to exit.'
      },
      {
        name: 'loop_condition_var',
        label: 'Loop Exit Variable',
        type: 'string',
        defaultValue: '',
        role: 'attribute',
        description: 'Optional variable name that exits the loop early when matching loop_target_value.'
      },
      {
        name: 'loop_target_value',
        label: 'Loop Exit Target Value',
        type: 'string',
        defaultValue: '',
        role: 'attribute',
        description: 'Value of loop_condition_var that satisfies loop completion.'
      },
      {
        name: 'loop_offset_y',
        label: 'Loop Arch Offset Y (px)',
        type: 'number',
        defaultValue: -96,
        role: 'attribute',
        description: 'Vertical offset in pixels for the multi-anchor backward return loop.'
      }
    ]
  };

  // ---------------------------------------------------------------------------
  // 3. Value Type Coercion & Validation Helpers
  // ---------------------------------------------------------------------------
  function coerceFieldValue(rawValue, fieldType) {
    const normalizedType = String(fieldType || 'string').toLowerCase();
    if (normalizedType === 'integer') {
      const parsedInt = parseInt(rawValue, 10);
      return Number.isNaN(parsedInt) ? 0 : parsedInt;
    }
    if (normalizedType === 'number') {
      const parsedNum = Number(rawValue);
      return Number.isFinite(parsedNum) ? parsedNum : 0;
    }
    if (normalizedType === 'boolean') {
      if (typeof rawValue === 'boolean') return rawValue;
      const str = String(rawValue || '').trim().toLowerCase();
      return str === 'true' || str === '1' || str === 'yes';
    }
    return rawValue == null ? '' : String(rawValue);
  }

  function getPresetsForNodeType(nodeType) {
    const key = String(nodeType || 'shape').toLowerCase();
    const list = SHAPE_PRESET_CATALOG[key] || SHAPE_PRESET_CATALOG.shape;
    return list.map(function (item) {
      return { ...item };
    });
  }

  function getPresetDefinition(nodeType, presetName) {
    const list = getPresetsForNodeType(nodeType);
    return list.find(function (item) { return item.name === presetName; }) || null;
  }

  function buildPresetFieldEntry(nodeType, presetName, overrideValue) {
    const def = getPresetDefinition(nodeType, presetName);
    if (!def) {
      throw new Error(`Preset field '${presetName}' is not registered for shape type '${nodeType}'.`);
    }
    const rawVal = overrideValue !== undefined ? overrideValue : def.defaultValue;
    return {
      name: def.name,
      label: def.label,
      type: def.type,
      role: def.role || 'attribute',
      value: coerceFieldValue(rawVal, def.type)
    };
  }

  function buildCustomFieldEntry(fieldName, fieldType, rawValue) {
    const cleanName = String(fieldName || '').trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!cleanName || cleanName.startsWith('_') || FORBIDDEN_FIELD_NAMES.has(cleanName)) {
      throw new Error(`Invalid or reserved custom field identifier: '${cleanName || fieldName}'.`);
    }
    const cleanType = CUSTOM_FIELD_TYPES.includes(String(fieldType || '').trim().toLowerCase())
      ? String(fieldType).trim().toLowerCase()
      : 'string';

    return {
      name: cleanName,
      type: cleanType,
      kind: 'constant',
      value: coerceFieldValue(rawValue, cleanType)
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Stop Condition Builder & Runtime Evaluator
  // ---------------------------------------------------------------------------
  function buildStopCondition(config = {}) {
    const type = String(config.type || config.stop_condition_type || 'always').trim().toLowerCase();
    const validIds = STOP_CONDITION_TYPES.map(function (t) { return t.id; });
    const resolvedType = validIds.includes(type) ? type : 'always';

    return {
      type: resolvedType,
      variableName: String(config.variableName ?? config.stop_variable ?? '').trim(),
      targetValue: config.targetValue !== undefined
        ? String(config.targetValue).trim()
        : (config.stop_target_value !== undefined ? String(config.stop_target_value).trim() : ''),
      maxTimeMs: Number.isFinite(Number(config.maxTimeMs ?? config.max_time_ms))
        ? Math.max(0, parseInt(config.maxTimeMs ?? config.max_time_ms, 10))
        : 0
    };
  }

  /**
   * Evaluates whether an End (Stop) node's stop condition is satisfied.
   * @param {Object} endNode - End node containing stopCondition or presetFields
   * @param {Object} context - Runtime variable context (includes time_running in ms)
   * @returns {Object} { shouldStop: boolean, reason: string, conditionType: string }
   */
  function evaluateStopCondition(endNode, context = {}) {
    const cond = buildStopCondition(endNode && endNode.stopCondition ? endNode.stopCondition : {});
    const timeRunning = Number(context.time_running || 0);

    if (cond.type === 'always') {
      return {
        shouldStop: true,
        conditionType: 'always',
        reason: 'End node reached (immediate stop).'
      };
    }

    if (cond.type === 'time_running') {
      const targetMs = cond.maxTimeMs || Number(cond.targetValue) || 0;
      const met = timeRunning >= targetMs;
      return {
        shouldStop: met,
        conditionType: 'time_running',
        reason: met
          ? `time_running (${timeRunning}ms) >= threshold (${targetMs}ms).`
          : `time_running (${timeRunning}ms) < threshold (${targetMs}ms).`
      };
    }

    if (cond.type === 'variable_equals') {
      const varName = cond.variableName;
      const actualVal = context[varName];
      const met = Boolean(varName) && actualVal !== undefined && String(actualVal) === String(cond.targetValue);
      return {
        shouldStop: met,
        conditionType: 'variable_equals',
        reason: met
          ? `Variable '${varName}' (${actualVal}) == '${cond.targetValue}'.`
          : `Variable '${varName}' (${actualVal}) != '${cond.targetValue}'.`
      };
    }

    if (cond.type === 'variable_gte') {
      const varName = cond.variableName;
      const actualNum = Number(context[varName]);
      const targetNum = Number(cond.targetValue);
      const met = Boolean(varName) && Number.isFinite(actualNum) && Number.isFinite(targetNum) && actualNum >= targetNum;
      return {
        shouldStop: met,
        conditionType: 'variable_gte',
        reason: met
          ? `Variable '${varName}' (${actualNum}) >= ${targetNum}.`
          : `Variable '${varName}' (${actualNum}) < ${targetNum}.`
      };
    }

    return {
      shouldStop: true,
      conditionType: cond.type,
      reason: 'Default stop condition.'
    };
  }

  // ---------------------------------------------------------------------------
  // 5. Preset Execution Helper (Applies Shape Preset Functions During Flow)
  //    Note: Custom fields are strictly constants and do nothing at runtime.
  // ---------------------------------------------------------------------------
  function executeNodePresets(node, context) {
    if (!node || !Array.isArray(node.presetFields) || node.presetFields.length === 0) {
      return null;
    }

    const presetMap = Object.create(null);
    node.presetFields.forEach(function (pf) {
      if (pf && pf.name && !FORBIDDEN_FIELD_NAMES.has(pf.name)) {
        presetMap[pf.name] = pf.value;
      }
    });

    if (node.type === 'start') {
      if (presetMap.initial_payload !== undefined) {
        context.initial_payload = presetMap.initial_payload;
      }
      return { applied: 'start_presets', presetMap: { ...presetMap } };
    }

    if (node.type === 'shape') {
      const fn = presetMap.action_fn || 'noop';
      const rawTargetVar = String(presetMap.target_variable || 'last_step').trim();
      const targetVar = FORBIDDEN_FIELD_NAMES.has(rawTargetVar) ? 'last_step' : rawTargetVar;
      const param = presetMap.action_param !== undefined ? presetMap.action_param : node.label;

      if (fn === 'set_var' || fn === 'transform') {
        context[targetVar] = param;
      } else if (fn === 'append_tag') {
        const existing = context[targetVar] ? String(context[targetVar]) + ',' : '';
        context[targetVar] = existing + String(param);
      }
      return { applied: fn, targetVariable: targetVar, value: context[targetVar] };
    }

    return { applied: 'preset_attributes', presetMap: { ...presetMap } };
  }

  // ---------------------------------------------------------------------------
  // 6. Sanitized Node Options Schema Export & Import (BEJSON 104a)
  //    Strictly strips all personal identifiers, UUIDs, session specifics,
  //    spatial coordinates, and instance values. Exports only the structural
  //    option definitions (field_category, field_name, field_type, field_role).
  // ---------------------------------------------------------------------------
  const NODE_OPTIONS_SCHEMA_FIELDS = [
    { name: 'field_category', type: 'string' },
    { name: 'field_name',     type: 'string' },
    { name: 'field_type',     type: 'string' },
    { name: 'field_role',     type: 'string' }
  ];

  function buildBlankTypeDefault(fieldType) {
    const t = String(fieldType || 'string').toLowerCase();
    if (t === 'integer' || t === 'number') return 0;
    if (t === 'boolean') return false;
    return '';
  }

  /**
   * Build a sanitized BEJSON 104a Node Options Schema from a node object.
   * Contains NO personal identifiers, NO UUIDs, NO session IDs, NO labels/coords, and NO values.
   * @param {Object} node - Flow node instance
   * @returns {Object} Valid BEJSON 104a document containing only structural option definitions
   */
  function exportNodeOptionsSchema(node) {
    if (!node || typeof node !== 'object') {
      throw new Error('exportNodeOptionsSchema requires a valid node object.');
    }

    const nodeType = String(node.type || 'shape').trim().toLowerCase();
    const rows = [];

    // 1. Preset field definitions (stripped of values)
    const presets = Array.isArray(node.presetFields) ? node.presetFields : [];
    presets.forEach(function (pf) {
      if (!pf || !pf.name) return;
      const cleanName = String(pf.name).trim();
      if (!cleanName || FORBIDDEN_FIELD_NAMES.has(cleanName)) return;
      rows.push([
        'preset',
        cleanName,
        String(pf.type || 'string').trim().toLowerCase(),
        String(pf.role || 'attribute').trim().toLowerCase()
      ]);
    });

    // 2. Custom field definitions (stripped of values)
    const customs = Array.isArray(node.customFields) ? node.customFields : [];
    customs.forEach(function (cf) {
      if (!cf || !cf.name) return;
      const cleanName = String(cf.name).trim();
      if (!cleanName || FORBIDDEN_FIELD_NAMES.has(cleanName)) return;
      rows.push([
        'custom',
        cleanName,
        String(cf.type || 'string').trim().toLowerCase(),
        'constant'
      ]);
    });

    // 3. End node stop condition structural type (without runtime threshold or variable values)
    if (nodeType === 'end' && node.stopCondition && node.stopCondition.type) {
      rows.push([
        'stop_condition',
        String(node.stopCondition.type).trim().toLowerCase(),
        'string',
        'function'
      ]);
    }

    return {
      Format: 'BEJSON',
      Format_Version: '104a',
      Format_Creator: 'Elton Boehnen',
      Node_Type: nodeType,
      Records_Type: ['flow_node_options_schema'],
      Fields: NODE_OPTIONS_SCHEMA_FIELDS.map(function (f) { return { ...f }; }),
      Values: rows
    };
  }

  /**
   * Parse and validate a sanitized BEJSON 104a Node Options Schema document.
   * Uses BEJSON Core O(1) field-map cache resolution and returns structural preset,
   * custom, and stop_condition definitions with blank/type-default values.
   * @param {Object|string} schemaInput - BEJSON 104a object or JSON string
   * @param {string} [targetNodeType] - Optional target node type for preset lookup
   * @returns {Object} { nodeType, presetFields: Array, customFields: Array, stopConditionType: string|null }
   */
  function parseNodeOptionsSchema(schemaInput, targetNodeType) {
    const doc = (typeof schemaInput === 'string') ? JSON.parse(schemaInput) : schemaInput;
    if (!doc || typeof doc !== 'object' || doc.Format !== 'BEJSON') {
      throw new Error('Invalid Node Options Schema: must be a valid BEJSON 104a document.');
    }
    if (!Array.isArray(doc.Fields) || !Array.isArray(doc.Values)) {
      throw new Error('Invalid Node Options Schema: missing Fields or Values arrays.');
    }

    const fMap = (Core && typeof Core.bejson_core_get_field_map === 'function')
      ? Core.bejson_core_get_field_map({ Fields: doc.Fields })
      : (function () {
          const fallbackMap = Object.create(null);
          doc.Fields.forEach(function (f, idx) {
            if (f && f.name) fallbackMap[String(f.name).trim()] = idx;
          });
          return fallbackMap;
        })();

    if (fMap.field_category === undefined || fMap.field_name === undefined || fMap.field_type === undefined) {
      throw new Error('Invalid Node Options Schema: required columns field_category, field_name, field_type missing.');
    }

    const resolvedNodeType = String(targetNodeType || doc.Node_Type || 'shape').trim().toLowerCase();
    const presetFields = [];
    const customFields = [];
    let stopConditionType = null;

    doc.Values.forEach(function (row) {
      if (!Array.isArray(row)) return;
      const category = String(row[fMap.field_category] || '').trim().toLowerCase();
      const rawName = String(row[fMap.field_name] || '').trim();
      const type = String(row[fMap.field_type] || 'string').trim().toLowerCase();
      const role = fMap.field_role !== undefined ? String(row[fMap.field_role] || 'attribute').trim() : 'attribute';

      if (!rawName || FORBIDDEN_FIELD_NAMES.has(rawName)) return;

      if (category === 'preset') {
        const def = getPresetDefinition(resolvedNodeType, rawName);
        if (!def) {
          return; // Ignore unknown or mismatched preset fields for this shape type
        }
        presetFields.push({
          name: def.name,
          label: def.label,
          type: def.type,
          role: def.role || role,
          value: buildBlankTypeDefault(def.type)
        });
      } else if (category === 'custom') {
        const cleanCustomName = rawName.replace(/[^a-zA-Z0-9_]/g, '_');
        if (!cleanCustomName || cleanCustomName.startsWith('_') || FORBIDDEN_FIELD_NAMES.has(cleanCustomName)) {
          return;
        }
        const cleanType = CUSTOM_FIELD_TYPES.includes(type) ? type : 'string';
        customFields.push({
          name: cleanCustomName,
          type: cleanType,
          kind: 'constant',
          value: buildBlankTypeDefault(cleanType)
        });
      } else if (category === 'stop_condition') {
        const validStops = STOP_CONDITION_TYPES.map(function (s) { return s.id; });
        if (validStops.includes(rawName.toLowerCase())) {
          stopConditionType = rawName.toLowerCase();
        }
      }
    });

    return {
      nodeType: resolvedNodeType,
      presetFields: presetFields,
      customFields: customFields,
      stopConditionType: stopConditionType
    };
  }

  const FlowPresetsExports = {
    VERSION: '1.1.0',
    CUSTOM_FIELD_TYPES: CUSTOM_FIELD_TYPES,
    STOP_CONDITION_TYPES: STOP_CONDITION_TYPES,
    SHAPE_PRESET_CATALOG: SHAPE_PRESET_CATALOG,
    NODE_OPTIONS_SCHEMA_FIELDS: NODE_OPTIONS_SCHEMA_FIELDS,
    coerceFieldValue: coerceFieldValue,
    buildBlankTypeDefault: buildBlankTypeDefault,
    getPresetsForNodeType: getPresetsForNodeType,
    getPresetDefinition: getPresetDefinition,
    buildPresetFieldEntry: buildPresetFieldEntry,
    buildCustomFieldEntry: buildCustomFieldEntry,
    buildStopCondition: buildStopCondition,
    evaluateStopCondition: evaluateStopCondition,
    executeNodePresets: executeNodePresets,
    exportNodeOptionsSchema: exportNodeOptionsSchema,
    parseNodeOptionsSchema: parseNodeOptionsSchema
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowPresetsExports;
  }
  if (typeof window !== 'undefined') {
    window.BEJSON_CANVAS_FLOW_PRESETS = FlowPresetsExports;
  }
})();
