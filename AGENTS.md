# AGENTS.md — BEJSON Flow

**Name:** AGENTS.md (BEJSON Flow)  
**Description:** Standing operational rules, architectural separation of concerns, immutability constraints, spatial coordinate laws, and flow execution discipline for the BEJSON Flow application.  

**Project:** BEJSON Flow (`BEJSON_Flow`)  
**Status:** Active  
**Version:** `1.1.0`  
**Date Created:** 2026-11-22  
**Author:** Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton  
**RELATIONAL_ID:** `9c148f32-7231-41ee-9a28-66d510e1a499`  
**License:** PolyForm Noncommercial License 1.0.0 (`PolyForm-Noncommercial-1.0.0`)  
**File Size Budget:** Up to 80 KB per code file (`AGENTS.md` strictly `< 24 KB`).

---

## Phased Implementation Plan (Execute Piece-by-Piece with Testing at Each Step)

All enhancements must be built incrementally, separating concerns into modular `lib/Canvas_Flow/` libraries and `js/` frontend controllers while maintaining the Flow CLI and unit/browser verification suites after every phase.

### Phase 1: Shape Preset Fields vs. Custom Fields & Schema Expansion (`lib_bejson_Canvas_Flow_presets.js`)
- **Objective:** Create a dedicated preset and custom field registry (`lib/Canvas_Flow/lib_bejson_Canvas_Flow_presets.js`) and update `lib_bejson_Canvas_Flow_schemas.js` & `lib_bejson_Canvas_Flow_core.js` so every node's diagram entry supports both **Preset Fields** and **Custom Fields**.
- **Preset Fields (Shape-Specific Functions / Attributes):**
  - Different node shapes ("shields" / node types) provide distinct selectable **preset fields** representing functional attributes in the flow:
    - **`start`:** `initial_payload` (`string`), `auto_start` (`boolean`), `max_steps` (`integer`).
    - **`end` (Stop Node):** `stop_condition_type` (`string`: `always` | `time_running` | `variable_equals` | `variable_gte`), `stop_variable` (`string`), `stop_target_value` (`string`), `max_time_ms` (`integer`).
    - **`shape` (Process Node):** `action_fn` (`string`: `noop` | `transform` | `log_state` | `delay_ms`), `target_variable` (`string`), `action_param` (`string`).
    - **`redirect` (Gate Node):** `feature_flag` (`string`), `operator` (`string`: `is_true` | `equals` | `gt` | `lt`), `compare_value` (`string`), `fallback_branch` (`string`).
    - **`variable` (State / Counter Node):** `variable_name` (`string`), `variable_mode` (`string`: `counter` | `declare` | `accumulate`), `initial_value` (`number`), `step_delta` (`number`).
    - **`loopback` (Loopback Node):** `loop_count_max` (`integer`), `loop_condition_var` (`string`), `loop_target_value` (`string`), `loop_offset_y` (`number`).
  - Selected preset fields are added directly to the node's diagram BEJSON entry and serialized into the exported BEJSON 104a document.
- **Custom Fields (Constants Only):**
  - Users can add arbitrary custom fields (`name`, `type` ∈ `string | number | integer | boolean`, `value`) to any node's diagram entry and edit their values.
  - Custom fields act strictly as constant metadata entries on the node's diagram record (no runtime execution side-effects tied to custom fields yet).
- **Phase 1 Test Gate:** Unit tests verifying preset catalog lookup per shape type, adding/editing preset fields, adding/editing custom fields with type coercion, and BEJSON 104a diagram serialization.

### Phase 2: End (Stop) Node Stop Condition Field & Evaluation
- **Objective:** Upgrade the `end` (Stop) node and flow traversal logic to configure and evaluate a **Stop Condition** field.
- **Supported Stop Conditions:**
  - `always`: Standard immediate stop when reached.
  - `time_running`: Stops when elapsed execution duration (`time_running` in ms) reaches or exceeds the configured threshold (`max_time_ms`).
  - `variable_equals` / `variable_gte`: Stops when a defined runtime variable in flow context equals (or is `>=`) the target value (`stop_variable == stop_target_value`).
- **Phase 2 Test Gate:** Unit tests verifying stop condition persistence on the `end` node and conditional termination evaluation against `time_running` and runtime variables.

