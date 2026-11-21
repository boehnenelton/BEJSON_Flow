/**
 * Module: js/app_panels.js
 * Purpose: Startup File Gate modal, View Objects overlay panel, View Schema overlay panel,
 *          and single-file MFDB-132 import/export triggers.
 */

(function () {
  'use strict';

  function init(ctx) {
    const store = ctx.store;
    const state = store.state;
    const stage = ctx.stage;
    const onPanelsChanged = ctx.onPanelsChanged || function () {};

    const panelState = {
      showObjects: false,
      showSchema: false,
      schemaTab: 'mfdb132' // 'mfdb132' | 'manifest' | 'positions'
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

    /* ---------------------------------------------------------
       Draggable Overlay Panels (via 32px Header Bar)
       --------------------------------------------------------- */
    function makePanelDraggable(panelEl) {
      const header = panelEl.querySelector('.be-panel__header');
      if (!header) return;

      let drag = null;

      header.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button')) return;
        const parentRect = panelEl.offsetParent.getBoundingClientRect();
        const rect = panelEl.getBoundingClientRect();
        drag = {
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          parentRect: parentRect
        };
        panelEl.style.right = 'auto';
        panelEl.style.left = `${rect.left - parentRect.left}px`;
        panelEl.style.top = `${rect.top - parentRect.top}px`;
        header.setPointerCapture(e.pointerId);
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
          if (header.hasPointerCapture(e.pointerId)) {
            header.releasePointerCapture(e.pointerId);
          }
        }
      });
    }

    makePanelDraggable(objectsPanel);
    makePanelDraggable(schemaPanel);

    /* ---------------------------------------------------------
       Startup File Gate (Create New or Import MFDB-132)
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
      startupDbInput.value = state.isInitialized ? '' : 'untitled_canvas';
      startupCancelBtn.classList.toggle('be-hidden', !allowCancel);
      startupGate.classList.remove('be-hidden');
      setTimeout(function () { startupDbInput.focus(); }, 0);
    }

    function closeStartupGate() {
      startupGate.classList.add('be-hidden');
      showStartupError('');
    }

    function handleCreateNew() {
      const rawName = startupDbInput.value.trim() || 'untitled_canvas';
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

    startupCancelBtn.addEventListener('click', function () {
      if (state.isInitialized) closeStartupGate();
    });

    /* ---------------------------------------------------------
       MFDB-132 Single-File Import & Export
       --------------------------------------------------------- */
    function triggerImportFileDialog() {
      fileInput.value = '';
      fileInput.click();
    }

    startupImportBtn.addEventListener('click', triggerImportFileDialog);

    fileInput.addEventListener('change', function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function () {
        const res = store.importMfdb132(String(reader.result || ''));
        if (!res.ok) {
          const errText = (res.errors || ['Failed to import MFDB-132 file.']).join(' | ');
          if (!startupGate.classList.contains('be-hidden')) {
            showStartupError(errText);
          } else {
            window.alert('MFDB-132 Import Error:\n' + errText);
          }
          return;
        }
        closeStartupGate();
      };
      reader.onerror = function () {
        showStartupError('Could not read the selected file.');
      };
      reader.readAsText(file);
    });

    function exportMfdb132File() {
      if (!state.isInitialized) {
        openStartupGate(false);
        return;
      }
      const pkg = store.buildMfdb132Package({ bumpVersion: true });
      const check = store.validateMfdb132(pkg);
      if (!check.valid) {
        window.alert('MFDB-132 Validation Error:\n' + check.errors.join('\n'));
        return;
      }

      const jsonText = JSON.stringify(pkg, null, 2);
      const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${state.dbName}.mfdb132.bejson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      renderSchemaPanel();
    }

    /* ---------------------------------------------------------
       View Objects Overlay Panel
       --------------------------------------------------------- */
    function renderObjectsPanel() {
      objectsCountBadge.textContent = String(state.shapes.length);
      if (!panelState.showObjects) return;

      objectsListEl.innerHTML = '';
      if (!state.shapes.length) {
        objectsEmptyEl.classList.remove('be-hidden');
        return;
      }
      objectsEmptyEl.classList.add('be-hidden');

      state.shapes.forEach(function (obj) {
        const li = document.createElement('li');
        li.className = 'be-object-row' + (obj.id === state.selectedShapeId ? ' be-object-row--selected' : '');
        li.dataset.objectId = String(obj.id);

        const info = document.createElement('div');
        info.className = 'be-object-row__info';

        const nameEl = document.createElement('div');
        nameEl.className = 'be-object-row__name';
        nameEl.textContent = `${obj.entityName}`;

        const metaEl = document.createElement('div');
        metaEl.className = 'be-object-row__meta';
        metaEl.textContent = `${obj.type.toUpperCase()} | X:${Math.round(obj.cx)} Y:${Math.round(obj.cy)} | ${Math.round(obj.size)}px`;

        info.appendChild(nameEl);
        info.appendChild(metaEl);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'be-object-row__del';
        delBtn.title = `Delete ${obj.entityName}`;
        delBtn.setAttribute('aria-label', `Delete ${obj.entityName}`);
        delBtn.textContent = '×';
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          store.deleteObject(obj.id);
        });

        li.appendChild(info);
        li.appendChild(delBtn);

        li.addEventListener('click', function () {
          store.selectObject(obj.id);
        });

        objectsListEl.appendChild(li);
      });
    }

    /* ---------------------------------------------------------
       View Schema Overlay Panel (Live BEJSON / MFDB-132)
       --------------------------------------------------------- */
    function getActiveSchemaDoc() {
      if (panelState.schemaTab === 'manifest') {
        return store.buildMfdbManifest();
      }
      if (panelState.schemaTab === 'positions') {
        return store.buildLivePositionSchema();
      }
      return store.buildMfdb132Package({ bumpVersion: false });
    }

    function renderSchemaPanel() {
      if (!panelState.showSchema) return;

      const pkg = store.buildMfdb132Package({ bumpVersion: false });
      const check = store.validateMfdb132(pkg);

      const doc = (panelState.schemaTab === 'mfdb132') ? pkg : getActiveSchemaDoc();
      schemaPreEl.textContent = JSON.stringify(doc, null, 2);

      if (check.valid) {
        schemaValidEl.textContent = `VALID MFDB-132 (${state.shapes.length} ENTITIES)`;
        schemaValidEl.classList.remove('be-schema-valid--err');
      } else {
        schemaValidEl.textContent = `INVALID (${check.errors.length} ERR)`;
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

    schemaExportBtn.addEventListener('click', exportMfdb132File);

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
       Menubar Status & Reactive Subscriptions
       --------------------------------------------------------- */
    function updateStatus() {
      if (!menubarStatus) return;
      if (!state.isInitialized) {
        menubarStatus.textContent = 'NO FILE LOADED';
      } else {
        menubarStatus.textContent = `${state.dbName}.mfdb132.bejson | ${state.shapes.length} OBJ`;
      }
    }

    store.subscribe(function () {
      updateStatus();
      renderObjectsPanel();
      renderSchemaPanel();
    });

    updateStatus();

    return {
      panelState: panelState,
      openStartupGate: openStartupGate,
      closeStartupGate: closeStartupGate,
      toggleObjectsPanel: toggleObjectsPanel,
      toggleSchemaPanel: toggleSchemaPanel,
      exportMfdb132File: exportMfdb132File,
      triggerImportFileDialog: triggerImportFileDialog,
      renderObjectsPanel: renderObjectsPanel,
      renderSchemaPanel: renderSchemaPanel
    };
  }

  window.BEAppPanels = { init: init };
})();
