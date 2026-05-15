import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

export const state = {
  handLandmarker: null,
  mlReady: false
};

/* ---------------- MODEL FALLBACK LIST ---------------- */
const MODEL_URLS = [
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float32/1/hand_landmarker.task",
  "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task"
];

/* ---------------- MODEL LOADER ---------------- */
async function loadModel(vision) {
  for (const url of MODEL_URLS) {
    try {
      return await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: url,
          delegate: "CPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
    } catch (e) {
      // silent fallback + UI warning
      alert("Model failed, trying backup...\n" + url);
    }
  }

  throw new Error("All model URLs failed to load");
}

/* ---------------- INIT AI ---------------- */
export async function initAI() {
  try {
    document.getElementById("ml-status").textContent = "Loading AI...";

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    state.handLandmarker = await loadModel(vision);

    state.mlReady = true;

    document.getElementById("ml-status").textContent = "AI Ready";
    document.getElementById("ml-dot").classList.add("active");

  } catch (e) {
    alert("❌ GestureCam failed to start:\n" + e.message);
    document.getElementById("ml-status").textContent = "AI Failed";
    console.error(e);
  }
}

/* ---------------- OPTIONAL FRAME DETECTION ---------------- */
export function detectFrame(video, canvas, ctx) {
  if (!state.mlReady || !state.handLandmarker) return;
  if (!video || video.readyState < 2) return;

  const results = state.handLandmarker.detectForVideo(
    video,
    performance.now()
  );

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.landmarks?.length) {
    drawSkeleton(ctx, canvas, results.landmarks[0]);
  }
}

/* ---------------- DRAW HELPERS ---------------- */
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17]
];

export function drawSkeleton(ctx, canvas, landmarks) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";

  for (const [a, b] of CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  }

  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
  }
}
