# AGENTS.md — Lib_JS/Canvas_Flow

**Name:** AGENTS.md (Lib_JS/Canvas_Flow)  
**Description:** Standing operational rules, negative constraints, and strict execution boundaries for the Canvas_Flow extension family.  
**Family:** Canvas_Flow  
**Status:** Flow Architecture Baseline  
**Version:** `1.2.0`  
**Date Created:** 2026-11-21  
**Author:** Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton  
**RELATIONAL_ID:** `1b9ec4e2-79f0-4beb-8f43-2efb54478367`  
**License:** PolyForm-Noncommercial-1.0.0  

---

## 0. Absolute Standing Constraint — Explicit User Instruction Only
- **Zero-Speculative Execution Law:** The agent will NOT do anything, implement unrequested logic, scaffold unprompted flowchart node types, design edge routing heuristics, create schemas, or modify any files in this family unless explicitly instructed to do so by the user.
- **Standby Default:** In the absence of an explicit, direct user prompt specifying the exact feature, structure, or implementation to build, the agent must remain strictly in standby.
- **No Unsolicited Expansion:** Do NOT proactively fill in empty functions, add sample data, or flesh out flow traversal pipelines without an explicit user directive.

## 1. Spatial Coordinate & Layering Laws
- **Center-First Address System:** Every shape node's primary address position is strictly its center coordinate `(cx, cy)`. Bounding top-left coordinates are derived via `x = cx - size / 2` and `y = cy - size / 2`.
- **Connector Layering:** All connector lines MUST reside strictly behind shapes (`zIndex = 1` for connectors vs `zIndex = 2` for shapes).
- **Directional Flow Arrows:** Connector lines originate from the source shape center and point towards the target shape with a directional arrowhead showing the direction of flow.
- **Connector Midpoint Anchor Dots:** Every connector has an anchor dot circle placed at its exact midpoint (`midX = (x1 + x2) / 2`, `midY = (y1 + y2) / 2`, `radius = 6px`). Triggering this dot splits the connector and inserts a node.

## 2. Permitted Flow Node Types
1. **`start` Node:** Mandatory flow origin; connected by default upon flow creation.
2. **`end` Node:** Mandatory flow terminus; all traversals must reach an end node.
3. **`shape` Node:** Basic process / action shape inserted via connector anchor dots.
4. **`redirect` Node:** Redirection shape to direct traffic into alternative flow paths or branches until a feature flag or condition is set.
5. **`variable` Node:** Variable / counter shape that declares custom key-value fields or increments a variable by 1 (`+1`) every time the shape is passed through during execution.

## 3. Scope & Authority
- Applies to all files within `Lib_JS/Canvas_Flow/` and downstream modules built on top of this extension family.
- Precedence: Local negative constraints in this file override general implementation defaults.

## 4. Architectural Role
- `Canvas_Flow` is an extension family built strictly on top of `Lib_JS/Canvas` (`lib_bejson_canvas_core.js`).
- It consumes the universal spatial coordinate store, 8-lane/Ry=32 quantization, and MFDB-132 container packaging from Canvas Core.
- It must NEVER modify `lib_bejson_canvas_core.js` internals directly.

## 5. Negative Constraints (Strict Absolutes)
- ❌ NEVER execute changes or add features without explicit user instruction.
- ❌ NEVER place connector lines in front of shape nodes (`zIndex` must remain 1).
- ❌ NEVER address nodes by top-left coordinates instead of primary center `(cx, cy)`.
- ❌ NEVER omit directional flow arrows or midpoint anchor dots on connectors.
- ❌ NEVER generate filler mock data, unrequested placeholder nodes, or unsolicited demo files.
- ❌ NEVER bypass BEJSON Core field-map indexing (`bejson_core_get_field_map`).

## 6. Verification Gate
- Verify `wc -c AGENTS.md` stays strictly under `24,000` bytes.
- Run `node Lib_JS/Canvas_Flow/tests/test_canvas_flow.js` before releasing changes to this family.
