# Canvas Core Audit & Bug Record
`lib/Canvas/lib_bejson_canvas_core.js` · Audit Record · 2026-11-22 · BEJSON Flow

Per project constraints, `lib/Core/` and `lib/Canvas/` (`lib_bejson_canvas_core.js`) are frozen foundational libraries and must remain unmodified by consumer applications. This document records all audited bugs, structural edge cases, and runtime limitations identified in `lib_bejson_canvas_core.js` for upstream maintainer remediation.

---

## 1. Summary of Identified Defects

| Defect ID | Category | Severity | Location | Summary |
|---|---|---|---|---|
| `BUG-CC-01` | Arithmetic / Physics | **High** | Lines 711–738 | Missing default `size` in `addObject` triggers `NaN` propagation in MTV physics engine. |
| `BUG-CC-02` | Environment Compatibility | **Medium** | Lines 111–126 | Node.js / CLI execution lacks field-map caching fallback, causing $O(N)$ linear scans on every lookup. |
| `BUG-CC-03` | Schema Validation | **Medium** | Lines 498–525 | Node.js / CLI execution skips entity validation due to browser-only `window.*` validator lookups. |
| `BUG-CC-04` | Format Inconsistency | **Low** | Lines 370, 391, 487 | Format version mismatch: Manifest declares `104a` while child entities declare `104`. |
| `BUG-CC-05` | Geometry Model | **Low** | Lines 357–359 | Dimension flattening: `dim_width` and `dim_height` are hardcoded to `obj.size`, precluding non-square rectangular shapes. |
| `BUG-CC-06` | Deserialization State | **Low** | Lines 626–637 | Ordering sensitivity of `canvas_meta` in `importMfdb132` when resolving `maxId` against non-contiguous IDs. |

---

## 2. Detailed Technical Analysis

### `BUG-CC-01`: Missing Default `size` in `addObject`
- **Location:** `lib/Canvas/lib_bejson_canvas_core.js#L711-L738`
- **Trigger:** Calling `store.addObject(type, targetCx, targetCy)` without explicitly passing the 4th argument `size`.
- **Root Cause:**
  ```javascript
  function addObject(type, targetCx, targetCy, size, stageW, stageH) {
    if (stageW) state.stageWidth = stageW;
    if (stageHeightOrFallback(stageH)) state.stageHeight = stageH;

    const placed = resolveDropPosition(state.shapes, targetCx, targetCy, size, state.stageWidth, state.stageHeight);
    if (!placed) return null;
  ```
  `size` is `undefined`. Inside `resolveDropPosition`:
  ```javascript
  function clampToStage(cx, cy, size, stageW, stageH) {
    const half = size / 2; // NaN
    const maxW = Math.max(size, stageW || size); // NaN
    return {
      cx: Math.max(half, Math.min(maxW - half, cx)), // NaN
      cy: Math.max(half, Math.min(maxH - half, cy))  // NaN
    };
  }
  ```
  `placed` receives `{ cx: NaN, cy: NaN }`. The newly minted object in `state.shapes` stores `cx: NaN, cy: NaN, size: undefined`. Any subsequent MTV collision checks against this shape produce `NaN` across all arithmetic comparisons, corrupting the physics loop.
- **Upstream Recommendation:**
  ```javascript
  const safeSize = (Number.isFinite(size) && size > 0) ? size : 64;
  ```

---

### `BUG-CC-02`: Node.js Execution Bypasses $O(1)$ Field Map Cache
- **Location:** `lib/Canvas/lib_bejson_canvas_core.js#L111-L126`
- **Trigger:** Calling `importMfdb132()` or running `canvas_cli.js` within a Node.js runtime environment.
- **Root Cause:**
  ```javascript
  function getFieldMap(doc) {
    const core = (typeof window !== 'undefined' && window.BEJSON) ? window.BEJSON : null;
    if (core && typeof core.bejson_core_get_field_map === 'function') {
      try {
        return core.bejson_core_get_field_map(doc);
      } catch (_) {
        // fallback below
      }
    }
    const fm = {};
    const fields = (doc && Array.isArray(doc.Fields)) ? doc.Fields : [];
    fields.forEach(function (f, i) {
      if (f && f.name) fm[f.name] = i;
    });
    return fm;
  }
  ```
  In Node.js, `window` is undefined, so `core` is unconditionally `null`. It never attempts CommonJS `require('../Core/lib_bejson_Core_bejson_core.js')` nor does it cache `fm` onto `doc._field_map_cache`. Every single entity lookup recalculates `fields.forEach(...)` repeatedly, which violates Policy §3 (`Mandatory O(1) Field Map Cache for every operation`).
