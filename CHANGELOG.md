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
