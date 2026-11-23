# AGENTS.md — Lib_JS/Canvas (Universal Canvas Core)

**Name:** AGENTS.md (Lib_JS/Canvas)  
**Description:** Standing operational rules, immutability constraints, and architectural boundaries for the Universal Canvas Core family (`lib_bejson_canvas_core`).  
**Family:** Canvas  
**Status:** Frozen / Immutable Baseline Core (Modifications Gated by Explicit User Permission)  
**Version:** `1.0.0`  
**Date Created:** 2026-11-21  
**Author:** Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton  
**RELATIONAL_ID:** `3aabd7f6-43e9-4479-832c-1d07805c33b7`  
**License:** PolyForm-Noncommercial-1.0.0  

---

## 0. Immutability Law & Architectural Freeze
- **Core Immutability Invariant:** `lib_bejson_canvas_core.js` is an immutable, frozen baseline foundation. Direct modifications are strictly prohibited unless explicitly requested by the user with an overriding instruction.
- **Architectural Boundary Immutability:** The universal canvas substrate must remain strictly decoupled and domain-agnostic. No domain-specific drawing engines, diagram connectors, or flowchart topologies may be introduced into the core.
- **Schema Immutability:** The dense BEJSON 104 entity mapping and single-file `MFDB-132` chunk packaging contracts (`104a.mfdb.bejson` manifest, `canvas_meta`, `obj_*`) are immutable.

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

## 7. Recorded User Exemption (2026-11-23)
The owner granted an explicit, scoped exemption to the immutability law above: `lib/Canvas/` (canvas core and the Canvas
family) may be modified, **gated behind `canvasMode` (0 default)**. `lib/Core/` (the Core family) remains frozen. All Canvas
changes require golden-file parity for mode 0 (`lib/Canvas/tests/test_canvas_mode0_golden.js`).
