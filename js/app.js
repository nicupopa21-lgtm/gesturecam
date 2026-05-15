import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

/* ---------------- DOM ---------------- */
const video = document.getElementById("video");
const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");

/* ---------------- DEBUG UI ---------------- */
const debug = createDebugUI();

/* ---------------- STATE ---------------- */
const state = {
  landmarker: null,
  mlReady: false,
  videoReady: false,
  running: false
};

/* ---------------- DEBUG PANEL ---------------- */
function createDebugUI() {
  const box = document.createElement("div");
  box.style.position = "absolute";
  box.style.top = "10px";
  box.style.left = "10px";
  box.style.right = "10px";
  box.style.zIndex = "9999";
  box.style.fontSize = "12px";
  box.style.fontFamily = "monospace";
  box.style.background = "rgba(0,0,0,0.7)";
  box.style.color = "#0ff";
  box.style.padding = "10px";
  box.style.borderRadius = "8px";
  box.style.whiteSpace = "pre-line";
  document.body.appendChild(box);

  return {
    set: (t) => box.textContent = t
  };
}

function status(step, extra = "") {
  debug.set(
`GestureCam DEBUG

Step: ${step}
Camera: ${state.videoReady ? "READY" : "WAITING"}
AI: ${state.mlReady ? "READY" : "LOADING"}
Loop: ${state.running ? "RUNNING" : "STOPPED"}

${extra}`
  );
}

function error(msg) {
  debug.set(
`❌ ERROR

${msg}`
  );
}

/* ---------------- CAMERA ---------------- */
async function startCamera() {
  try {
    status("requesting camera");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;

    await new Promise(res => {
      video.onloadedmetadata = async () => {
        await video.play();
        state.videoReady = true;
        status("camera ready");
        res();
      };
    });

  } catch (e) {
    error("Camera failed: " + e.message);
    throw e;
  }
}

/* ---------------- MODEL LOADER ---------------- */
const MODEL_URLS = [
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float32/1/hand_landmarker.task",
  "https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task"
];

async function loadModel(vision) {
  for (const url of MODEL_URLS) {
    try {
      status("loading model", url);

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
    status("loading wasm");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    status("loading model");

    state.landmarker = await loadModel(vision);

    state.mlReady = true;

    status("AI READY");

  } catch (e) {
    error("AI failed: " + e.message);
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

  ctx.strokeStyle = "#00ffff";
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
    ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
  }
}

/* ---------------- LOOP + FPS ---------------- */
let last = performance.now();
let fps = 0;

function loop() {
  requestAnimationFrame(loop);

  if (!state.mlReady || !state.videoReady) return;
  if (video.readyState < 2) return;

  resizeCanvas();

  try {
    const now = performance.now();

    const result = state.landmarker.detectForVideo(video, now);

    if (result?.landmarks?.length) {
      draw(result.landmarks[0]);
    }

    // FPS
    fps = Math.round(1000 / (now - last));
    last = now;

    status("running", `FPS: ${fps}`);

    state.running = true;

  } catch (e) {
    error("Loop crash: " + e.message);
    state.running = false;
  }
}

/* ---------------- BOOT SEQUENCE ---------------- */
async function start() {
  try {
    status("booting");

    await startCamera();
    await initAI();

    status("starting loop");

    loop();

  } catch (e) {
    error("Startup failed: " + e.message);
  }
}

start();