### Phase 3: Loopback Node Shape (`loopback`) & Multi-Anchor Backward Routing
- **Objective:** Add the `loopback` node shape (`NODE_TYPE_LOOPBACK = 'loopback'`) to `lib/Canvas_Flow/` and `js/app_canvas.js`.
- **Loopback Mechanics:**
  - A `loopback` node routes flow backward along a visual return loop path (offset above/below the primary axis) back to an upstream target anchor/node while also maintaining a forward exit path once the loop condition/count completes.
  - Exposes **multiple anchor points** (`r` anchors along the backward loop segments: e.g., Exit Anchor, Mid-Loop Return Anchor, and Re-entry Anchor) so users can click any anchor dot along the loopback path to insert intermediate nodes inside the backward loop.
- **Phase 3 Test Gate:** Unit tests verifying `loopback` node insertion, backward connector creation, multi-anchor coordinate generation, inserting intermediate nodes on loopback anchor points, and bounded loop traversal.

### Phase 4: Long-Press Node Selection & Specific Properties Inspector UI
- **Objective:** Allow selecting a node by **long-pressing** it on the canvas (`~450ms` pointer hold with `< 6px` movement tolerance so normal drag-and-drop remains instant) to open its **Node Properties Overlay Panel** (`#be-panel-node-props`).
- **Properties Panel Capabilities:**
  - Displays node ID, UUID, shape type badge, center coordinates `(cx, cy)`, and editable node label.
  - For `end` nodes: dedicated **Stop Condition** editor (`stop_condition_type`, `stop_variable`, `stop_target_value`, `max_time_ms`).
  - **Preset Fields Section:** Dropdown filtered to the active shape type's available preset fields -> add preset field to diagram entry -> edit value inline.
  - **Custom Fields Section:** Add custom field (`field_name`, `type` selector: `string | number | integer | boolean`, `value` input) -> edit or remove existing custom fields -> immediately reflected in the live BEJSON diagram schema.
- **Phase 4 Test Gate:** Headless Chromium / Playwright verification of long-press opening the Node Properties panel, adding preset fields, adding custom fields, editing stop conditions, and verifying the live BEJSON schema viewer output.

### Phase 5: Interactive Flow Runtime & Main Toolbar Transport Controls (`lib_bejson_Canvas_Flow_runtime.js`)
- **Objective:** Create `lib/Canvas_Flow/lib_bejson_Canvas_Flow_runtime.js` for step-by-step asynchronous execution and add a **`Flow`** main toolbar option in `js/app_tools.js`.
- **Main Toolbar Controls (Row 1 -> Row 2 Options):**
  - Selecting **`Flow`** in the Row 1 main toolbar displays transport buttons in the Row 2 options bar:
    - **Play** (`▶`): Starts step-by-step flow traversal from `Start`, tracking `time_running` and highlighting active nodes/connectors on canvas.
    - **Pause** (`⏸`): Suspends execution at the current node and preserves elapsed `time_running` and variable context.
    - **Resume** (`⏯`): Continues traversal from the paused step.
    - **Stop** (`⏹`): Halts execution, resets step highlights, and clears runtime state.
- **Phase 5 Test Gate:** Unit tests for runtime state machine (`IDLE -> RUNNING -> PAUSED -> RUNNING -> STOPPED / COMPLETED`) and browser UI verification of toolbar transport buttons.

### Phase 6: Flow CLI (`lib/Canvas_Flow/flow_cli.js`) & Full Regression Suite
- **Objective:** Build and maintain `lib/Canvas_Flow/flow_cli.js` adhering to 49-column terminal discipline (`DIVIDER_49`), supporting full CLI management of flow files:
  - Commands: `init`, `add-node`, `add-loopback`, `add-preset`, `add-custom`, `set-stop`, `simulate`, `validate`, `list`, `get`, `export`.
- **Phase 6 Test Gate:** Run `node lib/Canvas/tests/test_canvas_core.js`, `node lib/Canvas_Flow/tests/test_canvas_flow.js`, `node lib/Canvas_Flow/flow_cli.js --help`, and full headless Chromium verification.

---

