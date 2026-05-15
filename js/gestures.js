import { state } from "./ai.js";
import { video } from "./camera.js";

const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17]
];

export function startLoop(state) {
  function loop() {
    requestAnimationFrame(loop);

    if (!state.mlReady || !state.videoReady) return;
    if (!state.handLandmarker) return;
    if (video.readyState < 2) return;

    resizeCanvas();

    const result = state.handLandmarker.detectForVideo(
      video,
      performance.now()
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result?.landmarks?.length) {
      draw(result.landmarks[0]);
    }
  }

  loop();
}

function resizeCanvas() {
  const rect = video.getBoundingClientRect();
  if (canvas.width !== rect.width || canvas.height !== rect.height) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
}

function draw(landmarks) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 3;
  ctx.fillStyle = "white";

  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  }

  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
