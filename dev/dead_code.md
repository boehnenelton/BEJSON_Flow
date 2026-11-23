# Dead / Removed Code Record

## 2026-11-23 (PKG111)
- `lib/lib_bejson_canvas_core.js` — REMOVED. Stale duplicate of `lib/Canvas/lib_bejson_canvas_core.js` (v1.0.1 minus the
  stage-metric import fix). Verified zero references: `index.html` loads `lib/Canvas/...`, `Canvas_Flow` requires `../Canvas/...`.
  Only prose mentions of the filename remain (README/AGENTS), which refer to the Canvas copy.
