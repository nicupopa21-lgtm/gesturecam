console.log("APP LOADED");

/* =========================================================
   HUD SYSTEM
   - lightweight debug + training + save overlays
========================================================= */

/* ---------------- STATUS BAR (DEBUG TOP) ---------------- */
function status(msg) {
  let el = document.getElementById("debug-status");

  if (!el) {
    el = document.createElement("div");
    el.id = "debug-status";

    Object.assign(el.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      padding: "6px",
      fontSize: "12px",
      fontFamily: "monospace",
      color: "white",
      background: "rgba(0,0,0,0.85)",
      zIndex: "999999"
    });

    document.body.appendChild(el);
  }

  el.textContent = msg;
}

/* ---------------- GESTURE HUD (TOP RIGHT) ---------------- */
function gestureHUD(text) {
  let el = document.getElementById("gesture-hud");

  if (!el) {
    el = document.createElement("div");
    el.id = "gesture-hud";

    Object.assign(el.style, {
      position: "fixed",
      top: "10px",
      right: "10px",
      padding: "10px 14px",
      borderRadius: "8px",
      fontSize: "16px",
      fontWeight: "bold",
      fontFamily: "monospace",
      color: "yellow",
      background: "rgba(0,0,0,0.6)",
      zIndex: "999999",
      whiteSpace: "nowrap"
    });

    document.body.appendChild(el);
  }

  let [g = "", c = "", f = ""] = (text || "").split("\n");

  c = c.replace(/(\d+)%(\d+)/, "$1%");
  f = f.replace(/(\d+)%(\d+)/, "$2");

  el.innerHTML = `
    <div>gesture: ${g}</div>
    <div>confidence: ${c}</div>
    <div>fingers: ${f}</div>
  `;
}

/* ---------------- TRAINING HUD (BOTTOM CENTER) ---------------- */
function trainingHUD(msg) {
  let el = document.getElementById("training-hud");

  if (!el) {
    el = document.createElement("div");
    el.id = "training-hud";

    Object.assign(el.style, {
      position: "fixed",
      bottom: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      fontSize: "42px",
      padding: "18px 26px",
      fontFamily: "monospace",
      fontWeight: "800",
      color: "white",
      textAlign: "center",
      background: "rgba(255,255,255,0.18)",
      border: "1px solid rgba(255,255,255,0.35)",
      borderRadius: "18px",
      backdropFilter: "blur(14px)",
      webkitBackdropFilter: "blur(14px)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35), 0 0 20px rgba(255,255,255,0.25)",
      zIndex: "999999",
      maxWidth: "90vw",
      whiteSpace: "nowrap"
    });

    document.body.appendChild(el);
  }

  el.textContent = msg;
}

/* ---------------- SAVE HUD (TOP CENTER - TEMP) ---------------- */
function saveHUD(msg) {
  let el = document.getElementById("save-hud");

  if (!el) {
    el = document.createElement("div");
    el.id = "save-hud";
    document.body.appendChild(el);
  }

  Object.assign(el.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "36px",
    padding: "16px 24px",
    fontFamily: "monospace",
    fontWeight: "900",
    color: "white",
    textAlign: "center",
    background: "rgba(0,255,120,0.25)",
    border: "1px solid rgba(0,255,120,0.6)",
    borderRadius: "18px",
    backdropFilter: "blur(14px)",
    webkitBackdropFilter: "blur(14px)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35), 0 0 25px rgba(0,255,120,0.35)",
    zIndex: "999999"
  });

  el.textContent = msg;

  clearTimeout(el._t);
  el._t = setTimeout(() => el.remove(), 1200);
}

/* =========================================================
   ERROR HANDLER
========================================================= */
window.onerror = (msg, src, line, col, err) => {
  document.body.innerHTML = `
    <div style="
      position:fixed;
      inset:0;
      background:black;
      color:red;
      padding:20px;
      font-family:monospace;
      z-index:999999;
    ">
      <h3>JS ERROR</h3>
      <div>${msg}</div>
      <div>${src}:${line}:${col}</div>
      <pre>${err?.stack || ""}</pre>
    </div>
  `;
};

/* =========================================================
   GESTURE DATABASE
========================================================= */

const DEFAULT_DB = {
  version: 1,
  meta: { created: Date.now(), updated: Date.now(), totalSamples: 0 },
  basic: { PINCH: [], FIST: [], OPEN: [] },
  motion: { UP: [], DOWN: [], LEFT: [], RIGHT: [] }
};

let gestureDB;

function initGestureDB() {
  const saved = localStorage.getItem("gestureDB");

  if (!saved) {
    gestureDB = structuredClone(DEFAULT_DB);
    return saveGestureDB();
  }

  try {
    gestureDB = JSON.parse(saved);
    console.log("Gesture DB loaded");
  } catch {
    gestureDB = structuredClone(DEFAULT_DB);
    saveGestureDB();
  }
}

function saveGestureDB() {
  gestureDB.meta.updated = Date.now();
  localStorage.setItem("gestureDB", JSON.stringify(gestureDB));
  console.log("Gesture DB saved");
}