- **Upstream Recommendation:**
  Attach the fallback map directly to `doc._field_map_cache = fm;` on first computation, and support Node `require` fallback when available.

---

### `BUG-CC-03`: Node.js Execution Skips MFDB Entity Validation
- **Location:** `lib/Canvas/lib_bejson_canvas_core.js#L498-L525`
- **Trigger:** Calling `validateMfdb132(doc)` inside Node.js.
- **Root Cause:**
  ```javascript
  const mfdbVal = (typeof window !== 'undefined' && window.MFDB_VALIDATOR) ? window.MFDB_VALIDATOR : null;
  const bejsonVal = (typeof window !== 'undefined' && window.BEJSON_VALIDATOR) ? window.BEJSON_VALIDATOR : null;
  ```
  Both validator instances resolve to `null` in Node.js. The fallback branch only checks:
  ```javascript
  if (!doc || doc.Format_Version !== '104a' || doc.Schema_Name !== 'MFDB-132' || doc.Package_Format !== 'MFDB-Chunked-104a') {
    errors.push('Document is not a valid MFDB-132 package.');
  }
  ```
  It completely bypasses verification of chunk rows, child entity schemas, field type compliance, and SHA-256 hashes when executed in CLI/automated test environments.
- **Upstream Recommendation:**
  Allow dependency injection in `createCanvasStore({ validator: ... })` or detect CommonJS environment.

---

### `BUG-CC-04`: Chunked Export Declares Discrepant Format Versions
- **Location:** `lib/Canvas/lib_bejson_canvas_core.js#L370, L391, L487`
- **Trigger:** Calling `exportMfdb132()`.
- **Root Cause:**
  The chunked manifest declares `Format_Version: '104a'`, but `buildCanvasMetaEntityDoc()` and `buildObjectEntityDoc()` stamp child entities with `Format_Version: '104'`.
  Although both belong to the Foundational Era, child entity schemas in an MFDB 1.32 package should harmonize format versions with the manifest container.
- **Upstream Recommendation:**
  Standardize child entity `Format_Version` to `'104a'`.

---

### `BUG-CC-05`: Inability to Represent Non-Square Geometries
- **Location:** `lib/Canvas/lib_bejson_canvas_core.js#L357-L359`
- **Trigger:** Exporting rectangular objects where width != height.
- **Root Cause:**
  ```javascript
  function computeObjectRow(obj) {
    ...
    return [
      ...
      roundCoord(obj.size), // dim_size
      roundCoord(obj.size), // dim_width
      roundCoord(obj.size), // dim_height
      ...
    ];
  }
  ```
  `OBJECT_ENTITY_FIELDS` provides distinct `dim_width` and `dim_height` columns, but `computeObjectRow` discards `obj.width` or `obj.height` and forces `obj.size` into all three columns.
- **Upstream Recommendation:**
  ```javascript
  const w = obj.width !== undefined ? obj.width : obj.size;
  const h = obj.height !== undefined ? obj.height : obj.size;
  ```

---

### `BUG-CC-06`: Ordering Sensitivity in `importMfdb132` Max ID Calculation
- **Location:** `lib/Canvas/lib_bejson_canvas_core.js#L626-L637`
- **Trigger:** Importing MFDB packages where `canvas_meta` does not occur as the first entry in `manifest.Values`, combined with non-sequential or deleted IDs.
- **Root Cause:**
  ```javascript
  if (eFm['next_id'] !== undefined) {
    const parsedNext = Number(metaRow[eFm['next_id']]);
    if (Number.isFinite(parsedNext) && parsedNext > maxId) maxId = parsedNext - 1;
  }
  ```
  If `canvas_meta` is read before shapes, `maxId` is initialized to `parsedNext - 1`. If an incoming shape row subsequently has an invalid or missing `obj_id`:
  ```javascript
  const safeId = Number.isFinite(id) && id > 0 ? id : (maxId + 1);
  if (safeId > maxId) maxId = safeId;
  ```
  `safeId` becomes `maxId + 1`, artificially inflating `state.nextId` beyond `parsedNext`.
- **Upstream Recommendation:**
  Preserve `parsedNext` independently as `metaNextId` and compute `state.nextId = Math.max(metaNextId, maxShapeId + 1)`.

---
*End of Bug Record — Recorded for dev tracking in BEJSON Flow.*
