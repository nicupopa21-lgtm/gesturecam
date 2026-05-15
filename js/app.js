import { initCamera, video } from "./camera.js";
import { initAI, handLandmarker } from "./ai.js";
import { startLoop } from "./gestures.js";
import { loadAll } from "./storage.js";

export const state = {
  mlReady: false,
  videoReady: false,
  classifier: null,
  photos: []
};

async function init() {
  loadAll(state);

  await initCamera(state);
  await initAI(state);

  state.mlReady = true;

  document.getElementById("ml-status").textContent = "AI Ready";
  document.getElementById("ml-dot").classList.add("active");
  document.getElementById("loading-screen").style.display = "none";

  startLoop(state);
}

init();