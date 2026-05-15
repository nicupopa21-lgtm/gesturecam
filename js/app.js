// =========================
// GestureCam - app.js (SAFE BOOT)
// =========================

// ---------- POPUP ERROR SYSTEM ----------
function showErrorPopup(message) {
  if (document.getElementById("error-popup")) return;

  const div = document.createElement("div");
  div.id = "error-popup";

  Object.assign(div.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(255,50,50,0.95)",
    color: "white",
    padding: "12px 16px",
    borderRadius: "10px",
    fontFamily: "sans-serif",
    zIndex: 999999,
    maxWidth: "90vw",
    textAlign: "center",
    fontSize: "14px"
  });

  div.textContent = "❌ " + message;

  document.body.appendChild(div);
}

// ---------- GLOBAL ERROR CATCHING ----------
window.addEventListener("error", (e) => {
  showErrorPopup(e.message || "Unknown error");
});

window.addEventListener("unhandledrejection", (e) => {
  showErrorPopup(
    e.reason?.message || e.reason || "Unhandled promise rejection"
  );
});

// ---------- IMPORTS ----------
import { initCamera } from "./camera.js";
import { initAI } from "./ai.js";
import { startLoop } from "./gestures.js";

// ---------- MAIN INIT ----------
async function init() {
  const loader = document.getElementById("loading-screen");

  try {
    if (!loader) {
      throw new Error("Missing #loading-screen in HTML");
    }

    // safety heartbeat (detect freeze)
    setTimeout(() => {
      showErrorPopup("App stuck in initialization (timeout warning)");
    }, 8000);

    // STEP 1: CAMERA
    await initCamera();

    // STEP 2: AI (MediaPipe)
    await initAI();

    // STEP 3: START LOOP
    startLoop();

    // SUCCESS → hide loader
    loader.classList.add("hidden");

  } catch (e) {
    showErrorPopup(e.message || "Initialization failed");

    // IMPORTANT: never leave user stuck on loading screen
    if (loader) {
      loader.innerHTML = `
        <div style="color:white;font-family:sans-serif;text-align:center;padding:20px">
          ❌ GestureCam failed to load<br><br>
          ${e.message || "Unknown error"}
        </div>
      `;
    }
  }
}

// ---------- BOOT ----------
init();
