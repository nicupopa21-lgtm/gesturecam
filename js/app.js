import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

/* ---------------- UI HELPERS ---------------- */
function setStatus(msg) {
  const el = document.getElementById("ml-status");
  if (el) el.textContent = msg;
}

function setError(msg) {
  let box = document.getElementById("error-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "error-box";
    box.style.position = "absolute";
    box.style.bottom = "10px";
    box.style.left = "10px";
    box.style.right = "10px";
    box.style.padding = "10px";
    box.style.background = "rgba(255,0,0,0.85)";
    box.style.color = "white";
    box.style.fontSize = "12px";
    box.style.zIndex = "9999";
    box.style.borderRadius = "8px";
    document.body.appendChild(box);
  }
  box.textContent = msg;
}

/* ---------------- DOM ---------------- */
const video = document.getElementById("video");
const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");

/* ---------------- STATE ---------------- */
const state = {
  landmarker: null,
  mlReady: false,
  videoReady: false
};

/* ---------------- CAMERA ---------------- */
async function startCamera() {
  try {
    setStatus("Starting camera...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;

    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        video.play();
        state.videoReady = true;
        setStatus("Camera ready");
        resolve();
      };
    });
  } catch (e) {
    setError("Camera error: " + e.message);
    throw e;
  }
}

/* ---------------- MODEL LOADER (SAFE FALLBACK) ---------------- */
const MODEL_URLS = [
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float32/1/hand_landmarker.task",
  "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task"
];

async function loadModel(vision) {
  for (const url of MODEL_URLS) {
    try {
      setStatus("Loading model...");
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

/* ---------------- AI INIT ---------------- */
async function initAI() {
  try {
    setStatus("Loading AI runtime...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    state.landmarker = await loadModel(vision);
    state.mlReady = true;

    setStatus("AI Ready");

    const dot = document.getElementById("ml-dot");
    if (dot) dot.classList.add("active");

  } catch (e) {
    setError("AI init failed: " + e.message);
  }
}

/* ---------------- RESIZE ---------------- */
function resizeCanvas() {
  const rect = video.getBoundingClientRect();
  if (canvas.width !== rect.width || canvas.height !== rect.height) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
}

/* ---------------- DRAW ---------------- */
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17]
];

function draw(landmarks) {
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  ctx.strokeStyle = "cyan";
  ctx.lineWidth = 2;

  for (const [a, b] of CONNECTIONS) {
    const pa = landmarks[a];
    const pb = landmarks[b];

    ctx.beginPath();
    ctx.moveTo(pa.x * w, pa.y * h);
    ctx.lineTo(pb.x * w, pb.y * h);
    ctx.stroke();
  }

  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 4, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
  }
}

/* ---------------- LOOP ---------------- */
function loop() {
  requestAnimationFrame(loop);

  if (!state.mlReady || !state.videoReady) return;
  if (video.readyState < 2) return;

  resizeCanvas();

  try {
    const result = state.landmarker.detectForVideo(video, performance.now());

    if (result.landmarks?.length) {
      draw(result.landmarks[0]);
    }
  } catch (e) {
    setError("Detection error: " + e.message);
  }
}

/* ---------------- BOOT ---------------- */
async function start() {
  try {
    await startCamera();
    await initAI();
    loop();
  } catch (e) {
    setError("Startup failed: " + e.message);
  }
}

start();
