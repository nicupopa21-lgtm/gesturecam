import { handLandmarker } from "./ai.js";
import { video } from "./camera.js";
import { drawSkeleton } from "./utils.js";

const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");

export function startLoop(state) {
  function loop() {
    requestAnimationFrame(loop);

    if (!state.mlReady || !state.videoReady) return;
    if (video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const result = handLandmarker.detectForVideo(video, performance.now());

    if (result.landmarks?.length) {
      drawSkeleton(ctx, canvas, result.landmarks[0]);
    }
  }

  loop();
}