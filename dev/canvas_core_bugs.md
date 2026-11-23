# Canvas Core Audit & Bug Record
`lib/Canvas/lib_bejson_canvas_core.js` · rewritten 2026-11-23 · core v1.1.0 · BEJSON Flow PKG111

The 2026-11-22 record (BUG-CC-01..06) described v1.0.0. Re-audited against the shipped v1.0.1 file: five of six were already
fixed. This record replaces it. Every behavioural change below is gated by `canvasMode` (0 legacy default, 1 scaled world,
2 paged world) or `strictImport`, so canvas_mode 0 output is byte-structure-identical to v1.0.1 (golden test).

## Status of the original six
| ID | Status | Note |
|---|---|---|
| BUG-CC-01 | Fixed in 1.0.1 | `safeSize` default 64 |
| BUG-CC-02 | Fixed in 1.0.1 | field-map cache on doc |
| BUG-CC-03 | Fixed in 1.1.0 | validators injectable since 1.0.1; `strictImport` now verifies SHA-256 without a validator (D4) |
| BUG-CC-04 | Fixed in 1.0.1 | children are 104a; manifest MFDB_Version drift fixed in 1.1.0 (D7) |
| BUG-CC-05 | Fixed in 1.1.0 | export honoured width/height since 1.0.1; collision/clamp now rectangle-aware in mode >= 1 (D3) |
| BUG-CC-06 | Fixed in 1.0.1 | `max(metaNextId, maxId + 1)` |

## Defects fixed in 1.1.0
| ID | Defect | Fix | Gate |
|---|---|---|---|
| D1 | Stage = viewport px; saved lane/row depended on device | World fixed (mode 1/2); lane/row from world or page | mode >= 1 |
| D2 | Stage 0 collapsed clamp to (32,32); NaN targets | World never 0; viewport args are hints only; non-finite targets rejected | mode >= 1 |
| D3 | Collision used `size` only | `{w,h}` rectangle-aware clamp/overlap/MTV; `addObject(..., {width,height})` | mode >= 1 |
| D4 | Tampered chunk hash accepted without validator | `strictImport` verifies every File_Hash with the built-in SHA-256 | `strictImport` (default on in mode >= 1) |
| D5 | Out-of-world nodes survived import | Re-clamp to world on import | mode >= 1 |
| D6 | Import fallback size 96 vs default 64 | Fallback = DEFAULT_OBJECT_SIZE | mode >= 1 |
| D7 | Manifest 1.31 vs package 1.32 | Manifest uses 1.32 | mode >= 1 |
| D8 | test_canvas_core asserted 1.0.0 / child 104 | Asserts 1.1.0 / 104a | test only |
| D9 | Stale duplicate `lib/lib_bejson_canvas_core.js` | Removed (see dead_code.md) | n/a |
| D10 | Flow kept a second stage copy | Flow reads the core world in mode >= 1; mode 2 Start/End placed in page (0,0) | mode >= 1 |
| D11 | `fileMap` was a plain object (`__proto__` keys) | `Object.create(null)` | all modes (no output change) |

## Known limits (not defects)
- `moveObject` does not snapshot; callers must call `store.snapshot()` before a drag (the UI does).
- Mode 0 keeps legacy behaviour on purpose, including D1/D2/D3/D5/D6/D7 as documented above.
- UI camera (zoom/pan, ghost labels, page navigator) is not implemented yet; modes 1/2 are available at API and CLI level.
