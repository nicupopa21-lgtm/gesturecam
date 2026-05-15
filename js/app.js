// =========================
// GestureCam - SAFE APP BOOT
// =========================

// ---------- POPUP DEBUG SYSTEM ----------
function showPopup(message, isError = true) {
  const id = "gc-popup";
  const old = document.getElementById(id);
  if (old) old.remove();

  const div = document.createElement("div");
  div.id = id;

  Object.assign(div.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: isError ? "rgba(255,50,50,0.95)" : "rgba(0,0,0,0.8)",
    color: "white",
    padding: "10px 14px",
    borderRadius: "10px",
    fontFamily: "sans-serif",
    fontSize: "13px",
    zIndex: 999999,
    maxWidth: "90vw",
    textAlign: "center"
  });

  div.textContent = message;
  document.body.appendChild(div);

  setTimeout(() => div.remove(), 4000);
}

// ---------- GLOBAL ERROR CATCH ----------
window.addEventListener("error", (e) => {
  showPopup(e.message || "Unknown error");
});

window.addEventListener("unhandledrejection", (e) => {
  showPopup(e.reason?.message || e.reason || "Promise error");
});

// ---------- IMPORTS ----------
import { initCamera } from "./camera.js";
import { initAI } from "./ai.js";
import { startLoop } from "./gestures.js";

// ---------- SAFE INIT ----------
async function init() {
  const loader = document.getElementById("loading-screen");

  try {
    showPopup("GestureCam starting...", false);

    // safety timeout (prevents infinite loading)
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Init timeout (camera or AI stuck)")), 12000)
    );

    // STEP 1: CAMERA (mobile-safe failure handling)
    await Promise.race([initCamera(), timeout]);
    showPopup("Camera ready", false);

    // STEP 2: AI (MediaPipe)
    await Promise.race([initAI(), timeout]);
    showPopup("AI ready", false);

    // STEP 3: START LOOP
    startLoop();

    // HIDE LOADER
    if (loader) loader.classList.add("hidden");

    showPopup("GestureCam ready", false);

  } catch (e) {
    showPopup("FAILED: " + e.message);

    // ALWAYS unblock UI
    if (loader) {
      loader.innerHTML = `
        <div style="color:white;font-family:sans-serif;text-align:center;padding:20px">
          ❌ GestureCam failed to load<br><br>
          ${e.message}
        </div>
      `;
    }
  }
}

// ---------- START ----------
init();
