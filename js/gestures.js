import { state } from "./ai.js";
import { drawSkeleton } from "./utils.js";

const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");

export function startLoop() {
  function loop() {
    requestAnimationFrame(loop);

    if (!state.mlReady) return;

    const video = document.getElementById("video");
    if (!video || video.readyState < 2) return;

    const landmarker = state.handLandmarker;
    if (!landmarker) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const result = landmarker.detectForVideo(video, performance.now());

    if (result.landmarks?.length) {
      drawSkeleton(ctx, canvas, result.landmarks[0]);
    }
  }

  loop();
}
