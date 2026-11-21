/**
 * Module: js/app_main.js
 * Purpose: Application bootstrap, menu bar controller, keyboard shortcuts, and module wiring.
 */

(function () {
  'use strict';

  const store = window.BEJSON_CANVAS_CORE.createCanvasStore();
  const state = store.state;

  const mainToolsTrack = document.getElementById('be-maintools-track');
  const toolOptionsTrack = document.getElementById('be-tooloptions-track');
  const menuItems = Array.from(document.querySelectorAll('.be-menubar__item'));

  const stage = document.getElementById('be-canvas-stage');
  const objectLayer = document.getElementById('be-object-layer');
  const baseGridCanvas = document.getElementById('be-base-grid');
  const rulerXCanvas = document.getElementById('be-ruler-x-canvas');
  const rulerYCanvas = document.getElementById('be-ruler-y-canvas');
  const trackerX = document.getElementById('be-tracker-x');
  const trackerY = document.getElementById('be-tracker-y');
  const coordsHud = document.getElementById('be-coords-hud');

  const viewGridCheck = document.getElementById('be-check-grid');
  const viewObjectsCheck = document.getElementById('be-check-objects');
  const viewSchemaCheck = document.getElementById('be-check-schema');

  // Initialize separated UI modules
  const tools = window.BEAppTools.init({
    store: store,
    mainToolsTrack: mainToolsTrack,
    toolOptionsTrack: toolOptionsTrack,
    stage: stage
  });

  const rulers = window.BEAppRulers.init({
    store: store,
    stage: stage,
    baseGridCanvas: baseGridCanvas,
    rulerXCanvas: rulerXCanvas,
    rulerYCanvas: rulerYCanvas,
    coordsHud: coordsHud
  });

  const canvas = window.BEAppCanvas.init({
    store: store,
    stage: stage,
    objectLayer: objectLayer,
    trackerX: trackerX,
    trackerY: trackerY,
    rulers: rulers,
    tools: tools
  });

  function syncMenuChecks(panelState) {
    if (viewGridCheck) viewGridCheck.textContent = state.showGrid ? 'ON' : '';
    if (viewObjectsCheck) viewObjectsCheck.textContent = panelState.showObjects ? 'ON' : '';
    if (viewSchemaCheck) viewSchemaCheck.textContent = panelState.showSchema ? 'ON' : '';
  }

  const panels = window.BEAppPanels.init({
    store: store,
    stage: stage,
    onPanelsChanged: syncMenuChecks
  });

  /* ---------------------------------------------------------
     Menu Bar Dropdown Logic
     --------------------------------------------------------- */
  function closeAllMenus() {
    menuItems.forEach(function (item) {
      item.classList.remove('be-menubar__item--open');
      const trigger = item.querySelector('.be-menubar__trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  }

  function openMenu(targetItem) {
    closeAllMenus();
    targetItem.classList.add('be-menubar__item--open');
    const trigger = targetItem.querySelector('.be-menubar__trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
  }

  function isAnyMenuOpen() {
    return menuItems.some(function (item) {
      return item.classList.contains('be-menubar__item--open');
    });
  }

  menuItems.forEach(function (item) {
    const trigger = item.querySelector('.be-menubar__trigger');

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (item.classList.contains('be-menubar__item--open')) {
        closeAllMenus();
      } else {
        openMenu(item);
      }
    });

    trigger.addEventListener('mouseenter', function () {
      if (isAnyMenuOpen() && !item.classList.contains('be-menubar__item--open')) {
        openMenu(item);
      }
    });
  });

  document.addEventListener('click', function (e) {
    const selectToolBtn = e.target.closest('[data-select-tool]');
    if (selectToolBtn) {
      tools.selectMainTool(selectToolBtn.dataset.selectTool, true);
      closeAllMenus();
      return;
    }

    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      if (action === 'file:new') {
        panels.openStartupGate(state.isInitialized);
      } else if (action === 'file:open') {
        panels.triggerImportFileDialog();
      } else if (action === 'file:save') {
        panels.exportMfdb132File();
      } else if (action === 'edit:undo') {
        store.undo();
      } else if (action === 'edit:redo') {
        store.redo();
      } else if (action === 'edit:delete') {
        store.deleteSelected();
      } else if (action === 'view:grid') {
        store.setShowGrid(!state.showGrid);
        rulers.drawRulersAndGrid();
        syncMenuChecks(panels.panelState);
      } else if (action === 'view:objects') {
        panels.toggleObjectsPanel();
      } else if (action === 'view:schema') {
        panels.toggleSchemaPanel();
      }
      closeAllMenus();
      return;
    }

    if (!e.target.closest('.be-menubar')) {
      closeAllMenus();
    }
  });

  document.addEventListener('keydown', function (e) {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === 'Escape') {
      closeAllMenus();
      if (!isTyping) {
        store.selectObject(null);
        rulers.updateHud();
      }
      return;
    }

    if (isTyping || !state.isInitialized) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      store.deleteSelected();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      store.redo();
    }
  });

  store.subscribe(function (_s, reason) {
    if (reason === 'file:import' || reason === 'view:grid') {
      rulers.drawRulersAndGrid();
      syncMenuChecks(panels.panelState);
    }
  });

  window.addEventListener('resize', function () {
    rulers.drawRulersAndGrid();
    rulers.updateHud();
  });

  // Initial render
  tools.renderMainTools();
  tools.renderToolOptions();
  tools.updateStageCursor();
  rulers.drawRulersAndGrid();
  canvas.renderShapes();
  rulers.updateHud();
  syncMenuChecks(panels.panelState);

  // Force user to create or import an MFDB-132 file at startup
  panels.openStartupGate(false);

  // Expose app handle for debugging/inspection
  window.BEHTML_FLOW_APP = {
    store: store,
    tools: tools,
    rulers: rulers,
    canvas: canvas,
    panels: panels
  };
})();
