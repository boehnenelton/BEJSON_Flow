# BEJSON_Flow 1.1.0 (PKG 111 -> PKG 112 · 2026-11-23)
- Added `INSTRUCTIONS.md` (apply, verify, canvas_mode usage, remaining work). No code changes.

# BEJSON_Flow 1.1.0 (PKG 110 -> PKG 111 · 2026-11-23)
- lib_bejson_canvas_core.js 1.0.1 -> 1.1.0: added `canvasMode` gate (0 legacy | 1 scaled world | 2 paged 2x2), world/viewport split,
  rectangle-aware collision, per-page 8-lane/Ry=32 quantization, `pageOf/pageLocal/pageBounds`, append-only `canvas_meta` fields
  (`canvas_mode, world_width, world_height, page_cols, page_rows`, mode >= 1 only), `strictImport` SHA-256 verification,
  import re-clamp, manifest 1.32 alignment. Mode 0 export is structurally identical to 1.0.1 (golden test).
- Canvas_Flow: `createFlowStore({canvasMode,...})`, single stage source in modes >= 1, mode 2 Start/End in page (0,0),
  `Canvas_Mode/World_Width/World_Height` export keys (mode >= 1 only), `flow_cli init --canvas-mode N`.
- Tests: fixed stale `test_canvas_core.js`; added `test_canvas_mode0_golden.js`, `test_canvas_modes.js`, `test_canvas_flow_modes.js`.
- Removed stale duplicate `lib/lib_bejson_canvas_core.js`; rewrote `dev/canvas_core_bugs.md`; recorded exemption in both AGENTS.md.
- Not yet built: UI camera (zoom/pan), ghost-label overlay, page navigator/overview (plan phases 3-4).

# BEJSON_Flow 1.1.0 (PKG 109 -> PKG 110 · 2026-11-22)
- Redirection Gate Side Anchor & Branch Node Insertion:
  - Added interactive side anchor stub (`getRedirectSideAnchors()`, `.be-connector-line--redirect-stub`, and `.be-anchor-dot--redirect-branch`) extending from Redirection Gate nodes to represent an alternate branch that "goes nowhere until you add a node".
  - Implemented `insertNodeOnRedirectBranch(redirectNodeId, options)` and `openInsertNodePanelForBranch(redirectNodeId)` enabling direct insertion of branch components that wire the alternate branch connector and clear the dangling stub upon addition.
- Full-Screen True High-Contrast Node Properties Overlay:
  - Relocated `#be-panel-node-props` to a top-level body element (`z-index: 10000`, `position: fixed`, `inset: 0`) to achieve an uncompromising viewport-wide full-screen overlay covering menubars, toolbars, and workspace.
  - Engineered stark black-and-white high-contrast visual hierarchy: solid jet black (`#000000`) background, crisp white headings, labels, and borders (`#FFFFFF`), with white input boxes and white buttons with black font that dynamically switch to vivid red (`#DE2626`) background with white text when selected/focused/active.
  - Added default null/placeholder option (`<option value="" selected disabled>-- Select Pre-Made Field --</option>`) to the premade field combo dropdown with validation feedback.
  - Added visual confirmation feedback on the "Add Preset" button (`Added ✓` state) and contextual banner message (`✓ Added preset field '[name]' to node [...]`).
  - Added keyboard `Escape` handler to gracefully dismiss full-screen overlays.

# BEJSON_Flow 1.1.0 (PKG 108 -> PKG 109 · 2026-11-22)
- Captured 5 live Playwright screenshots and downscaled to 420p (`420x262`) in `images/` (`01_startup_gate.png`, `02_insert_component_modal.png`, `03_flow_canvas_loopback.png`, `04_fullscreen_node_properties.png`, `05_flow_transport_and_schema.png`).
- Authored 605-line technical `README.md` with embedded 420p visual figures, Mermaid architecture diagram, spatial mathematics, BEJSON 104a / Sanitized Node Options Schemas, JS API reference, and `flow_cli.js` command matrix (passed `readme_auditor.py` with zero violations).

