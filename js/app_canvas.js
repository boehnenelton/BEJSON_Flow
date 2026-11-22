/**
 * Module: js/app_canvas.js
 * Purpose: Canvas Flow rendering (SVG connectors with directional arrows, midpoint & multi-anchor
 *          loopback anchor dots behind shapes, runtime execution highlights) and pointer interactions
 *          (450ms long-press node properties trigger, drag & drop, selection, anchor click).
 */

(function () {
  'use strict';

  const LONG_PRESS_DURATION_MS = 450;
  const LONG_PRESS_MOVE_TOLERANCE_PX = 6;

  function init(ctx) {
    const store = ctx.store;
    const state = store.state;
    const stage = ctx.stage;
    const objectLayer = ctx.objectLayer;
    const connectorLayer = ctx.connectorLayer || document.getElementById('be-connector-layer');
    const trackerX = ctx.trackerX;
    const trackerY = ctx.trackerY;
    const rulers = ctx.rulers;
    let panels = ctx.panels || null;

    function setPanels(p) {
      panels = p;
    }

    let dragContext = null;
    let longPressTimer = null;
    let longPressTriggered = false;

    function cancelLongPressTimer() {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    function getStageCoords(e) {
      const rect = stage.getBoundingClientRect();
      return {
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top)
      };
    }

    function renderConnectors() {
      if (!connectorLayer) return;
      connectorLayer.innerHTML = '';

      const connectors = store.getConnectors ? store.getConnectors() : [];
      const activeConnId = (state.runtimeState && state.runtimeState.activeConnectorId) || null;

      connectors.forEach(function (conn) {
        if (!conn.sourceCenter || !conn.targetCenter) return;

        const isRuntimeActive = conn.id === activeConnId;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.dataset.connectorId = String(conn.id);

        if (conn.isLoopback && Array.isArray(conn.waypoints) && conn.waypoints.length >= 2) {
          // Multi-segment backward U-loop polyline (zIndex: 1, behind shapes)
          const polyLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          const ptsStr = conn.waypoints.map(function (pt) { return `${pt.x},${pt.y}`; }).join(' ');
          polyLine.setAttribute('points', ptsStr);
          polyLine.setAttribute('fill', 'none');
          polyLine.setAttribute(
            'class',
            'be-connector-line be-connector-line--loopback' + (isRuntimeActive ? ' be-connector-line--active' : '')
          );
          g.appendChild(polyLine);
        } else {
          // Standard straight connector line behind shapes (zIndex: 1)
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', conn.sourceCenter.cx);
          line.setAttribute('y1', conn.sourceCenter.cy);
          line.setAttribute('x2', conn.targetCenter.cx);
          line.setAttribute('y2', conn.targetCenter.cy);
          line.setAttribute(
            'class',
            'be-connector-line' + (isRuntimeActive ? ' be-connector-line--active' : '')
          );
          g.appendChild(line);
        }

        // Directional flow arrow pointing at target shape
        if (conn.flowArrow) {
          const arrow = conn.flowArrow;
          const arrowLen = arrow.length || 10;
          const rad = arrow.angleRad;
          const tipX = arrow.tipX;
          const tipY = arrow.tipY;

          const p1x = tipX - arrowLen * Math.cos(rad - Math.PI / 6);
          const p1y = tipY - arrowLen * Math.sin(rad - Math.PI / 6);
          const p2x = tipX - arrowLen * Math.cos(rad + Math.PI / 6);
          const p2y = tipY - arrowLen * Math.sin(rad + Math.PI / 6);

          const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          poly.setAttribute('points', `${tipX},${tipY} ${p1x},${p1y} ${p2x},${p2y}`);
          poly.setAttribute(
            'class',
            'be-connector-arrow' + (isRuntimeActive ? ' be-connector-arrow--active' : '')
          );
          g.appendChild(poly);
        }

        // Render all anchor dots (1 midpoint for normal connectors, 3 anchors for loopback connectors)
        const anchors = (Array.isArray(conn.anchorPoints) && conn.anchorPoints.length > 0)
          ? conn.anchorPoints
          : (conn.anchorDot ? [conn.anchorDot] : []);

        anchors.forEach(function (anchor, idx) {
          const anchorIdx = anchor.index !== undefined ? anchor.index : idx;

          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('cx', anchor.cx);
          dot.setAttribute('cy', anchor.cy);
          dot.setAttribute('r', anchor.radius || 6);
          dot.setAttribute(
            'class',
            'be-anchor-dot' + (conn.isLoopback ? ' be-anchor-dot--loopback' : '')
          );
          dot.dataset.connectorId = String(conn.id);
          dot.dataset.anchorIndex = String(anchorIdx);

          const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          hit.setAttribute('cx', anchor.cx);
          hit.setAttribute('cy', anchor.cy);
          hit.setAttribute('r', '14');
          hit.setAttribute('class', 'be-anchor-hit');
          hit.dataset.connectorId = String(conn.id);
          hit.dataset.anchorIndex = String(anchorIdx);

          g.appendChild(dot);
          g.appendChild(hit);
        });

        connectorLayer.appendChild(g);
      });
    }

    function renderShapes() {
      objectLayer.innerHTML = '';

      const nodes = store.getNodes ? store.getNodes() : (state.shapes || []);
      const selectedId = state.selectedNodeId !== undefined ? state.selectedNodeId : state.selectedShapeId;
      const activeNodeId = (state.runtimeState && state.runtimeState.activeNodeId) || null;

      nodes.forEach(function (node) {
        const el = document.createElement('div');
        const nodeType = node.type || 'shape';
        const isSelected = node.id === selectedId;
        const isRuntimeActive = node.id === activeNodeId;

        el.className = `be-shape be-flow-node be-shape--${nodeType}` +
          (isSelected ? ' be-shape--selected' : '') +
          (isRuntimeActive ? ' be-shape--runtime-active' : '');
        el.dataset.nodeId = String(node.id);
        el.dataset.shapeId = String(node.id);
        el.style.width = `${node.size}px`;
        el.style.height = `${node.size}px`;
        el.style.left = `${node.cx - node.size / 2}px`;
        el.style.top = `${node.cy - node.size / 2}px`;

        const pill = document.createElement('div');
        pill.className = `be-node-pill be-node-pill--${nodeType}`;
        if (nodeType === 'start') pill.textContent = 'START';
        else if (nodeType === 'end') {
          const stopType = (node.stopCondition && node.stopCondition.type) || 'always';
          pill.textContent = stopType === 'always' ? 'END' : `END (${stopType.toUpperCase()})`;
        } else if (nodeType === 'redirect') pill.textContent = 'GATE';
        else if (nodeType === 'variable') pill.textContent = (node.mode === 'counter') ? 'CTR (+1)' : 'VAR';
        else if (nodeType === 'loopback') pill.textContent = `LOOP (${node.loopCountMax || 2}x)`;
        else pill.textContent = 'STEP';
        el.appendChild(pill);

        const labelEl = document.createElement('div');
        labelEl.className = 'be-node-label';
        labelEl.textContent = node.label || nodeType;
        el.appendChild(labelEl);

        // Indicator badge showing count of attached preset + custom fields
        const presetCount = Array.isArray(node.presetFields) ? node.presetFields.length : 0;
        const customCount = Array.isArray(node.customFields) ? node.customFields.length : 0;
        if (presetCount + customCount > 0) {
          const metaBadge = document.createElement('div');
          metaBadge.className = 'be-node-fields-badge';
          metaBadge.textContent = `P:${presetCount} C:${customCount}`;
          el.appendChild(metaBadge);
        }

        objectLayer.appendChild(el);
      });

      renderConnectors();
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
        const movedDist = Math.hypot(x - dragContext.startX, y - dragContext.startY);
        if (movedDist > LONG_PRESS_MOVE_TOLERANCE_PX) {
          cancelLongPressTimer();
          if (!dragContext.hasDragged) {
            dragContext.hasDragged = true;
            if (store.snapshot) store.snapshot();
          }
        }

        if (dragContext.hasDragged && !longPressTriggered) {
          const targetCx = x - dragContext.offsetX;
          const targetCy = y - dragContext.offsetY;
          const movedNode = store.moveNode
            ? store.moveNode(dragContext.nodeId, targetCx, targetCy)
            : store.moveObject(dragContext.nodeId, targetCx, targetCy, stage.clientWidth, stage.clientHeight);

          if (movedNode) {
            const el = objectLayer.querySelector(`[data-node-id="${movedNode.id}"]`) ||
                       objectLayer.querySelector(`[data-shape-id="${movedNode.id}"]`);
            if (el) {
              el.style.left = `${movedNode.cx - movedNode.size / 2}px`;
              el.style.top = `${movedNode.cy - movedNode.size / 2}px`;
            }
            renderConnectors();
          }
        }
      }

      rulers.updateHud(x, y);
    });

    stage.addEventListener('pointerleave', function () {
      cancelLongPressTimer();
      if (!dragContext) {
        trackerX.style.display = 'none';
        trackerY.style.display = 'none';
      }
    });

    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (!state.isInitialized) return;

      cancelLongPressTimer();
      longPressTriggered = false;

      const coords = getStageCoords(e);
      const x = coords.x;
      const y = coords.y;

      // Click on anchor dot (midpoint or loopback anchor point) to insert component
      const anchorHit = e.target.closest('.be-anchor-hit') || e.target.closest('.be-anchor-dot');
      if (anchorHit) {
        e.stopPropagation();
        const connectorId = Number(anchorHit.dataset.connectorId);
        const anchorIndex = anchorHit.dataset.anchorIndex !== undefined
          ? Number(anchorHit.dataset.anchorIndex)
          : 0;
        if (panels && typeof panels.openInsertNodePanel === 'function') {
          panels.openInsertNodePanel(connectorId, anchorIndex);
        }
        return;
      }

      // Select & drag node, or hold for 450ms long-press to open specific Node Properties panel
      const hitEl = e.target.closest('.be-shape');
      if (hitEl) {
        const id = Number(hitEl.dataset.nodeId || hitEl.dataset.shapeId);
        const nodes = store.getNodes ? store.getNodes() : (state.shapes || []);
        const node = nodes.find(function (n) { return n.id === id; });
        if (node) {
          if (store.selectNode) store.selectNode(id);
          else if (store.selectObject) store.selectObject(id);

          dragContext = {
            nodeId: id,
            startX: x,
            startY: y,
            offsetX: x - node.cx,
            offsetY: y - node.cy,
            hasDragged: false
          };

          longPressTimer = setTimeout(function () {
            longPressTimer = null;
            if (dragContext && !dragContext.hasDragged) {
              longPressTriggered = true;
              const targetNodeId = dragContext.nodeId;
              dragContext = null;
              if (panels && typeof panels.openNodePropertiesPanel === 'function') {
                panels.openNodePropertiesPanel(targetNodeId);
              }
            }
          }, LONG_PRESS_DURATION_MS);

          if (stage.setPointerCapture && e.pointerId !== undefined) {
            try { stage.setPointerCapture(e.pointerId); } catch (_err) {}
          }
          rulers.updateHud(x, y);
        }
      } else {
        if (store.selectNode) store.selectNode(null);
        else if (store.selectObject) store.selectObject(null);
        rulers.updateHud(x, y);
      }
    });

    stage.addEventListener('pointerup', function (e) {
      cancelLongPressTimer();
      if (dragContext) {
        dragContext = null;
        if (stage.hasPointerCapture && e.pointerId !== undefined) {
          try {
            if (stage.hasPointerCapture(e.pointerId)) {
              stage.releasePointerCapture(e.pointerId);
            }
          } catch (_err) {}
        }
      }
    });

    stage.addEventListener('pointercancel', function () {
      cancelLongPressTimer();
      dragContext = null;
    });

    // Prevent native mobile context menu from interrupting long-press on canvas nodes
    stage.addEventListener('contextmenu', function (e) {
      const hitEl = e.target.closest('.be-shape');
      if (hitEl) {
        e.preventDefault();
      }
    });

    store.subscribe(function (_state, reason) {
      if (reason !== 'node:move' && reason !== 'object:move') {
        renderShapes();
      }
      rulers.updateHud();
    });

    return {
      renderShapes: renderShapes,
      renderConnectors: renderConnectors,
      setPanels: setPanels
    };
  }

  window.BEAppCanvas = { init: init };
})();
