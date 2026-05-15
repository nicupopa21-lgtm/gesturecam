/* =========================
   GESTURECAM - SINGLE FILE
   ========================= */

const video = document.getElementById("video");
const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");

const state = {
  handLandmarker: null,
  mlReady: false,
  stream: null
};

/* =========================
   CAMERA
   ========================= */
async function initCamera() {
  try {
    const constraints = {
      video: {
        facingMode: { ideal: "user" }
      },
      audio: false
    };

    try {
      state.stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      // fallback for desktop / weird mobile cases
      state.stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    }

    video.srcObject = state.stream;

    await new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });

  } catch (e) {
    alert("Camera failed:\n" + e.message);
    throw e;
  }
}

/* =========================
   AI (MediaPipe)
   ========================= */
import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const MODEL_URLS = [
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float32/1/hand_landmarker.task",
  "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task"
];

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
      console.warn("Model failed:", url);
    }
  }
  throw new Error("All model URLs failed");
}

async function initAI() {
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
    alert("AI failed:\n" + e.message);
    console.error(e);
  }
}

/* =========================
   DRAWING
   ========================= */
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17]
];

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

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 3;

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

/* =========================
   LOOP
   ========================= */
function loop() {
  requestAnimationFrame(loop);

  if (!state.mlReady) return;
  if (video.readyState < 2) return;

  resizeCanvas();

  const result = state.handLandmarker.detectForVideo(
    video,
    performance.now()
  );

  if (result?.landmarks?.length) {
    draw(result.landmarks[0]);
  }
}

/* =========================
   BOOT
   ========================= */
async function boot() {
  try {
    await initCamera();
    await initAI();
    loop();
  } catch (e) {
    alert("GestureCam failed to start:\n" + e.message);
  }
}

boot();
