import { initCamera } from "./camera.js";
import { initAI } from "./ai.js";
import { startLoop } from "./gestures.js";

function showError(e) {
  console.error(e);
  alert("Init error: " + e.message);
}

async function init() {
  try {
    console.log("GestureCam starting...");

    await initCamera();
    await initAI();

    console.log("Camera + AI ready");

    startLoop();

    const loader = document.getElementById("loading-screen");
    if (loader) loader.classList.add("hidden");

  } catch (e) {
    showError(e);
  }
}

init();
