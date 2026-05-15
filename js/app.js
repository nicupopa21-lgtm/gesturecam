import { initAI, aiState } from "./ai.js";
import { initCamera, cameraState } from "./camera.js";
import { startLoop } from "./gestures.js";

const state = {
  mlReady: false,
  videoReady: false
};

function updateStatus() {
  if (aiState.mlReady) {
    document.getElementById("ml-status").textContent = "AI Ready";
    document.getElementById("ml-dot").classList.add("active");
  }
}

async function init() {
  try {
    document.getElementById("ml-status").textContent = "Loading AI...";

    await initCamera();
    state.videoReady = cameraState.ready;

    await initAI();
    state.mlReady = aiState.mlReady;

    updateStatus();

    startLoop(state);

  } catch (err) {
    console.error(err);
    document.getElementById("ml-status").textContent = "Failed to load";
    alert("GestureCam failed to start: " + err.message);
  }
}

init();