## 1. Absolute Foundation Law — Core & Canvas Immutability
- **Immutable Foundations:** `lib/Core/` and `lib/Canvas/` (`lib_bejson_canvas_core.js`, schemas, templates, CLI, and core tests) are frozen ecosystem foundations. **Direct modifications to any files within `lib/Core/` or `lib/Canvas/` are strictly prohibited.**
- **Extension Principle:** All flow-specific capabilities, schemas, preset catalogs, runtime controllers, node handlers, renderers, CLI tools, and graph utilities belong exclusively to `lib/Canvas_Flow/` and `js/`.
- **Consumption Contract:** Flow modules consume `CanvasCore` and `Core` strictly via their public APIs (store factories, spatial math, MTV collision engine, and field-map caching) without mutating core internals.

---

## 2. Architectural Separation of Concerns
Every component must maintain single-responsibility modular isolation:

1. **`lib/Core/` (Ecosystem Baseline · Immutable):**
   - Universal tabular data serialization (`104`, `104a`, `104db`), JSON parsing, field-map cache indexing, and MFDB schema validation.

2. **`lib/Canvas/` (Universal Canvas Core · Immutable):**
   - Domain-agnostic reactive canvas store (`createCanvasStore`), spatial geometry, Minimum Translation Vector (MTV) non-overlap collision resolution, and live `MFDB-132` packaging.

3. **`lib/Canvas_Flow/` (Project Domain · Flow Extension Family):**
   - `lib_bejson_Canvas_Flow_schemas.js`: Authoritative BEJSON 104a / MFDB schema definitions, record builders (including preset fields, custom fields, and stop conditions), and $O(1)$ field-map caches.
   - `lib_bejson_Canvas_Flow_presets.js`: Shape-specific preset field catalogs, custom field type validators/coercers (`string`, `number`, `integer`, `boolean`), and node diagram attribute helpers.
   - `lib_bejson_Canvas_Flow_core.js`: Flow store (`createFlowStore`), Start/End default instantiation, node insertion via anchor dot splitting, loopback multi-anchor geometry, connector geometry, directional arrow math, and traversal simulation engine.
   - `lib_bejson_Canvas_Flow_runtime.js`: Asynchronous step-by-step execution controller supporting Play, Pause, Resume, Stop, live `time_running` tracking, and event hooks for UI highlighting.
   - `lib_bejson_Canvas_Flow_validator.js`: Flow structural validator enforcing Start/End presence, directed graph reachability, dead-end detection, loopback validity, stop condition syntax, and valid variable configurations.
   - `lib_bejson_Canvas_Flow_templates.js`: Reusable flow starter topologies (Linear Pipeline, Feature Gate Branching, and Counter Accumulator Loop).
   - `flow_cli.js`: 49-column CLI tool for creating, mutating, inspecting, validating, and simulating BEJSON Flow files from the terminal.
   - `index.js`: CommonJS facade exporting all flow modules.

4. **`js/` (Frontend UI Presentation):**
   - `app_tools.js`: Tool definitions (`Selector`, `Shape`, `Flow`), SVG iconography, active tool state, flow transport controls (`Play`, `Pause`, `Resume`, `Stop`), and dual scrollable toolbar tracks.
   - `app_rulers.js`: 8-lane quantization markers, Ry=32px baseline grid canvas, and real-time X/Y HUD.
   - `app_canvas.js`: Stage viewport interactions, long-press node inspection trigger, object drag/drop placement, multi-anchor loopback rendering, tracker line updates, and DOM rendering.
   - `app_panels.js`: Modals, Node Properties inspector (preset fields, custom fields, stop conditions), View Objects inspector, live BEJSON/MFDB-132 schema tabs, and startup file gate.
   - `app_main.js`: Lifecycle coordinator, menu bar dropdown controllers, keyboard accelerators, and module initialization.

---

## 3. Spatial Coordinate & Layering Laws

- **Center-First Address System:** Every node's primary address coordinate is strictly its center `(cx, cy)`. Bounding top-left coordinates are derived via `x = cx - size / 2` and `y = cy - size / 2`.
- **Connector Layering Discipline:** All connector lines MUST reside strictly behind shapes (`zIndex = 1` for connectors vs `zIndex = 2` for shapes).
- **Directional Flow Arrows:** Connector lines originate from the source shape center and point towards the target shape perimeter with a directional arrowhead showing the exact flow direction.
- **Midpoint & Loopback Connector Anchor Dots:** Every standard connector maintains an interactive anchor dot placed at its exact geometric midpoint:
  $$\text{midX} = \frac{x_1 + x_2}{2}, \quad \text{midY} = \frac{y_1 + y_2}{2}, \quad \text{radius} = 6\text{px}$$
  Loopback connectors expose multiple anchor dots along their backward return segments so intermediate nodes can be inserted directly inside the loop.

