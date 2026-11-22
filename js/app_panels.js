/**
 * Module: js/app_panels.js
 * Purpose: Startup File Gate modal, View Objects overlay panel, View Schema overlay panel,
 *          Insert Component overlay panel (including Loopback & multi-anchor insertion),
 *          Long-Press Node Properties overlay panel (Preset Fields, Custom Constant Fields,
 *          and End Node Stop Condition), and BEJSON flow import/export triggers.
 */

(function () {
  'use strict';

  function init(ctx) {
    const store = ctx.store;
    const state = store.state;
    const stage = ctx.stage;
    const onPanelsChanged = ctx.onPanelsChanged || function () {};
    const FlowPresets = window.BEJSON_CANVAS_FLOW_PRESETS || null;

    const panelState = {
      showObjects: false,
      showSchema: false,
      showNodeProps: false,
      schemaTab: 'positions' // 'positions' (BEJSON flow doc) | 'manifest' | 'mfdb132'
    };

    // DOM elements
    const startupGate = document.getElementById('be-startup-gate');
    const startupDbInput = document.getElementById('be-startup-dbname');
    const startupCreateBtn = document.getElementById('be-startup-create');
    const startupImportBtn = document.getElementById('be-startup-import');
    const startupError = document.getElementById('be-startup-error');
    const startupCancelBtn = document.getElementById('be-startup-cancel');

    const fileInput = document.getElementById('be-mfdb-file-input');
    const menubarStatus = document.getElementById('be-menubar-status');

    // Objects panel
    const objectsPanel = document.getElementById('be-panel-objects');
    const objectsCountBadge = document.getElementById('be-objects-count');
    const objectsListEl = document.getElementById('be-objects-list');
    const objectsEmptyEl = document.getElementById('be-objects-empty');
    const objectsCloseBtn = document.getElementById('be-panel-objects-close');

    // Schema panel
    const schemaPanel = document.getElementById('be-panel-schema');
    const schemaPreEl = document.getElementById('be-schema-pre');
    const schemaValidEl = document.getElementById('be-schema-valid');
    const schemaCopyBtn = document.getElementById('be-schema-copy');
    const schemaExportBtn = document.getElementById('be-schema-export');
    const schemaCloseBtn = document.getElementById('be-panel-schema-close');
    const schemaTabBtns = Array.from(document.querySelectorAll('[data-schema-tab]'));

    // Insert Component panel
    const insertPanel = document.getElementById('be-panel-insert-node');
    const insertCloseBtn = document.getElementById('be-panel-insert-close');
    const insertCancelBtn = document.getElementById('be-panel-insert-cancel');
    const insertSubmitBtn = document.getElementById('be-panel-insert-submit');
    const compOptionCards = Array.from(document.querySelectorAll('#be-comp-options .be-component-card'));
    const compRadios = Array.from(document.querySelectorAll('input[name="flow-comp-choice"]'));
    const nodeLabelInput = document.getElementById('be-node-label-input');
    const redirectOptions = document.getElementById('be-redirect-options');
    const featureFlagInput = document.getElementById('be-feature-flag-input');
    const variableOptions = document.getElementById('be-variable-options');
    const varModeSelect = document.getElementById('be-var-mode-select');
    const loopbackOptions = document.getElementById('be-loopback-options');
    const loopbackTargetSelect = document.getElementById('be-loopback-target-select');
    const loopbackCountInput = document.getElementById('be-loopback-count-input');

    // Node Properties panel (Long-Press Inspector)
    const propsPanel = document.getElementById('be-panel-node-props');
    const propsTitleEl = document.getElementById('be-props-title');
    const propsTypeBadge = document.getElementById('be-props-type-badge');
    const propsMetaEl = document.getElementById('be-props-meta');
    const propsCloseBtn = document.getElementById('be-panel-props-close');
    const propsDoneBtn = document.getElementById('be-panel-props-done');
    const propsLabelInput = document.getElementById('be-props-label-input');
    const propsLabelSaveBtn = document.getElementById('be-props-label-save');

    // End Node Stop Condition controls
    const propsStopSection = document.getElementById('be-props-stop-section');
    const stopCondTypeSelect = document.getElementById('be-stop-cond-type');
    const stopVarInput = document.getElementById('be-stop-var-input');
    const stopTargetInput = document.getElementById('be-stop-target-input');
    const stopTimeInput = document.getElementById('be-stop-time-input');
    const stopCondSaveBtn = document.getElementById('be-stop-cond-save');

    // Preset Fields controls
    const presetSelect = document.getElementById('be-preset-select');
    const presetAddBtn = document.getElementById('be-preset-add-btn');
    const presetFieldsListEl = document.getElementById('be-preset-fields-list');
    const presetFieldsEmptyEl = document.getElementById('be-preset-fields-empty');

    // Custom Fields controls
    const customNameInput = document.getElementById('be-custom-name-input');
    const customTypeSelect = document.getElementById('be-custom-type-select');
    const customValInput = document.getElementById('be-custom-val-input');
    const customAddBtn = document.getElementById('be-custom-add-btn');
    const customFieldsListEl = document.getElementById('be-custom-fields-list');
    const customFieldsEmptyEl = document.getElementById('be-custom-fields-empty');

    // Sanitized Node Options Schema Export / Import controls
    const nodeSchemaSelectAllBtn = document.getElementById('be-node-schema-select-all');
    const nodeSchemaCopyBtn = document.getElementById('be-node-schema-copy');
    const nodeSchemaExportBtn = document.getElementById('be-node-schema-export');
    const nodeSchemaImportFileBtn = document.getElementById('be-node-schema-import-file');
    const nodeSchemaApplyTextBtn = document.getElementById('be-node-schema-apply-text');
    const nodeSchemaTextarea = document.getElementById('be-node-schema-textarea');
    const nodeSchemaStatusEl = document.getElementById('be-node-schema-status');
    const nodeOptionsFileInput = document.getElementById('be-node-options-file-input');

    let activeAnchorConnectorId = null;
    let activeAnchorIndex = 0;
    let activePropsNodeId = null;

    /* ---------------------------------------------------------
       Draggable Overlay Panels
       --------------------------------------------------------- */
    function makePanelDraggable(panelEl) {
      if (!panelEl) return;
      const header = panelEl.querySelector('.be-panel__header');
      if (!header) return;

      let drag = null;

      header.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button')) return;
        const parentRect = (panelEl.offsetParent || document.body).getBoundingClientRect();
        const rect = panelEl.getBoundingClientRect();
        drag = {
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          parentRect: parentRect
        };
        panelEl.style.right = 'auto';
        panelEl.style.transform = 'none';
        panelEl.style.left = `${rect.left - parentRect.left}px`;
        panelEl.style.top = `${rect.top - parentRect.top}px`;
        if (header.setPointerCapture && e.pointerId !== undefined) {
          try { header.setPointerCapture(e.pointerId); } catch (_err) {}
        }
      });

      header.addEventListener('pointermove', function (e) {
        if (!drag) return;
        const maxX = Math.max(0, drag.parentRect.width - panelEl.offsetWidth);
        const maxY = Math.max(0, drag.parentRect.height - panelEl.offsetHeight);
        const nextX = Math.max(0, Math.min(maxX, e.clientX - drag.parentRect.left - drag.offsetX));
        const nextY = Math.max(0, Math.min(maxY, e.clientY - drag.parentRect.top - drag.offsetY));
        panelEl.style.left = `${nextX}px`;
        panelEl.style.top = `${nextY}px`;
      });

      header.addEventListener('pointerup', function (e) {
        if (drag) {
          drag = null;
          if (header.hasPointerCapture && e.pointerId !== undefined) {
            try {
              if (header.hasPointerCapture(e.pointerId)) {
                header.releasePointerCapture(e.pointerId);
              }
            } catch (_err) {}
          }
        }
      });
    }

    makePanelDraggable(objectsPanel);
    makePanelDraggable(schemaPanel);
    makePanelDraggable(insertPanel);

    /* ---------------------------------------------------------
       Startup File Gate & File Import
       --------------------------------------------------------- */
    function showStartupError(msg) {
      if (!msg) {
        startupError.textContent = '';
        startupError.classList.add('be-hidden');
      } else {
        startupError.textContent = msg;
        startupError.classList.remove('be-hidden');
      }
    }

    function openStartupGate(allowCancel) {
      showStartupError('');
      startupDbInput.value = state.isInitialized ? '' : 'untitled_flow';
      startupCancelBtn.classList.toggle('be-hidden', !allowCancel);
      startupGate.classList.remove('be-hidden');
      setTimeout(function () { startupDbInput.focus(); }, 0);
    }

    function closeStartupGate() {
      startupGate.classList.add('be-hidden');
      showStartupError('');
    }

    function handleCreateNew() {
      const rawName = startupDbInput.value.trim() || 'untitled_flow';
      store.createNewFile(rawName, stage.clientWidth, stage.clientHeight);
      closeStartupGate();
    }

    startupCreateBtn.addEventListener('click', handleCreateNew);
    startupDbInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreateNew();
      }
    });

    if (startupImportBtn && fileInput) {
      startupImportBtn.addEventListener('click', function () {
        fileInput.click();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          try {
            const parsed = JSON.parse(String(ev.target.result || ''));
            if (store.importBejson) {
              store.importBejson(parsed);
            }
            closeStartupGate();
          } catch (err) {
            showStartupError(`Import error: ${err.message}`);
          } finally {
            fileInput.value = '';
          }
        };
        reader.readAsText(file);
      });
    }

    startupCancelBtn.addEventListener('click', function () {
      if (state.isInitialized) closeStartupGate();
    });

    /* ---------------------------------------------------------
       Insert Component Panel (Midpoint & Loopback Anchor Dots)
       --------------------------------------------------------- */
    function populateLoopbackTargetSelect(connectorId) {
      if (!loopbackTargetSelect) return;
      loopbackTargetSelect.innerHTML = '';
      const nodes = store.getNodes ? store.getNodes() : [];
      const connectors = store.getConnectors ? store.getConnectors() : [];
      const activeConn = connectors.find(function (c) { return c.id === connectorId; });
      const defaultSourceId = activeConn ? activeConn.sourceId : null;

      nodes.forEach(function (n) {
        if (n.type === 'end') return;
        const opt = document.createElement('option');
        opt.value = String(n.id);
        opt.textContent = `[${n.id}] ${n.label} (${n.type.toUpperCase()})`;
        if (n.id === defaultSourceId) opt.selected = true;
        loopbackTargetSelect.appendChild(opt);
      });
    }

    function openInsertNodePanel(connectorId, anchorIndex) {
      activeAnchorConnectorId = connectorId;
      activeAnchorIndex = Number.isInteger(anchorIndex) ? anchorIndex : 0;
      populateLoopbackTargetSelect(connectorId);
      syncCompChoice('shape');
      if (insertPanel) {
        insertPanel.style.transform = 'translate(-50%, -50%)';
        insertPanel.style.top = '50%';
        insertPanel.style.left = '50%';
        insertPanel.classList.remove('be-hidden');
        if (nodeLabelInput) {
          setTimeout(function () {
            nodeLabelInput.focus();
            nodeLabelInput.select();
          }, 0);
        }
      }
    }

    function closeInsertNodePanel() {
      activeAnchorConnectorId = null;
      activeAnchorIndex = 0;
      if (insertPanel) insertPanel.classList.add('be-hidden');
    }

    function syncCompChoice(chosenType) {
      compOptionCards.forEach(function (card) {
        const isMatch = card.dataset.compType === chosenType;
        card.classList.toggle('be-component-card--selected', isMatch);
        const r = card.querySelector('input[type="radio"]');
        if (r) r.checked = isMatch;
      });

      if (redirectOptions) redirectOptions.classList.toggle('be-hidden', chosenType !== 'redirect');
      if (variableOptions) variableOptions.classList.toggle('be-hidden', chosenType !== 'variable');
      if (loopbackOptions) loopbackOptions.classList.toggle('be-hidden', chosenType !== 'loopback');

      if (nodeLabelInput) {
        if (chosenType === 'shape') nodeLabelInput.value = 'Process Step';
        else if (chosenType === 'redirect') nodeLabelInput.value = 'Feature Gate';
        else if (chosenType === 'variable') nodeLabelInput.value = 'Counter';
        else if (chosenType === 'loopback') nodeLabelInput.value = 'Loopback Step';
      }
    }

    compOptionCards.forEach(function (card) {
      card.addEventListener('click', function () {
        syncCompChoice(card.dataset.compType);
      });
    });

    compRadios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        syncCompChoice(radio.value);
      });
    });

    if (insertCloseBtn) insertCloseBtn.addEventListener('click', closeInsertNodePanel);
    if (insertCancelBtn) insertCancelBtn.addEventListener('click', closeInsertNodePanel);

    if (insertSubmitBtn) {
      insertSubmitBtn.addEventListener('click', function () {
        if (activeAnchorConnectorId == null) return;
        const chosen = document.querySelector('input[name="flow-comp-choice"]:checked');
        const compType = chosen ? chosen.value : 'shape';
        const label = (nodeLabelInput ? nodeLabelInput.value.trim() : '') || 'Node';

        if (compType === 'shape') {
          store.addNodeOnConnector(activeAnchorConnectorId, {
            type: 'shape',
            label: label,
            anchorIndex: activeAnchorIndex
          });
        } else if (compType === 'redirect') {
          const flag = (featureFlagInput ? featureFlagInput.value.trim() : '') || 'feature_active';
          store.addRedirectNodeOnConnector(activeAnchorConnectorId, {
            label: label,
            featureFlag: flag,
            anchorIndex: activeAnchorIndex
          });
        } else if (compType === 'variable') {
          const mode = varModeSelect ? varModeSelect.value : 'counter';
          store.addVariableNodeOnConnector(activeAnchorConnectorId, {
            label: label,
            mode: mode,
            variableName: label.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'var_count',
            anchorIndex: activeAnchorIndex
          });
        } else if (compType === 'loopback') {
          const targetId = loopbackTargetSelect ? Number(loopbackTargetSelect.value) : undefined;
          const maxLoops = loopbackCountInput ? Math.max(1, parseInt(loopbackCountInput.value, 10) || 2) : 2;
          store.addLoopbackNodeOnConnector(activeAnchorConnectorId, {
            label: label,
            loopbackTargetId: targetId,
            loopCountMax: maxLoops,
            anchorIndex: activeAnchorIndex
          });
        }

        closeInsertNodePanel();
      });
    }

    /* ---------------------------------------------------------
       Long-Press Node Properties Full-Screen Overlay Panel
       --------------------------------------------------------- */
    function openNodePropertiesPanel(nodeId) {
      const targetId = Number(nodeId);
      const node = store.getNodeById ? store.getNodeById(targetId) : null;
      if (!node || !propsPanel) return;

      activePropsNodeId = targetId;
      panelState.showNodeProps = true;
      if (store.selectNode) store.selectNode(targetId);

      renderNodePropertiesPanel();

      propsPanel.classList.remove('be-hidden');
    }

    function closeNodePropertiesPanel() {
      activePropsNodeId = null;
      panelState.showNodeProps = false;
      if (propsPanel) propsPanel.classList.add('be-hidden');
    }

    function renderNodePropertiesPanel() {
      if (!panelState.showNodeProps || activePropsNodeId == null) return;
      const node = store.getNodeById ? store.getNodeById(activePropsNodeId) : null;
      if (!node) {
        closeNodePropertiesPanel();
        return;
      }

      if (propsTitleEl) propsTitleEl.textContent = `Node [${node.id}] Properties`;
      if (propsTypeBadge) propsTypeBadge.textContent = node.type.toUpperCase();
      if (propsMetaEl) {
        propsMetaEl.textContent = `ID: ${node.id} | Type: ${node.type.toUpperCase()} | Center: (${Math.round(node.cx)}, ${Math.round(node.cy)})`;
      }
      if (propsLabelInput) propsLabelInput.value = node.label || '';

      // 1. End Node Stop Condition Section
      const isEndNode = node.type === 'end';
      if (propsStopSection) {
        propsStopSection.classList.toggle('be-hidden', !isEndNode);
        if (isEndNode) {
          const sc = node.stopCondition || { type: 'always', variableName: '', targetValue: '', maxTimeMs: 0 };
          if (stopCondTypeSelect) stopCondTypeSelect.value = sc.type || 'always';
          if (stopVarInput) stopVarInput.value = sc.variableName || '';
          if (stopTargetInput) stopTargetInput.value = sc.targetValue || '';
          if (stopTimeInput) stopTimeInput.value = String(sc.maxTimeMs ?? 500);
        }
      }

      // 2. Populate Shape-Specific Preset Dropdown
      if (presetSelect) {
        presetSelect.innerHTML = '';
        const catalog = (FlowPresets && typeof FlowPresets.getPresetsForNodeType === 'function')
          ? FlowPresets.getPresetsForNodeType(node.type)
          : [];
        catalog.forEach(function (presetDef) {
          const opt = document.createElement('option');
          opt.value = presetDef.name;
          opt.textContent = `${presetDef.name} (${presetDef.type} · ${presetDef.role})`;
          presetSelect.appendChild(opt);
        });
      }

      // 3. Render Added Preset Fields on this Node's Diagram Entry
      if (presetFieldsListEl && presetFieldsEmptyEl) {
        presetFieldsListEl.innerHTML = '';
        const presets = Array.isArray(node.presetFields) ? node.presetFields : [];
        if (presets.length === 0) {
          presetFieldsEmptyEl.classList.remove('be-hidden');
        } else {
          presetFieldsEmptyEl.classList.add('be-hidden');
          presets.forEach(function (pf) {
            const li = document.createElement('li');
            li.className = 'be-field-item';
            li.dataset.presetName = pf.name;

            const topRow = document.createElement('div');
            topRow.className = 'be-field-item__header';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'be-field-item__name';
            nameSpan.textContent = `${pf.name} [${pf.type}] (${pf.role || 'preset'})`;

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'be-btn-mini';
            delBtn.textContent = '×';
            delBtn.title = `Remove Preset ${pf.name}`;
            delBtn.addEventListener('click', function () {
              store.removePresetField(node.id, pf.name);
              renderNodePropertiesPanel();
            });

            topRow.appendChild(nameSpan);
            topRow.appendChild(delBtn);

            const editRow = document.createElement('div');
            editRow.className = 'be-inline-row';

            const valInput = document.createElement('input');
            valInput.type = 'text';
            valInput.className = 'be-input be-input--sm be-preset-val-input';
            valInput.dataset.presetName = pf.name;
            valInput.value = String(pf.value ?? '');

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'be-btn-mini be-preset-save-btn';
            saveBtn.dataset.presetName = pf.name;
            saveBtn.textContent = 'Set';
            saveBtn.addEventListener('click', function () {
              store.addOrUpdatePresetField(node.id, pf.name, valInput.value);
              renderNodePropertiesPanel();
            });

            editRow.appendChild(valInput);
            editRow.appendChild(saveBtn);

            li.appendChild(topRow);
            li.appendChild(editRow);
            presetFieldsListEl.appendChild(li);
          });
        }
      }

      // 4. Render Added Custom Constant Fields on this Node's Diagram Entry
      if (customFieldsListEl && customFieldsEmptyEl) {
        customFieldsListEl.innerHTML = '';
        const customs = Array.isArray(node.customFields) ? node.customFields : [];
        if (customs.length === 0) {
          customFieldsEmptyEl.classList.remove('be-hidden');
        } else {
          customFieldsEmptyEl.classList.add('be-hidden');
          customs.forEach(function (cf) {
            const li = document.createElement('li');
            li.className = 'be-field-item';
            li.dataset.customName = cf.name;

            const topRow = document.createElement('div');
            topRow.className = 'be-field-item__header';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'be-field-item__name';
            nameSpan.textContent = `${cf.name} [${cf.type}] (constant)`;

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'be-btn-mini';
            delBtn.textContent = '×';
            delBtn.title = `Remove Custom Field ${cf.name}`;
            delBtn.addEventListener('click', function () {
              store.removeCustomField(node.id, cf.name);
              renderNodePropertiesPanel();
            });

            topRow.appendChild(nameSpan);
            topRow.appendChild(delBtn);

            const editRow = document.createElement('div');
            editRow.className = 'be-inline-row';

            const typeSel = document.createElement('select');
            typeSel.className = 'be-input be-input--sm be-input--narrow be-custom-edit-type';
            typeSel.dataset.customName = cf.name;
            ['string', 'number', 'integer', 'boolean'].forEach(function (t) {
              const o = document.createElement('option');
              o.value = t;
              o.textContent = t;
              if (t === cf.type) o.selected = true;
              typeSel.appendChild(o);
            });

            const valInput = document.createElement('input');
            valInput.type = 'text';
            valInput.className = 'be-input be-input--sm be-custom-edit-val';
            valInput.dataset.customName = cf.name;
            valInput.value = String(cf.value ?? '');

            const saveBtn = document.createElement('button');
            saveBtn.type = 'button';
            saveBtn.className = 'be-btn-mini be-custom-save-btn';
            saveBtn.dataset.customName = cf.name;
            saveBtn.textContent = 'Set';
            saveBtn.addEventListener('click', function () {
              store.addOrUpdateCustomField(node.id, cf.name, typeSel.value, valInput.value);
              renderNodePropertiesPanel();
            });

            editRow.appendChild(typeSel);
            editRow.appendChild(valInput);
            editRow.appendChild(saveBtn);

            li.appendChild(topRow);
            li.appendChild(editRow);
            customFieldsListEl.appendChild(li);
          });
        }
      }

      // 5. Render Sanitized Node Options Schema Preview (No UUIDs, No Session IDs, No Values)
      if (nodeSchemaTextarea && store.exportNodeOptionsSchema) {
        try {
          const sanitizedDoc = store.exportNodeOptionsSchema(node.id);
          nodeSchemaTextarea.value = JSON.stringify(sanitizedDoc, null, 2);
        } catch (err) {
          nodeSchemaTextarea.value = '';
        }
      }
    }

    if (propsCloseBtn) propsCloseBtn.addEventListener('click', closeNodePropertiesPanel);
    if (propsDoneBtn) propsDoneBtn.addEventListener('click', closeNodePropertiesPanel);

    if (propsLabelSaveBtn) {
      propsLabelSaveBtn.addEventListener('click', function () {
        if (activePropsNodeId == null || !propsLabelInput) return;
        store.updateNodeProperties(activePropsNodeId, {
          label: propsLabelInput.value.trim()
        });
        renderNodePropertiesPanel();
      });
    }

    if (stopCondSaveBtn) {
      stopCondSaveBtn.addEventListener('click', function () {
        if (activePropsNodeId == null) return;
        store.setEndNodeStopCondition(activePropsNodeId, {
          type: stopCondTypeSelect ? stopCondTypeSelect.value : 'always',
          variableName: stopVarInput ? stopVarInput.value.trim() : '',
          targetValue: stopTargetInput ? stopTargetInput.value.trim() : '',
          maxTimeMs: stopTimeInput ? Number(stopTimeInput.value || 0) : 0
        });
        renderNodePropertiesPanel();
      });
    }

    if (presetAddBtn) {
      presetAddBtn.addEventListener('click', function () {
        if (activePropsNodeId == null || !presetSelect || !presetSelect.value) return;
        const node = store.getNodeById(activePropsNodeId);
        if (!node) return;
        const def = FlowPresets ? FlowPresets.getPresetDefinition(node.type, presetSelect.value) : null;
        const defaultVal = def ? def.defaultValue : '';
        store.addOrUpdatePresetField(activePropsNodeId, presetSelect.value, defaultVal);
        renderNodePropertiesPanel();
      });
    }

    if (customAddBtn) {
      customAddBtn.addEventListener('click', function () {
        if (activePropsNodeId == null || !customNameInput) return;
        const rawName = customNameInput.value.trim();
        if (!rawName) return;
        const fieldType = customTypeSelect ? customTypeSelect.value : 'string';
        const rawVal = customValInput ? customValInput.value : '';
        try {
          store.addOrUpdateCustomField(activePropsNodeId, rawName, fieldType, rawVal);
          customNameInput.value = '';
          if (customValInput) customValInput.value = '';
          if (nodeSchemaStatusEl) {
            nodeSchemaStatusEl.textContent = `Added custom constant field '${rawName}' (${fieldType}).`;
          }
          renderNodePropertiesPanel();
        } catch (err) {
          if (nodeSchemaStatusEl) {
            nodeSchemaStatusEl.textContent = `Custom field error: ${err.message}`;
          }
        }
      });
    }

    // Node Options Schema Export / Import Handlers
    if (nodeSchemaSelectAllBtn && nodeSchemaTextarea) {
      nodeSchemaSelectAllBtn.addEventListener('click', function () {
        nodeSchemaTextarea.focus();
        nodeSchemaTextarea.select();
      });
    }

    if (nodeSchemaCopyBtn && nodeSchemaTextarea) {
      nodeSchemaCopyBtn.addEventListener('click', function () {
        const text = nodeSchemaTextarea.value;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            nodeSchemaCopyBtn.textContent = 'Copied';
            setTimeout(function () { nodeSchemaCopyBtn.textContent = 'Copy Schema'; }, 1200);
          }).catch(function () {});
        }
      });
    }

    if (nodeSchemaExportBtn) {
      nodeSchemaExportBtn.addEventListener('click', function () {
        if (activePropsNodeId == null || !store.exportNodeOptionsSchema) return;
        const node = store.getNodeById(activePropsNodeId);
        const sanitizedDoc = store.exportNodeOptionsSchema(activePropsNodeId);
        const jsonStr = JSON.stringify(sanitizedDoc, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `node_options_${node ? node.type : 'shape'}.104a.bejson`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      });
    }

    if (nodeSchemaApplyTextBtn && nodeSchemaTextarea) {
      nodeSchemaApplyTextBtn.addEventListener('click', function () {
        if (activePropsNodeId == null || !store.importNodeOptionsSchema) return;
        try {
          const res = store.importNodeOptionsSchema(activePropsNodeId, nodeSchemaTextarea.value, { replace: false });
          if (nodeSchemaStatusEl) {
            nodeSchemaStatusEl.textContent = `Imported schema (${res.presetCount} presets, ${res.customCount} custom fields).`;
          }
          renderNodePropertiesPanel();
        } catch (err) {
          if (nodeSchemaStatusEl) {
            nodeSchemaStatusEl.textContent = `Schema import error: ${err.message}`;
          }
        }
      });
    }

    if (nodeSchemaImportFileBtn && nodeOptionsFileInput) {
      nodeSchemaImportFileBtn.addEventListener('click', function () {
        nodeOptionsFileInput.click();
      });

      nodeOptionsFileInput.addEventListener('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file || activePropsNodeId == null) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          try {
            const rawText = String(ev.target.result || '');
            if (nodeSchemaTextarea) nodeSchemaTextarea.value = rawText;
            const res = store.importNodeOptionsSchema(activePropsNodeId, rawText, { replace: false });
            if (nodeSchemaStatusEl) {
              nodeSchemaStatusEl.textContent = `Imported file (${res.presetCount} presets, ${res.customCount} custom fields).`;
            }
            renderNodePropertiesPanel();
          } catch (err) {
            if (nodeSchemaStatusEl) {
              nodeSchemaStatusEl.textContent = `File import error: ${err.message}`;
            }
          } finally {
            nodeOptionsFileInput.value = '';
          }
        };
        reader.readAsText(file);
      });
    }

    /* ---------------------------------------------------------
       View Objects Overlay Panel
       --------------------------------------------------------- */
    function renderObjectsPanel() {
      const nodes = store.getNodes ? store.getNodes() : (state.shapes || []);
      const selectedId = state.selectedNodeId !== undefined ? state.selectedNodeId : state.selectedShapeId;

      if (objectsCountBadge) objectsCountBadge.textContent = String(nodes.length);
      if (!panelState.showObjects) return;

      objectsListEl.innerHTML = '';
      if (!nodes.length) {
        objectsEmptyEl.classList.remove('be-hidden');
        return;
      }
      objectsEmptyEl.classList.add('be-hidden');

      nodes.forEach(function (node) {
        const li = document.createElement('li');
        li.className = 'be-object-row' + (node.id === selectedId ? ' be-object-row--selected' : '');
        li.dataset.nodeId = String(node.id);

        const info = document.createElement('div');
        info.className = 'be-object-row__info';

        const nameEl = document.createElement('div');
        nameEl.className = 'be-object-row__name';
        nameEl.textContent = `[${node.id}] ${node.label}`;

        const metaEl = document.createElement('div');
        metaEl.className = 'be-object-row__meta';
        const pLen = Array.isArray(node.presetFields) ? node.presetFields.length : 0;
        const cLen = Array.isArray(node.customFields) ? node.customFields.length : 0;
        metaEl.textContent = `${node.type.toUpperCase()} | X:${Math.round(node.cx)} Y:${Math.round(node.cy)} | P:${pLen} C:${cLen}`;

        info.appendChild(nameEl);
        info.appendChild(metaEl);

        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'be-inline-row';

        const propsBtn = document.createElement('button');
        propsBtn.type = 'button';
        propsBtn.className = 'be-object-row__del';
        propsBtn.title = `Properties for Node ${node.id}`;
        propsBtn.textContent = '⚙';
        propsBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          openNodePropertiesPanel(node.id);
        });
        actionsWrap.appendChild(propsBtn);

        const isBoundary = (node.type === 'start' || node.type === 'end');
        if (!isBoundary) {
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.className = 'be-object-row__del';
          delBtn.title = `Delete Node ${node.id}`;
          delBtn.setAttribute('aria-label', `Delete Node ${node.id}`);
          delBtn.textContent = '×';
          delBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (store.deleteNode) store.deleteNode(node.id);
          });
          actionsWrap.appendChild(delBtn);
        }

        li.appendChild(info);
        li.appendChild(actionsWrap);

        li.addEventListener('click', function () {
          if (store.selectNode) store.selectNode(node.id);
        });

        objectsListEl.appendChild(li);
      });
    }

    /* ---------------------------------------------------------
       View Schema Overlay Panel (Live BEJSON 104a Flow Document)
       --------------------------------------------------------- */
    function getActiveSchemaDoc() {
      if (store.exportBejson) {
        return store.exportBejson();
      }
      return { Format: 'BEJSON', Format_Version: '104a' };
    }

    function renderSchemaPanel() {
      if (!panelState.showSchema) return;

      const doc = getActiveSchemaDoc();
      schemaPreEl.textContent = JSON.stringify(doc, null, 2);

      const val = store.validate ? store.validate() : { valid: true, errors: [] };
      const nodes = store.getNodes ? store.getNodes() : [];

      if (val.valid) {
        schemaValidEl.textContent = `VALID BEJSON FLOW (${nodes.length} NODES)`;
        schemaValidEl.classList.remove('be-schema-valid--err');
      } else {
        schemaValidEl.textContent = `INVALID (${val.errors.length} ERR)`;
        schemaValidEl.classList.add('be-schema-valid--err');
      }
    }

    schemaTabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        panelState.schemaTab = btn.dataset.schemaTab;
        schemaTabBtns.forEach(function (b) {
          b.classList.toggle('be-panel__tab--active', b === btn);
        });
        renderSchemaPanel();
      });
    });

    schemaCopyBtn.addEventListener('click', function () {
      const text = JSON.stringify(getActiveSchemaDoc(), null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          schemaCopyBtn.textContent = 'Copied';
          setTimeout(function () { schemaCopyBtn.textContent = 'Copy'; }, 1200);
        }).catch(function () {});
      }
    });

    function exportBejsonFile() {
      const doc = getActiveSchemaDoc();
      const jsonStr = JSON.stringify(doc, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.name || 'flow'}.104a.bejson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    schemaExportBtn.addEventListener('click', exportBejsonFile);

    /* ---------------------------------------------------------
       Toggle Overlay Panels
       --------------------------------------------------------- */
    function setObjectsPanelVisible(visible) {
      panelState.showObjects = Boolean(visible);
      objectsPanel.classList.toggle('be-hidden', !panelState.showObjects);
      if (panelState.showObjects) renderObjectsPanel();
      onPanelsChanged(panelState);
    }

    function setSchemaPanelVisible(visible) {
      panelState.showSchema = Boolean(visible);
      schemaPanel.classList.toggle('be-hidden', !panelState.showSchema);
      if (panelState.showSchema) renderSchemaPanel();
      onPanelsChanged(panelState);
    }

    function toggleObjectsPanel() {
      setObjectsPanelVisible(!panelState.showObjects);
    }

    function toggleSchemaPanel() {
      setSchemaPanelVisible(!panelState.showSchema);
    }

    objectsCloseBtn.addEventListener('click', function () { setObjectsPanelVisible(false); });
    schemaCloseBtn.addEventListener('click', function () { setSchemaPanelVisible(false); });

    /* ---------------------------------------------------------
       Menubar Status & Subscriptions
       --------------------------------------------------------- */
    function updateStatus() {
      if (!menubarStatus) return;
      if (!state.isInitialized) {
        menubarStatus.textContent = 'NO FILE LOADED';
      } else {
        const nodes = store.getNodes ? store.getNodes() : [];
        const rtStatus = (state.runtimeState && state.runtimeState.status) || 'IDLE';
        menubarStatus.textContent = `${state.name}.104a.bejson | ${nodes.length} NODES | ${rtStatus}`;
      }
    }

    store.subscribe(function () {
      updateStatus();
      renderObjectsPanel();
      renderSchemaPanel();
      if (panelState.showNodeProps) {
        renderNodePropertiesPanel();
      }
    });

    updateStatus();

    return {
      panelState: panelState,
      openStartupGate: openStartupGate,
      closeStartupGate: closeStartupGate,
      openInsertNodePanel: openInsertNodePanel,
      closeInsertNodePanel: closeInsertNodePanel,
      openNodePropertiesPanel: openNodePropertiesPanel,
      closeNodePropertiesPanel: closeNodePropertiesPanel,
      toggleObjectsPanel: toggleObjectsPanel,
      toggleSchemaPanel: toggleSchemaPanel,
      exportMfdb132File: exportBejsonFile,
      triggerImportFileDialog: function () {
        if (fileInput) fileInput.click();
      },
      renderObjectsPanel: renderObjectsPanel,
      renderSchemaPanel: renderSchemaPanel,
      renderNodePropertiesPanel: renderNodePropertiesPanel
    };
  }

  window.BEAppPanels = { init: init };
})();
