/**
 * Module: js/app_canvas.js
 * Purpose: Above-layer shape rendering and pointer interaction (placement + collision-aware drag).
 */

(function () {
  'use strict';

  function init(ctx) {
    const store = ctx.store;
    const state = store.state;
    const stage = ctx.stage;
    const objectLayer = ctx.objectLayer;
    const trackerX = ctx.trackerX;
    const trackerY = ctx.trackerY;
    const rulers = ctx.rulers;
    const tools = ctx.tools;

    let dragContext = null;

    function getStageCoords(e) {
      const rect = stage.getBoundingClientRect();
      return {
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top)
      };
    }

    function renderShapes() {
      objectLayer.innerHTML = '';

      state.shapes.forEach(function (shape) {
        const el = document.createElement('div');
        el.className = 'be-shape' + (shape.id === state.selectedShapeId ? ' be-shape--selected' : '');
        el.dataset.shapeId = String(shape.id);
        el.dataset.entityName = shape.entityName;
        el.style.width = `${shape.size}px`;
        el.style.height = `${shape.size}px`;
        el.style.left = `${shape.cx - shape.size / 2}px`;
        el.style.top = `${shape.cy - shape.size / 2}px`;
        objectLayer.appendChild(el);
      });
    }

    stage.addEventListener('pointermove', function (e) {
      const coords = getStageCoords(e);
      const x = coords.x;
      const y = coords.y;

      trackerX.style.display = 'block';
      trackerY.style.display = 'block';
      trackerX.style.left = `${x}px`;
      trackerY.style.top = `${y}px`;

      if (dragContext) {
        const targetCx = x - dragContext.offsetX;
        const targetCy = y - dragContext.offsetY;
        const movedShape = store.moveObject(
          dragContext.shapeId,
          targetCx,
          targetCy,
          stage.clientWidth,
          stage.clientHeight
        );

        if (movedShape) {
          const el = objectLayer.querySelector(`[data-shape-id="${movedShape.id}"]`);
          if (el) {
            el.style.left = `${movedShape.cx - movedShape.size / 2}px`;
            el.style.top = `${movedShape.cy - movedShape.size / 2}px`;
          }
        }
      }

      rulers.updateHud(x, y);
    });

    stage.addEventListener('pointerleave', function () {
      if (!dragContext) {
        trackerX.style.display = 'none';
        trackerY.style.display = 'none';
      }
    });

    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (!state.isInitialized) return;

      const coords = getStageCoords(e);
      const x = coords.x;
      const y = coords.y;

      // SHAPE -> SQUARE placement
      if (state.activeToolId === 'shape' && state.activeOptionByTool.shape === 'square') {
        const size = rulers.getLaneWidth();
        store.addObject('square', x, y, size, stage.clientWidth, stage.clientHeight);
        // Always switch back to Selector after dropping an object
        tools.selectMainTool('selector', true);
        rulers.updateHud(x, y);
        return;
      }

      // SELECTOR -> Select & drag existing shape
      const hitEl = e.target.closest('.be-shape');
      if (hitEl) {
        const id = Number(hitEl.dataset.shapeId);
        const shape = state.shapes.find(function (s) { return s.id === id; });
        if (shape) {
          store.selectObject(id);
          store.snapshot();
          dragContext = {
            shapeId: id,
            offsetX: x - shape.cx,
            offsetY: y - shape.cy
          };
          stage.setPointerCapture(e.pointerId);
          rulers.updateHud(x, y);
        }
      } else {
        store.selectObject(null);
        rulers.updateHud(x, y);
      }
    });

    stage.addEventListener('pointerup', function (e) {
      if (dragContext) {
        dragContext = null;
        if (stage.hasPointerCapture(e.pointerId)) {
          stage.releasePointerCapture(e.pointerId);
        }
      }
    });

    // Re-render DOM shapes whenever store mutates (except lightweight object:move which updates inline)
    store.subscribe(function (_state, reason) {
      if (reason !== 'object:move') {
        renderShapes();
      }
      rulers.updateHud();
    });

    return {
      renderShapes: renderShapes
    };
  }

  window.BEAppCanvas = { init: init };
})();
