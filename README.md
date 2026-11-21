# Canvas Core Framework

**Universal Domain-Agnostic Spatial Canvas Foundation & Interactive BEHTML Environment**  
**Author:** Elton Boehnen · boehnenelton2024@gmail.com · [boehnenelton2024.pages.dev](https://boehnenelton2024.pages.dev) · [github.com/boehnenelton](https://github.com/boehnenelton)  
**License:** PolyForm Noncommercial License 1.0.0 (`PolyForm-Noncommercial-1.0.0`)  
**Format:** BEJSON 104 / 104a (`MFDB-132`) & BEHTML 8-Lane Ry=32px

---

## 1. Executive Summary

`Canvas Core Framework` is a standalone, high-performance spatial canvas environment and universal foundation. Designed from the ground up to eradicate domain-specific bloat, it serves as the universal baseline for:
- **Vector & Freehand Drawing** (sketches, raster layers, annotations)
- **Technical & Architecture Diagramming** (system graphs, circuit blocks, ER models)
- **Execution Flowcharts** (control pipelines, decision trees, workflow engines)
- **Graphical MFDB Spatial Database Pipelines** (spatial indexes, entity coordinates, visual query planes)

The framework strictly decouples backend spatial mathematics, collision geometry, and BEJSON database persistence from the frontend DOM rendering and user interaction layers.

---

## 2. Architectural Pillars

### 2.1 Universal Foundation vs. Extension Families
In accordance with `AGENTS.md`, the core engine contains **zero domain-specific assumptions**. Specialized tools, node types, connectors, brush engines, and graph traversals are implemented as isolated extension families that consume this universal core:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Domain Extension Families                         │
├────────────────────┬────────────────────┬──────────────────────────────┤
│   Canvas_Drawing   │   Canvas_Diagram   │         Canvas_Flow          │
│ (Freehand Brushes, │  (Diagram Nodes,   │    (Execution Flowcharts,    │
│  Strokes, Layers)  │ Ports, Connectors) │  Decision Gates, Traversal)  │
└─────────┬──────────┴─────────┬──────────┴──────────────┬───────────────┘
          │                    │                         │
          └────────────────────┼─────────────────────────┘
                               ▼
        ┌────────────────────────────────────────────────────────┐
        │             Canvas Core Framework Baseline             │
        │  • Spatial Bounds & Coordinates (cx, cy, x, y, size)   │
        │  • BEHTML 8-Lane / Ry=32px Spatial Quantization        │
        │  • Minimum Translation Vector (MTV) Collision Engine   │
        │  • Object-to-MFDB Dense BEJSON 104 Entity Mapping      │
        │  • Live Schema Generation (104a Manifest, Position Map)│
        │  • Single-File MFDB-132 Packaging (Import / Export)    │
        │  • Reactive Observer Store & 50-Step Undo/Redo         │
        └────────────────────────────────────────────────────────┘
```

### 2.2 BEHTML Spatial Quantization & Tri-Color Design
- **Tri-Color Palette:** Pure White (`#FFFFFF`), True Black (`#000000`), and Signal Red (`#DE2626`).
- **Zero Border-Radius:** Strict `0px` radius on all interactive elements, dialogs, buttons, and panels.
- **Ry=32px Vertical Rhythm:** All bars, menus, and grid quantization adhere to 32px increments.
- **8-Lane Grid:** The canvas stage is quantized into 8 proportional horizontal lanes with sub-pixel coordinate tracking.

### 2.3 Object-to-MFDB Entity Mapping & Single-File Persistence
Every object placed on the canvas is treated as a first-class database entity:
- **1 Canvas Object = 1 Dense BEJSON 104 Entity (`obj_<type>_<id>.bejson`).**
- **Session Manifest:** Linked via `104a.mfdb.bejson` referencing all active entity files and metadata.
- **MFDB-132 Chunk Container:** The entire database packages into a portable, single-file `.mfdb132.bejson` document with pure-JS SHA-256 integrity checksums.
- **Round-Trip Fidelity:** Importing an `.mfdb132.bejson` package completely reconstructs session state, shapes, entity tables, and spatial coordinates identically.

---

## 3. Directory Layout

```
Canvas_Core_Framework/
├── AGENTS.md                  # Authoritative local architectural rules & negative constraints
├── README.md                  # Framework overview, architecture, and usage guide
├── bejson_project.json        # Standard BEJSON 104a project manifest
├── LICENSE                    # PolyForm Noncommercial License 1.0.0
├── index.html                 # Spatial application shell, stage, and panel mounts
├── css/
│   ├── behtml_base.css        # Base layout, typography, menus, toolbars, and rulers
│   └── behtml_panels.css      # Modal gates, draggable overlay panels, and schema views
├── js/
│   ├── app_main.js            # Bootstrap, menu dispatch, hotkeys, and event coordination
│   ├── app_tools.js           # Main tool and options toolbars, tool registry, and SVG icons
│   ├── app_rulers.js          # Monochrome canvas rulers, 8-lane markers, grid, and HUD
│   ├── app_canvas.js          # Object layer rendering, placement, and drag interactions
│   └── app_panels.js          # Startup gate, draggable panels, and import/export flows
└── lib/
    ├── lib_bejson_canvas_core.js # Universal domain-agnostic reactive canvas backend engine
    └── core/                  # Bundled BEJSON & MFDB core JavaScript libraries
        ├── lib_bejson_Core_bejson_core.js
        ├── lib_bejson_Core_bejson_parse.js
        ├── lib_bejson_Core_bejson_schema.js
        ├── lib_bejson_Core_bejson_validator.js
        ├── lib_bejson_Core_mfdb_core.js
        ├── lib_bejson_Core_mfdb_validator.js
        └── ...
```

---

## 4. UI Surfaces & Workflows

1. **Top Menu Bar (Row 0):** High-contrast Windows-style menu bar (`File`, `Edit`, `View`, `Tools`, `Apps`) with live session file status.
2. **Dual Horizontally-Scrollable Toolbars:**
   - **Row 1 (Main Tools):** Primary interaction tools (`Selector`, `Shape`).
   - **Row 2 (Tool Options):** Contextual sub-options for the active tool (`Square`, etc.).
3. **Workspace Canvas & Coordinate Rulers:**
   - Real-time Top X and Left Y canvas rulers with tracking hairline indicators.
   - Live `X: 0  Y: 0` coordinate HUD.
   - Red tick indicators denoting 8-lane spatial boundaries.
4. **Draggable Overlay Panels:**
   - **View Objects:** Real-time list of all instantiated shapes with direct selection and deletion.
   - **View Schema:** Live inspector featuring tabbed views for `MFDB-132 Package`, `104a Manifest`, and `Live Position Map`.
5. **Startup File Gate:** Modal gate prompting for a new database session or single-file import.

---

## 5. Getting Started

### Local Browser Launch
Launch the framework directly in any browser:
```bash
# Direct local file opening or via lightweight local HTTP server
python3 -m http.server 8080 --directory /storage/emulated/0/Admin/Dev/Repos/Canvas_Core_Framework
```
Then navigate to `http://localhost:8080/index.html`.

### Headless Verification (Node.js)
The core backend engine operates headlessly without browser dependencies:
```bash
node -e "
const core = require('./lib/lib_bejson_canvas_core.js');
const store = core.createCanvasStore();
store.createNewFile('diagram_db', 1280, 720);
store.addObject('square', 200, 200, 96, 1280, 720);
const pkg = store.buildMfdb132Package();
console.log('Generated MFDB-132 entities:', pkg.Values.length);
"
```

---

## 6. Ecosystem Invariants & Licensing

- **Attribution:** Created by Elton Boehnen (`boehnenelton2024@gmail.com`).
- **License:** PolyForm Noncommercial License 1.0.0 (`PolyForm-Noncommercial-1.0.0`). Commercial use requires explicit permission.
