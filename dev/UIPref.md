# BEJSON Flow — User UI & Design Preferences (`dev/UIPref.md`)

**Author:** Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton  
**License:** PolyForm Noncommercial License 1.0.0 (`PolyForm-Noncommercial-1.0.0`)

## Recorded User Interface & Interaction Directives (2026-11-22)

1. **Long-Press Node Properties Trigger:**
   - Selecting a node on the canvas via a `~450ms` long-press opens its specific Node Properties editor without disrupting immediate drag-and-drop movement.
2. **Full-Screen High-Contrast Node Properties Editor (`#be-panel-node-props`):**
   - Rendered as a full-screen overlay (`100vw x 100vh`).
   - **Inputs, Selects & Textareas:** White background (`#FFFFFF`), black font (`#000000`), solid black border (`1px solid #000000`) by default; switches to vivid red background (`#DE2626`) with white text (`#FFFFFF`) when selected/focused.
   - **Buttons:** White background (`#FFFFFF`), black font (`#000000`), solid black border (`1px solid #000000`) by default; switches to vivid red background (`#DE2626`) with white text (`#FFFFFF`) on focus/active/hover.
3. **Sanitized Node Options Schema Export & Import:**
   - Exporting or importing node options via BEJSON 104a schema (`flow_node_options_schema`) must strictly strip all personal identifiers, UUIDs, session specifics, coordinates, and instance values—retaining only structural option definitions (`field_category`, `field_name`, `field_type`, `field_role`).
4. **Main Toolbar Flow Transport Controls:**
   - The `Flow` option in the Row 1 main toolbar exposes `Play`, `Pause`, `Resume`, and `Stop` buttons alongside live status telemetry in the Row 2 options bar.
5. **Loopback Node Shape:**
   - Multi-anchor backward return routing (`3` interactive anchor dots along the return path) allowing intermediate components to be inserted inside the backward loop.
