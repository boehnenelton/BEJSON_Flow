import asyncio
import http.server
import socketserver
import threading
import os
import subprocess
from termux_playwright import async_playwright_termux, launch

REPO_DIR = "/storage/emulated/0/Admin/Dev/Repos/BEJSON_Flow"
RAW_DIR = "/data/data/com.termux/files/home/.gemini/antigravity-cli/brain/72b337ca-6776-4d96-ada4-0d56b96e4ccc/scratch/raw_screenshots"
IMAGES_DIR = os.path.join(REPO_DIR, "images")

os.makedirs(RAW_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=REPO_DIR, **kwargs)
    def log_message(self, format, *args):
        pass

async def test_and_capture():
    httpd = socketserver.TCPServer(("127.0.0.1", 0), QuietHandler)
    port = httpd.server_address[1]
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    try:
        async with async_playwright_termux() as p:
            browser = await launch(p, headless=True)
            page = await browser.new_page(viewport={"width": 1280, "height": 800})

            # Check console errors
            errors = []
            page.on("pageerror", lambda err: errors.append(str(err)))

            await page.goto(f"http://127.0.0.1:{port}/index.html", timeout=30000, wait_until="domcontentloaded")
            await asyncio.sleep(0.3)

            # 1. Close startup modal with new flow
            await page.fill("#be-startup-dbname", "redirection_and_contrast_flow")
            await page.click("#be-startup-create")
            await page.wait_for_selector(".be-shape--start", timeout=10000)
            await asyncio.sleep(0.2)

            conns = await page.evaluate("window.BEHTML_FLOW_APP.store.getConnectors()")
            assert len(conns) >= 1, "Must have initial connector"
            
            # Click midpoint anchor dot to open insert panel
            await page.click('.be-anchor-hit[data-connector-id="1"]')
            await asyncio.sleep(0.15)
            
            # Select Redirection Gate and insert
            await page.click('.be-component-card[data-comp-type="redirect"]')
            await page.fill("#be-node-label-input", "Route Gate")
            await page.click("#be-panel-insert-submit")
            await asyncio.sleep(0.2)

            # Verify side anchor stub exists for the Redirection Gate (node 3)
            side_anchors = await page.evaluate("window.BEHTML_FLOW_APP.store.getRedirectSideAnchors()")
            assert len(side_anchors) == 1, "Must have 1 redirection side anchor stub"
            assert side_anchors[0]["redirectNodeId"] == 3, "Side anchor must belong to gate 3"

            # Verify SVG elements rendered for side stub
            stub_line = await page.locator(".be-connector-line--redirect-stub").count()
            assert stub_line >= 1, "Must render dashed redirect stub line"

            # Click side anchor dot to insert node on the alternate branch
            await page.click('.be-anchor-hit--redirect-branch[data-redirect-node-id="3"]')
            await asyncio.sleep(0.15)

            # Verify modal title reflects redirection branch
            modal_title = await page.text_content("#be-insert-title")
            assert "Gate [3]" in modal_title or "Branch" in modal_title, f"Modal title should indicate branch: {modal_title}"

            # Insert Alternate Action on branch
            await page.click('.be-component-card[data-comp-type="shape"]')
            await page.fill("#be-node-label-input", "Alternate Action")
            await page.click("#be-panel-insert-submit")
            await asyncio.sleep(0.2)

            # Verify side stub is now satisfied and alternate connector is wired
            side_anchors_after = await page.evaluate("window.BEHTML_FLOW_APP.store.getRedirectSideAnchors()")
            assert len(side_anchors_after) == 0, "Side stub must be gone after branch is connected"
            all_conns = await page.evaluate("window.BEHTML_FLOW_APP.store.getConnectors()")
            alt_conn = [c for c in all_conns if c.get("branchCondition") == "alternate"]
            assert len(alt_conn) == 1, "Must have alternate branch connector"

            # Move nodes for pristine visual layout
            await page.evaluate("""() => {
                const store = window.BEHTML_FLOW_APP.store;
                store.moveNode(1, 180, 360);
                store.moveNode(3, 440, 360);
                store.moveNode(2, 820, 360);
                store.moveNode(4, 580, 520);
                window.BEHTML_FLOW_APP.canvas.renderShapes();
            }""")
            await asyncio.sleep(0.2)

            # Capture canvas screenshot with redirection branch
            await page.screenshot(path=os.path.join(RAW_DIR, "03_flow_canvas_loopback.png"))

            # Test Node Properties Overlay: Long-press Node 3 (Route Gate)
            node3_box = await page.locator('.be-shape[data-node-id="3"]').bounding_box()
            await page.mouse.move(node3_box["x"] + node3_box["width"] / 2, node3_box["y"] + node3_box["height"] / 2)
            await page.mouse.down()
            await asyncio.sleep(0.55)
            await page.mouse.up()
            await asyncio.sleep(0.2)

            # Check Full-screen overlay styles
            props_styles = await page.evaluate("""() => {
                const el = document.getElementById('be-panel-node-props');
                const cs = window.getComputedStyle(el);
                return {
                    position: cs.position,
                    zIndex: cs.zIndex,
                    backgroundColor: cs.backgroundColor,
                    width: cs.width,
                    height: cs.height,
                    isVisible: !el.classList.contains('be-hidden')
                };
            }""")
            assert props_styles["isVisible"], "Properties panel must be visible"
            assert props_styles["position"] == "fixed", "Properties panel must be fixed"
            assert props_styles["zIndex"] == "10000", f"Z-index must be 10000: {props_styles['zIndex']}"
            assert "rgb(0, 0, 0)" in props_styles["backgroundColor"], f"Background must be jet black: {props_styles['backgroundColor']}"

            # Verify Premade Field Null Option
            selected_preset_val = await page.evaluate("document.getElementById('be-preset-select').value")
            assert selected_preset_val == "", f"Initial dropdown value must be null/empty: '{selected_preset_val}'"

            # Click Add Preset without selection -> verify warning feedback
            await page.click("#be-preset-add-btn")
            feedback_text = await page.text_content("#be-preset-feedback")
            assert "Please select" in feedback_text, f"Warning feedback must show: {feedback_text}"

            # Select a premade field
            await page.select_option("#be-preset-select", "feature_flag")
            # Click Add Preset -> verify confirmation
            await page.click("#be-preset-add-btn")
            btn_text = await page.text_content("#be-preset-add-btn")
            assert "Added" in btn_text, f"Button text should confirm 'Added': {btn_text}"
            success_feedback = await page.text_content("#be-preset-feedback")
            assert "feature_flag" in success_feedback, f"Feedback should confirm feature_flag: {success_feedback}"

            # Focus an input to show high-contrast red bg with white text
            await page.focus("#be-props-label-input")
            await asyncio.sleep(0.2)

            # Capture Fullscreen Node Properties Screenshot
            await page.screenshot(path=os.path.join(RAW_DIR, "04_fullscreen_node_properties.png"))

            # Press ESC to close overlay
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.2)
            is_closed = await page.evaluate("document.getElementById('be-panel-node-props').classList.contains('be-hidden')")
            assert is_closed, "Overlay must close on ESC"

            # Convert screenshots to 420p standard
            for img_name in ["03_flow_canvas_loopback.png", "04_fullscreen_node_properties.png"]:
                raw_path = os.path.join(RAW_DIR, img_name)
                final_path = os.path.join(IMAGES_DIR, img_name)
                subprocess.run(["ffmpeg", "-y", "-i", raw_path, "-vf", "scale=420:-1", final_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print(f"[OK] Scaled {img_name} to 420p standard.")

            assert len(errors) == 0, f"Page errors encountered: {errors}"
            print("[SUCCESS] All Redirection Gate and Full-Screen Contrast verification checks passed!")

            await browser.close()
    finally:
        httpd.shutdown()

if __name__ == "__main__":
    asyncio.run(test_and_capture())
