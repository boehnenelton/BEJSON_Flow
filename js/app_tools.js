/**
 * Module: js/app_tools.js
 * Purpose: Tool registry (Selector, Shape, Flow), SVG icons, flow transport controls
 *          (Play, Pause, Resume, Stop), and dual horizontally-scrollable toolbar UI.
 */

(function () {
  'use strict';

  const HAND_SVG = `
    <svg class="be-tool-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
      <path d="M18 11V6a2 2 0 0 0-4 0v4"/>
      <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
      <path d="M10 10.5V5a2 2 0 0 0-4 0v9"/>
      <path d="M18 11a2 2 0 1 1 4 0v4a7 7 0 0 1-7 7h-2c-2.8 0-4.5-1.4-5.7-3.4L4.2 13.5a2 2 0 0 1 3.2-2.4L9 13"/>
    </svg>
  `;

  const SHAPES_SVG = `
    <svg class="be-tool-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10"/>
      <polygon points="15,11 21,21 9,21"/>
    </svg>
  `;

  const SQUARE_SVG = `
    <svg class="be-tool-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16"/>
    </svg>
  `;

  const FLOW_SVG = `
    <svg class="be-tool-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">
      <polygon points="6,4 20,12 6,20" fill="currentColor"/>
    </svg>
  `;

  const PLAY_SVG = `
    <svg class="be-tool-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <polygon points="6,4 20,12 6,20" fill="currentColor"/>
    </svg>
  `;

  const PAUSE_SVG = `
    <svg class="be-tool-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
      <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
    </svg>
  `;

  const RESUME_SVG = `
    <svg class="be-tool-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="4" y="4" width="3" height="16" fill="currentColor"/>
      <polygon points="10,4 21,12 10,20" fill="currentColor"/>
    </svg>
  `;

  const STOP_SVG = `
    <svg class="be-tool-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" fill="currentColor"/>
    </svg>
  `;

  const TOOL_REGISTRY = [
    {
      id: 'selector',
      label: 'Selector',
      icon: HAND_SVG,
      defaultOption: 'selector-primary',
      options: [
        { id: 'selector-primary', label: 'Selector', icon: HAND_SVG }
      ]
    },
    {
      id: 'shape',
      label: 'Shape',
      icon: SHAPES_SVG,
      defaultOption: 'square',
      options: [
        { id: 'square', label: 'Square', icon: SQUARE_SVG }
      ]
    },
    {
      id: 'flow',
      label: 'Flow',
      icon: FLOW_SVG,
      defaultOption: 'flow-stop',
      options: [
        { id: 'flow-play',   label: 'Play',   icon: PLAY_SVG,   action: 'play',   showLabelAlways: true },
        { id: 'flow-pause',  label: 'Pause',  icon: PAUSE_SVG,  action: 'pause',  showLabelAlways: true },
        { id: 'flow-resume', label: 'Resume', icon: RESUME_SVG, action: 'resume', showLabelAlways: true },
        { id: 'flow-stop',   label: 'Stop',   icon: STOP_SVG,   action: 'stop',   showLabelAlways: true }
      ]
    }
  ];

  function init(ctx) {
    const store = ctx.store;
    const state = store.state;
    const runtime = ctx.runtime || null;
    const mainToolsTrack = ctx.mainToolsTrack;
    const toolOptionsTrack = ctx.toolOptionsTrack;
    const stage = ctx.stage;

    if (!state.activeOptionByTool) {
      state.activeOptionByTool = {
        selector: 'selector-primary',
        shape: 'square',
        flow: 'flow-stop'
      };
    }

    function updateStageCursor() {
      const isPlacing = state.activeToolId === 'shape' && state.activeOptionByTool.shape === 'square';
      stage.classList.toggle('be-canvas-stage--placing', isPlacing);
      stage.classList.toggle('be-canvas-stage--selecting', !isPlacing);
    }

    function renderMainTools() {
      mainToolsTrack.innerHTML = '';

      TOOL_REGISTRY.forEach(function (tool) {
        const isSelected = state.activeToolId === tool.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'be-tool-btn' + (isSelected ? ' be-tool-btn--active' : '');
        btn.dataset.beTool = tool.id;
        btn.title = tool.label;
        btn.setAttribute('aria-label', tool.label);
        btn.setAttribute('aria-pressed', String(isSelected));
        btn.innerHTML = `${tool.icon}<span class="be-tool-btn__label">${tool.label}</span>`;
        btn.addEventListener('click', function () { selectMainTool(tool.id); });
        mainToolsTrack.appendChild(btn);
      });
    }

    function renderToolOptions() {
      toolOptionsTrack.innerHTML = '';
      if (!state.activeToolId) return;

      const tool = TOOL_REGISTRY.find(function (t) { return t.id === state.activeToolId; });
      if (!tool || !tool.options.length) return;

      const activeOptId = state.activeOptionByTool[tool.id];

      tool.options.forEach(function (opt) {
        const isSelected = activeOptId === opt.id;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'be-tool-btn' +
          (isSelected ? ' be-tool-btn--active' : '') +
          (opt.showLabelAlways ? ' be-tool-btn--labeled' : '');
        btn.dataset.beOption = opt.id;
        btn.title = opt.label;
        btn.setAttribute('aria-label', opt.label);
        btn.setAttribute('aria-pressed', String(isSelected));
        btn.innerHTML = `${opt.icon}<span class="be-tool-btn__label">${opt.label}</span>`;
        btn.addEventListener('click', function () { selectToolOption(tool.id, opt.id, opt); });
        toolOptionsTrack.appendChild(btn);
      });

      // If Flow tool is active, append live runtime telemetry strip in Row 2
      if (tool.id === 'flow' && state.runtimeState) {
        const statusStrip = document.createElement('div');
        statusStrip.className = 'be-flow-status-strip';
        statusStrip.id = 'be-flow-status-strip';
        const rs = state.runtimeState;
        statusStrip.textContent = `STATE: ${rs.status} | STEP: ${rs.stepCount || 0} | TIME: ${rs.timeRunningMs || 0}ms${rs.lastReason ? ' | ' + rs.lastReason : ''}`;
        toolOptionsTrack.appendChild(statusStrip);
      }
    }

    function selectMainTool(toolId, forceSelect) {
      if (!forceSelect && state.activeToolId === toolId) {
        state.activeToolId = null;
      } else {
        state.activeToolId = toolId;
        const tool = TOOL_REGISTRY.find(function (t) { return t.id === toolId; });
        if (tool && !state.activeOptionByTool[toolId]) {
          state.activeOptionByTool[toolId] = tool.defaultOption || (tool.options[0] && tool.options[0].id) || null;
        }
      }
      renderMainTools();
      renderToolOptions();
      updateStageCursor();
    }

    function selectToolOption(toolId, optionId, optDef) {
      state.activeOptionByTool[toolId] = optionId;

      if (toolId === 'flow' && runtime && optDef && optDef.action) {
        if (optDef.action === 'play') {
          runtime.play({});
        } else if (optDef.action === 'pause') {
          runtime.pause();
        } else if (optDef.action === 'resume') {
          runtime.resume();
        } else if (optDef.action === 'stop') {
          runtime.stop();
        }
      }

      renderToolOptions();
      updateStageCursor();
    }

    store.subscribe(function (_s, reason) {
      if (reason && String(reason).startsWith('runtime:')) {
        if (state.activeToolId === 'flow') {
          renderToolOptions();
        }
      }
    });

    document.querySelectorAll('.be-toolbar').forEach(function (bar) {
      bar.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          bar.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    });

    return {
      TOOL_REGISTRY: TOOL_REGISTRY,
      selectMainTool: selectMainTool,
      selectToolOption: selectToolOption,
      renderMainTools: renderMainTools,
      renderToolOptions: renderToolOptions,
      updateStageCursor: updateStageCursor
    };
  }

  window.BEAppTools = { init: init };
})();
