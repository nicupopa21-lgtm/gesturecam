import { handLandmarker } from "./ai.js";
import { video } from "./camera.js";
import { drawSkeleton } from "./utils.js";

const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");

/**
 * Main detection loop starter
 * @param {object} state - shared app state from app.js
 */
export function startLoop(state) {
  function loop() {
    requestAnimationFrame(loop);

    // safety checks (prevents crash + "stuck loading" issues)
    if (!state.mlReady) return;
    if (!state.videoReady) return;
    if (!video || video.readyState < 2) return;

    // match canvas to video size
    const rect = video.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    try {
      const result = handLandmarker.detectForVideo(video, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];
        drawSkeleton(ctx, canvas, landmarks);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (err) {
      // prevents loop from silently dying
      console.error("Hand detection error:", err);
    }
  }

  loop();
}