---

## 4. Permitted Flow Node Types & Execution Semantics

1. **`start` Node:** Mandatory flow origin; instantiated and connected by default upon flow session creation.
2. **`end` Node:** Mandatory flow terminus; supports configurable `stop_condition` (`always`, `time_running`, `variable_equals`, `variable_gte`).
3. **`shape` Node:** Standard process / action node inserted on connector anchor dots.
4. **`redirect` Node:** Traffic branch shape that routes flow to an alternate branch until a specified feature flag or condition key is active.
5. **`variable` Node:** State node that either declares custom key-value variables or auto-increments a counter by 1 (`+1`) upon every execution pass-through.
6. **`loopback` Node:** Backward-looping flow node that provides multi-anchor return routing to an upstream node until a loop count or condition is satisfied.

---

## 5. Developer Guidelines for Creating New Flow Libraries

- **File Budget:** Project code files may be up to **80 KB** (`AGENTS.md` files must remain strictly under **24 KB**), and concerns must be separated into modular, single-responsibility files rather than monolithic blocks.
- **Dual Export Pattern:** Every flow library must support both Node.js (`module.exports`) and Browser global namespaces (`window.BEJSON_CANVAS_FLOW_*`) without throwing browser errors (no root CommonJS `require()` or naked ES `export` in browser contexts).
- **Zero In-Memory Cache Key Leaks:** Never serialize `_bejson_field_map` into persistent BEJSON records.
- **Mandatory Licensing:** All new project files must include the PolyForm Noncommercial License 1.0.0 header with author credit.
- **Verification Gate:**
  1. `node lib/Canvas/tests/test_canvas_core.js` must pass.
  2. `node lib/Canvas_Flow/tests/test_canvas_flow.js` must pass.
  3. `node lib/Canvas_Flow/flow_cli.js` commands must pass validation.
  4. Browser initialization in headless Chromium must boot with **zero console errors and zero uncaught exceptions**.
  5. On updates, increment `Package_Version` in `bejson_project.json`.

---

## 6. Future Plan (On Hold — Do Not Execute Until Explicitly Activated)

### Future Phase A: Gemini Session Node (`NODE_TYPE_GEMINI = 'gemini'`) & AI Library Integration
- **Status:** On Hold (Deferred pending user activation; no Python integration yet).
- **Objective:** Import ecosystem AI libraries (`AI_Core` / `GeminiInteractionsClient` or JS equivalent `lib_bejson_Canvas_Flow_gemini.js`) to introduce a **`gemini` Flow Node** that requests structured, session-based output and pipes that structured output back into the flow by sourcing the node's session.
- **Planned Architecture & Capabilities:**
  1. **Session-Based Chaining (`previous_interaction_id`):**
     - Each `gemini` node maintains a `session_key` (e.g., `gemini_session_1`) and tracks its server-side `interaction_id` (`previous_interaction_id`) across multiple passes or chained Gemini nodes sharing the same `session_key`.
  2. **Structured Output Contract:**
     - The `gemini` node requests deterministic JSON/BEJSON structured output matching declared `response_schema_keys` (e.g., `decision,confidence,next_payload`).
  3. **Sourcing the Node Session Back into the Flow:**
     - Downstream nodes (`variable`, `redirect`, `loopback`, `end`, `shape`, or subsequent `gemini` nodes) can **source** a Gemini node's session by `session_key` / node ID (`source_session`, `source_field`) so structured output fields directly drive flow variables, redirection gates, loop exits, and stop conditions.
  4. **Planned `gemini` Shape Preset Fields:**
     - `model_id` (`string`: resolved via canonical model registry, default `Gemini_3_6_Flash` / `gemini-3.6-flash`).
     - `session_key` (`string`: session identifier for multi-turn continuation).
     - `source_session` (`string`: upstream session key to pipe input context from).
     - `prompt_template` (`string`: prompt with `{{variable}}` and `{{session.field}}` interpolation).
     - `response_schema_keys` (`string`: comma-separated structured output keys unpacked into the session & flow context).
     - `system_instruction` (`string`: role and output constraint instructions).