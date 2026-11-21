/**
 * Module: js/app_rulers.js
 * Purpose: High-contrast X/Y canvas rulers, 8-lane markers, optional base grid, and X/Y HUD.
 */

(function () {
  'use strict';

  function init(ctx) {
    const store = ctx.store;
    const state = store.state;
    const stage = ctx.stage;
    const baseGridCanvas = ctx.baseGridCanvas;
    const rulerXCanvas = ctx.rulerXCanvas;
    const rulerYCanvas = ctx.rulerYCanvas;
    const coordsHud = ctx.coordsHud;

    const BEHTML_LANES = window.BEJSON_CANVAS_CORE.BEHTML_LANES;
    const BEHTML_RY = window.BEJSON_CANVAS_CORE.BEHTML_RY;

    function getLaneWidth() {
      return stage.clientWidth / BEHTML_LANES;
    }

    function drawRulersAndGrid() {
      const dpr = window.devicePixelRatio || 1;
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      store.setStageMetrics(w, h);

      const rulerSize = rulerXCanvas.clientHeight || 32;
      const laneW = w / BEHTML_LANES;

      // X Ruler (Top): Black background, pure white bold 11px numbers & ticks
      rulerXCanvas.width = Math.max(1, Math.floor(w * dpr));
      rulerXCanvas.height = Math.max(1, Math.floor(rulerSize * dpr));
      const ctxX = rulerXCanvas.getContext('2d');
      ctxX.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxX.fillStyle = '#000000';
      ctxX.fillRect(0, 0, w, rulerSize);

      ctxX.strokeStyle = '#FFFFFF';
      ctxX.fillStyle = '#FFFFFF';
      ctxX.font = '700 11px "Roboto Mono", monospace';
      ctxX.textBaseline = 'top';

      for (let x = 0; x <= w; x += 16) {
        const isMajor = x % 64 === 0;
        const tickH = isMajor ? 9 : 4;
        ctxX.beginPath();
        ctxX.moveTo(x + 0.5, rulerSize);
        ctxX.lineTo(x + 0.5, rulerSize - tickH);
        ctxX.stroke();
        if (isMajor && x < w - 28) {
          ctxX.fillText(String(x), x + 4, 4);
        }
      }

      // Red BEHTML 8-lane markers along bottom edge of X ruler
      ctxX.strokeStyle = '#DE2626';
      ctxX.lineWidth = 2;
      for (let i = 1; i < BEHTML_LANES; i++) {
        const lx = Math.round(i * laneW);
        ctxX.beginPath();
        ctxX.moveTo(lx, rulerSize);
        ctxX.lineTo(lx, rulerSize - 11);
        ctxX.stroke();
      }
      ctxX.lineWidth = 1;

      // Y Ruler (Left): Black background, pure white bold 11px numbers & ticks
      rulerYCanvas.width = Math.max(1, Math.floor(rulerSize * dpr));
      rulerYCanvas.height = Math.max(1, Math.floor(h * dpr));
      const ctxY = rulerYCanvas.getContext('2d');
      ctxY.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctxY.fillStyle = '#000000';
      ctxY.fillRect(0, 0, rulerSize, h);

      ctxY.strokeStyle = '#FFFFFF';
      ctxY.fillStyle = '#FFFFFF';
      ctxY.font = '700 11px "Roboto Mono", monospace';
      ctxY.textBaseline = 'top';

      for (let y = 0; y <= h; y += 16) {
        const isMajor = y % 64 === 0;
        const isRow = y % BEHTML_RY === 0;
        const tickW = isMajor ? 8 : isRow ? 5 : 3;
        ctxY.beginPath();
        ctxY.moveTo(rulerSize, y + 0.5);
        ctxY.lineTo(rulerSize - tickW, y + 0.5);
        ctxY.stroke();
        if (isMajor && y < h - 14) {
          ctxY.fillText(String(y), 2, y + 3);
        }
      }

      // Optional base-layer grid
      baseGridCanvas.classList.toggle('be-base-grid--visible', state.showGrid);
      if (state.showGrid) {
        baseGridCanvas.width = Math.max(1, Math.floor(w * dpr));
        baseGridCanvas.height = Math.max(1, Math.floor(h * dpr));
        const ctxG = baseGridCanvas.getContext('2d');
        ctxG.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctxG.clearRect(0, 0, w, h);

        ctxG.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctxG.lineWidth = 1;

        for (let i = 1; i < BEHTML_LANES; i++) {
          const lx = Math.round(i * laneW) + 0.5;
          ctxG.beginPath();
          ctxG.moveTo(lx, 0);
          ctxG.lineTo(lx, h);
          ctxG.stroke();
        }

        ctxG.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        for (let y = BEHTML_RY; y < h; y += BEHTML_RY) {
          ctxG.beginPath();
          ctxG.moveTo(0, y + 0.5);
          ctxG.lineTo(w, y + 0.5);
          ctxG.stroke();
        }
      }
    }

    function updateHud(cursorX, cursorY) {
      const lanePx = Math.round(getLaneWidth());
      const sel = state.shapes.find(function (s) { return s.id === state.selectedShapeId; });

      let text = '';
      if (cursorX !== null && cursorX !== undefined && cursorY !== null && cursorY !== undefined) {
        text = `X: ${cursorX}  Y: ${cursorY}`;
      } else if (sel) {
        text = `X: ${Math.round(sel.cx)}  Y: ${Math.round(sel.cy)}`;
      } else {
        text = 'X: 0  Y: 0';
      }

      if (sel) {
        text += ` | SQ: ${Math.round(sel.size)}x${Math.round(sel.size)}`;
      } else {
        text += ` | 1-LANE: ${lanePx}px`;
      }

      coordsHud.textContent = text;
    }

    return {
      getLaneWidth: getLaneWidth,
      drawRulersAndGrid: drawRulersAndGrid,
      updateHud: updateHud
    };
  }

  window.BEAppRulers = { init: init };
})();
