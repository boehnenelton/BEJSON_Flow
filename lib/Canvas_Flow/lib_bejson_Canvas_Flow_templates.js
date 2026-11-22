/**
 * Library:        lib_bejson_Canvas_Flow_templates.js
 * Family:         Canvas_Flow
 * Description:    Standardized Flow Graph Starter Templates (Linear Pipeline,
 *                 Feature Gate Branching, and Counter Accumulator Loop).
 * Version:        1.0.0
 * Date Created:   2026-11-22
 * Author:         Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
 * Format_Creator: Elton Boehnen
 * RELATIONAL_ID:  7b2a9411-cf55-4e33-9988-1a2b3c4d5e6f
 * License:        PolyForm Noncommercial License 1.0.0 (PolyForm-Noncommercial-1.0.0)
 */

'use strict';

(function () {
  const FlowCore = (typeof require !== 'undefined')
    ? require('./lib_bejson_Canvas_Flow_core.js')
    : (typeof window !== 'undefined' ? window.BEJSON_CANVAS_FLOW : null);

  /**
   * Template 1: Linear Pipeline
   * Structure: Start -> Step 1 -> Step 2 -> End
   * @param {Object} [options]
   * @returns {Object} Initialized flowStore with linear pipeline
   */
  function createLinearPipeline(options = {}) {
    const store = FlowCore.createFlowStore({
      name: options.name || 'linear_pipeline',
      stageWidth: options.stageWidth || 1280,
      stageHeight: options.stageHeight || 720
    });

    const initialConnectors = store.getConnectors();
    if (initialConnectors.length > 0) {
      // Insert Process Step 1 on the default Start -> End connector
      const step1 = store.addNodeOnConnector(initialConnectors[0].id, {
        label: options.step1Label || 'Transform Data'
      });

      // Split the Step 1 -> End connector to add Process Step 2
      const step2 = store.addNodeOnConnector(step1.newConnectors[1].id, {
        label: options.step2Label || 'Validate Output'
      });
    }

    return store;
  }

  /**
   * Template 2: Feature Gate Branching
   * Structure: Start -> Feature Gate (Redirect) -> [Primary / Alternate Branch] -> End
   * @param {Object} [options]
   * @returns {Object} Initialized flowStore with feature gate branching
   */
  function createFeatureGate(options = {}) {
    const store = FlowCore.createFlowStore({
      name: options.name || 'feature_gate_flow',
      stageWidth: options.stageWidth || 1280,
      stageHeight: options.stageHeight || 720
    });

    const initialConnectors = store.getConnectors();
    if (initialConnectors.length > 0) {
      const gate = store.addRedirectNodeOnConnector(initialConnectors[0].id, {
        label: options.gateLabel || 'Beta Flag Gate',
        featureFlag: options.featureFlag || 'beta_enabled',
        redirectKey: 'is_enabled'
      });

      // Add alternate fallback shape
      const nodes = store.getNodes();
      const endNode = nodes.find(n => n.type === 'end');
      if (endNode) {
        store.addRedirectBranch(gate.newNode.id, endNode.id, 'alternate');
      }
    }

    return store;
  }

  /**
   * Template 3: Counter Accumulator Loop
   * Structure: Start -> Variable Counter (+1) -> Redirection Threshold -> End
   * @param {Object} [options]
   * @returns {Object} Initialized flowStore with variable counter
   */
  function createAccumulatorLoop(options = {}) {
    const store = FlowCore.createFlowStore({
      name: options.name || 'accumulator_flow',
      stageWidth: options.stageWidth || 1280,
      stageHeight: options.stageHeight || 720
    });

    const initialConnectors = store.getConnectors();
    if (initialConnectors.length > 0) {
      const varNode = store.addVariableNodeOnConnector(initialConnectors[0].id, {
        variableName: options.counterName || 'iteration_count',
        mode: 'counter',
        initialValue: 0,
        incrementBy: 1,
        label: options.counterLabel || 'Loop Counter'
      });

      store.addRedirectNodeOnConnector(varNode.newConnectors[1].id, {
        label: options.thresholdLabel || 'Threshold Gate',
        featureFlag: options.featureFlag || 'threshold_met',
        redirectKey: 'is_done'
      });
    }

    return store;
  }

  const FlowTemplatesExports = {
    VERSION: '1.0.0',
    createLinearPipeline: createLinearPipeline,
    createFeatureGate: createFeatureGate,
    createAccumulatorLoop: createAccumulatorLoop
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FlowTemplatesExports;
  }
  if (typeof window !== 'undefined') {
    window.BEJSON_CANVAS_FLOW_TEMPLATES = FlowTemplatesExports;
  }
})();
