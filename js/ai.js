import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

export const state = {
  handLandmarker: null,
  mlReady: false
};

const video = document.getElementById("video");
const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");

/* ---------------- INIT AI ---------------- */
export async function initAI() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  state.handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float32/1/hand_landmarker.task",
      delegate: "CPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });

  state.mlReady = true;

  document.getElementById("ml-status").textContent = "AI Ready";
  document.getElementById("ml-dot").classList.add("active");
}

/* ---------------- DETECT FRAME ---------------- */
export function detectFrame() {
  if (!state.mlReady) return;

  if (video.readyState < 2) return;

  resizeCanvas();

  const results = state.handLandmarker.detectForVideo(
    video,
    performance.now()
  );

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.landmarks && results.landmarks.length > 0) {
    drawSkeleton(results.landmarks[0]);
  }
}

/* ---------------- RESIZE ---------------- */
function resizeCanvas() {
  const rect = video.getBoundingClientRect();

  if (
    canvas.width !== rect.width ||
    canvas.height !== rect.height
  ) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
}

/* ---------------- HAND CONNECTIONS ---------------- */
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17]
];

/* ---------------- DRAW ---------------- */
function drawSkeleton(landmarks) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();

    ctx.moveTo(
      landmarks[a].x * w,
      landmarks[a].y * h
    );

    ctx.lineTo(
      landmarks[b].x * w,
      landmarks[b].y * h
    );

    ctx.stroke();
  }

  for (const p of landmarks) {
    ctx.beginPath();

    ctx.arc(
      p.x * w,
      p.y * h,
      5,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "white";
    ctx.fill();
  }
}