initGestureDB();

/* =========================================================
   ELEMENTS
========================================================= */

const video = document.getElementById("video");
const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");
const loading = document.getElementById("loading-screen");

/* =========================================================
   ML (MediaPipe)
========================================================= */

import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

let handLandmarker = null;
let mlReady = false;

/* =========================================================
   CAMERA + ML INIT
========================================================= */

async function startCamera() {
  try {
    status("Requesting camera...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    loading?.classList?.add("hidden");

    status("Camera started");

    initML();
    loop();

  } catch (err) {
    status("Camera failed");
    document.body.innerHTML = `
      <div style="position:fixed;inset:0;background:black;color:orange;padding:20px;font-family:monospace;">
        <h3>Camera Failed</h3>
        <pre>${err.name}: ${err.message}</pre>
      </div>
    `;
  }
}

async function initML() {
  try {
    status("Loading AI...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });

    mlReady = true;
    status("AI READY");

  } catch (e) {
    status("AI FAILED: " + e.message);
  }
}

/* =========================================================
   HAND PROCESSING
========================================================= */

let gestureHistory = [];
const HISTORY_SIZE = 10;

const dist = (a, b) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const mode = (arr) => {
  const map = {};
  let best = arr[0], max = 0;

  for (const v of arr) {
    map[v] = (map[v] || 0) + 1;
    if (map[v] > max) {
      max = map[v];
      best = v;
    }
  }
  return best;
};

/* =========================================================
   MAIN LOOP
========================================================= */

function loop() {
  requestAnimationFrame(loop);
  drawHands();
}

function resizeCanvas() {
  if (!video.videoWidth) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}

/* =========================================================
   DRAW + INFERENCE
========================================================= */

function drawHands() {
  if (!mlReady || !handLandmarker) return;
  if (video.readyState < 2) return;

  resizeCanvas();

  const result = handLandmarker.detectForVideo(video, performance.now());

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!result.landmarks?.length) {
    gestureHUD("NO HAND");
    status("RUNNING (0 hands)");
    gestureHistory.length = 0;
    return;
  }

  const hand = result.landmarks[0];

  const [thumb, index, middle, ring, pinky] =
    [4, 8, 12, 16, 20].map(i => hand[i]);

  const wrist = hand[0];
  const handScale = dist(wrist, hand[9]);

  const features = {
    pinch: dist(thumb, index) / handScale,
    indexCurl: dist(index, hand[5]) / handScale,
    middleCurl: dist(middle, hand[9]) / handScale,
    ringCurl: dist(ring, hand[13]) / handScale,
    pinkyCurl: dist(pinky, hand[17]) / handScale
  };

  features.open =
    (features.indexCurl +
     features.middleCurl +
     features.ringCurl +
     features.pinkyCurl) / 4;

  /* ---------------- CLASSIFICATION ---------------- */

  let best = "UNKNOWN";
  let bestScore = Infinity;

  for (const label in gestureDB.basic) {
    for (const sample of gestureDB.basic[label]) {
      const f = sample.features;

      const score =
        Math.abs(features.pinch - f.pinch) +
        Math.abs(features.open - f.open) +
        Math.abs(features.indexCurl - f.indexCurl) +
        Math.abs(features.middleCurl - f.middleCurl) +
        Math.abs(features.ringCurl - f.ringCurl) +
        Math.abs(features.pinkyCurl - f.pinkyCurl);

      if (score < bestScore) {
        bestScore = score;
        best = label;
      }
    }
  }

  const confidence = Math.max(0, Math.min(100, Math.round((1 - bestScore) * 100)));

  gestureHistory.push(best);
  if (gestureHistory.length > HISTORY_SIZE) gestureHistory.shift();

  const stable = mode(gestureHistory);

  let fingers = 0;
  if (features.indexCurl > 0.18) fingers++;
  if (features.middleCurl > 0.18) fingers++;
  if (features.ringCurl > 0.18) fingers++;
  if (features.pinkyCurl > 0.18) fingers++;
  if (thumb.x < hand[3].x) fingers++;

  gestureHUD(`gesture: ${stable}\nconfidence: ${confidence}%\nfingers: ${fingers}`);

  status(`RUNNING (1 hand) ${stable} ${confidence}%`);

  for (const p of hand) {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 6, 0, Math.PI * 2);
    ctx.fillStyle = "cyan";
    ctx.fill();
  }
}

/* =========================================================
   START
========================================================= */

window.addEventListener("load", startCamera);


/* =========================================================
   TRAIN BUTTON LOGIC
========================================================= */

let trainingActive = false;
let trainingLocked = false;
let trainingBuffer = [];
let TRAIN_FRAMES = 20;

window.addEventListener("load", () => {
  const btn = document.getElementById("train-btn");

  if (!btn) {
    console.error("TRAIN BUTTON NOT FOUND");
    return;
  }

  btn.onclick = () => {
    if (trainingActive || trainingLocked) return;

    trainingActive = true;
    trainingLocked = false;
    trainingBuffer = [];

    trainingHUD("RECORDING...");
    console.log("TRAIN STARTED");
  };
});