# BEJSON_Flow 1.1.0 (PKG 107 -> PKG 108 · 2026-11-22)
- Hostile Audit & Resilience Hardening:
  - Added prototype-pollution and reserved-key guards (`FORBIDDEN_FIELD_NAMES`, `Object.create(null)`, and underscore-prefix rejection) in `lib_bejson_Canvas_Flow_presets.js`.
  - Replaced manual `Fields.forEach` indexing in `parseNodeOptionsSchema` with `Core.bejson_core_get_field_map` $O(1)$ field-map resolution.
  - Hardened `importBejson` in `lib_bejson_Canvas_Flow_core.js` to validate payload structure before mutating state (preventing corrupt imports from wiping active sessions), synchronize the backing `CanvasCore` store for MTV collision resolution, and support legacy `MFDB_132_Package` imports.
  - Hardened `deleteNode` to prevent self-loops and duplicate bridging edges and to safely reassign `loopbackTargetId` references if a loopback target node is deleted.
  - Added store subscription guard in `lib_bejson_Canvas_Flow_runtime.js` (v1.1.0) to automatically stop active execution timers when `file:new`, `file:import`, or active-node deletion occurs mid-run.
  - Optimized `js/app_canvas.js` to record undo snapshots only when a drag actually crosses the `6px` movement threshold rather than on every click/selection, and reset file input values in `js/app_panels.js`.

# BEJSON_Flow 1.1.0 (PKG 106 -> PKG 107 · 2026-11-22)
- Upgraded `#be-panel-node-props` (Node Properties Editor) to a full-screen overlay (`100vw x 100vh`) with high-contrast Tri-Color styling: white inputs/selects/textareas/buttons with black text by default, switching to `#DE2626` red background with `#FFFFFF` white text when selected/focused/active.
- Added Sanitized Node Options Schema export & import (`exportNodeOptionsSchema`, `importNodeOptionsSchema`, `parseNodeOptionsSchema`, and `flow_cli.js` subcommands `export-node-options` / `import-node-options`) exporting structural field definitions (`field_category`, `field_name`, `field_type`, `field_role`) with zero personal identifiers, zero UUIDs, zero session specifics, and zero instance values.

# BEJSON_Flow 1.0.0 -> 1.1.0 (PKG 106 · 2026-11-22)
- Added `lib/Canvas_Flow/lib_bejson_Canvas_Flow_presets.js` with shape-specific preset field catalogs (`start`, `end`, `shape`, `redirect`, `variable`, `loopback`), custom constant field type coercion/validation (`string`, `number`, `integer`, `boolean`), and end-node stop condition evaluation (`always`, `time_running`, `variable_equals`, `variable_gte`).
- Added `lib/Canvas_Flow/lib_bejson_Canvas_Flow_runtime.js` for asynchronous step-by-step flow execution (`Play`, `Pause`, `Resume`, `Stop`) with live `time_running` tracking and active node/connector highlighting.
- Added `loopback` node shape (`NODE_TYPE_LOOPBACK`) with multi-anchor backward return routing (`3` interactive anchor points along the U-loop return path so intermediate nodes can be inserted inside the loop).
- Added 450ms long-press gesture on canvas nodes to select and open the Node Specific Properties overlay panel (`#be-panel-node-props`) for configuring preset fields, custom constant fields, and end-node stop conditions.
- Added `Flow` option to the main toolbar with `Play`, `Pause`, `Resume`, `Stop` transport buttons and live status telemetry.
- Added `lib/Canvas_Flow/flow_cli.js` (49-column terminal discipline) for CLI flow creation, mutation, validation, and simulation.

# lib_bejson_canvas_core.js 1.0.0 -> 1.0.1 (2026-11-22)
- CC-01 addObject: default size 64 when missing/invalid (no NaN)
- CC-02 getFieldMap: non-enumerable doc._field_map_cache, Fields-identity invalidation
- CC-03 createCanvasStore({validator:{mfdb,bejson}}) injection; warning when no validator present
- CC-04 child entities Format_Version 104a
- CC-05 dim_width/dim_height from obj.width/height (fallback size); import restores them
- CC-06 nextId = max(meta next_id, maxShapeId+1); bad ids use separate fallback counter
