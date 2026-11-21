# Universal Canvas Core Rules (`lib_bejson_canvas_core`)

## 1. Scope & Authority
- Applies to `lib_bejson_canvas_core.js`, the `Lib_JS/Canvas/` family, and any application or extension family built on top of the universal canvas foundation.
- Precedence: Local negative constraints in this file override general implementation defaults.

## 2. Universal Canvas Core Philosophy
- `lib_bejson_canvas_core` is strictly a **universal, domain-agnostic canvas foundation**.
- It is designed to power any spatial canvas application — drawing tools, diagrams, flowcharts, wireframes, or editors — without embedding domain-specific assumptions.
- Responsibilities allowed inside `lib_bejson_canvas_core`:
  - Spatial coordinate and bounds tracking (`cx`, `cy`, `x`, `y`, `size`, lane/row quantization).
  - Base collision prevention and placement geometry.
  - Object-to-MFDB entity mapping (1 canvas object = 1 dense BEJSON `104` MFDB entity linked to `104a.mfdb.bejson`).
  - Live BEJSON schema generation (`MFDB-132` single-file package, `104a` manifest, live position map).
  - Single-file `MFDB-132` import, export, and validation via `Lib_JS/Core/`.
  - Reactive core store, selection state, and undo/redo history hooks.

## 3. Extension Family Separation
- All domain-specific tools, node types, connectors, brush engines, flow logic, or specialized renderers **MUST** live in separate extension families built on top of `lib_bejson_canvas_core`:
  - `Canvas_Drawing` — freehand brushes, strokes, fills, layers, and raster/vector drawing tools.
  - `Canvas_Diagram` — diagram nodes, ports, connectors, and architectural templates.
  - `Canvas_Flow` — flowcharts, decision gates, directional edges, and execution traversal.
- Extension families consume `lib_bejson_canvas_core` via its public store and MFDB entity APIs rather than modifying core internals.

## 4. Negative Constraints (Strict Absolutes)
- ❌ NEVER add domain-specific drawing, diagramming, or flowchart logic directly into `lib_bejson_canvas_core.js`.
- ❌ NEVER hardcode domain-specific shape libraries, edge routers, or brush engines inside the core canvas store.
- ❌ NEVER couple `lib_bejson_canvas_core.js` to DOM rendering, CSS classes, or browser-only UI elements.
- ❌ NEVER break `MFDB-132` single-file import/export compatibility or bypass `104a.mfdb.bejson` entity registration.
- ❌ NEVER bypass field-map indexing (`bejson_core_get_field_map`) when reading or importing BEJSON records.
- ❌ NEVER generate filler content, mock objects, or unrequested placeholder data inside canvas templates or panels.

## 5. Verification Gate
- Verify `wc -c AGENTS.md` stays strictly under `24,000` bytes.
- Before releasing changes to `lib_bejson_canvas_core.js`, verify:
  1. Zero-error loading alongside all `Lib_JS/Core/` modules.
  2. `MFDB-132` single-file export passes `MFDB_VALIDATOR` and `BEJSON_VALIDATOR`.
  3. Export-to-import round-trip preserves all MFDB entities and coordinates identically.
