# BEJSON Flow V1.1.0 PKG112: Instructions

**Author:** Elton Boehnen · boehnenelton2024@gmail.com · boehnenelton2024.pages.dev · github.com/boehnenelton
**Contents:** canvas core 1.1.0 with the `canvas_mode` gate (0 legacy, 1 scaled world, 2 paged 2x2), Flow integration, tests.

## 1. Apply to your repo
1. Unzip this package over your local `BEJSON_Flow` working copy (`bejson_project.json` sits at the zip root).
2. `lib/lib_bejson_canvas_core.js` was removed on purpose (stale duplicate, see `dev/dead_code.md`). Delete it locally if it remains.
3. Case warning: your git index tracks `lib/core/` (lowercase) but the app uses `lib/Core/`. Git will show `lib/core/*` as deleted and
   `lib/Core/` as new. Contents are byte-identical to the baseline. Either commit the rename deliberately
   (`git mv lib/core lib/Core` on a case-sensitive filesystem) or leave `lib/core` out of your commit.
4. Branch, commit, push:
   ```
   git checkout -b canvas-mode-gate
   git add AGENTS.md CHANGELOG.md INSTRUCTIONS.md bejson_project.json dev lib/Canvas lib/Canvas_Flow
   git add -u lib/lib_bejson_canvas_core.js
   git commit -m "feat(canvas): add canvas_mode gate to canvas core 1.1.0 (PKG112)"
   git push -u origin canvas-mode-gate
   ```

## 2. Verify (Node >= 18)
```
node lib/Canvas/tests/test_canvas_core.js
node lib/Canvas/tests/test_canvas_cli.js
node lib/Canvas/tests/test_canvas_modes.js
node lib/Canvas/tests/test_canvas_mode0_golden.js
node lib/Canvas_Flow/tests/test_canvas_flow.js
node lib/Canvas_Flow/tests/test_canvas_flow_modes.js
node lib/Canvas_Flow/flow_cli.js --help
```
All must pass. The golden test proves mode 0 output is unchanged from v1.0.1. Regenerate the golden file (`--write`) only against a trusted baseline core.

## 3. Use canvas_mode
```js
createCanvasStore({ canvasMode: 0 });                        // default: legacy, identical to 1.0.1
createCanvasStore({ canvasMode: 1, worldWidth: 2560, worldHeight: 1440 });
createCanvasStore({ canvasMode: 2, pageCols: 2, pageRows: 2, pageWidth: 1280, pageHeight: 720 });
createFlowStore({ canvasMode: 2 });
```
CLI: `node lib/Canvas_Flow/flow_cli.js init my_flow.bejson --canvas-mode 2`

- Invalid mode values fall back to 0.
- Modes 1 and 2: world is fixed; stage/viewport arguments are hints only. Lanes and rows come from the world (mode 1) or page (mode 2).
- Mode 2: page is derived from a node's centre (cx, cy); coordinates stay continuous across pages.
- `strictImport` (default on in modes 1 and 2) verifies every chunk SHA-256 on import.

## 4. Not built yet (plan phases 3 and 4)
The browser app still starts in mode 0. Still to build: zoom/pan camera in `js/app_canvas.js`, ghost-label overlay and zoom tiers,
page navigator and overview. Do not switch the app to mode 1 or 2 until the camera exists: the 2560 px world would run off the 1280 px stage.

## 5. Where things are documented
`CHANGELOG.md` (what changed) · `dev/canvas_core_bugs.md` (defects D1-D11) · `dev/dead_code.md` · `AGENTS.md` section 7 (scoped exemption).
