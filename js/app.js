console.log("APP LOADED");

/* ---------------- STATUS HUD (MOBILE DEBUG) ---------------- */
function status(msg) {
  let el = document.getElementById("debug-status");

  if (!el) {
    el = document.createElement("div");
    el.id = "debug-status";
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.right = "0";
    el.style.background = "rgba(0,0,0,0.85)";
    el.style.color = "white";
    el.style.fontSize = "12px";
    el.style.padding = "6px";
    el.style.zIndex = "999999";
    el.style.fontFamily = "monospace";
    document.body.appendChild(el);
  }

  el.textContent = msg;
}

function gestureHUD(text) {
  let el = document.getElementById("gesture-hud");

  if (!el) {
    el = document.createElement("div");
    el.id = "gesture-hud";
    el.style.position = "fixed";
    el.style.top = "10px";
    el.style.right = "10px";
    el.style.background = "rgba(0,0,0,0.6)";
    el.style.color = "yellow";
    el.style.fontSize = "16px";
    el.style.fontWeight = "bold";
    el.style.fontFamily = "monospace";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "8px";
    el.style.zIndex = "999999";

    el.style.whiteSpace = "nowrap";
    el.style.width = "max-content";
    el.style.textAlign = "left";

    document.body.appendChild(el);
  }

  // ---- FORCE CLEAN SPLIT (prevents leakage) ----
  let [g = "", c = "", f = ""] = (text || "").split("\n");

  // extra safety: strip accidental merging like "90%4 FINGERS"
  c = c.replace(/(\d+)%(\d+)/, "$1%");
  f = f.replace(/(\d+)%(\d+)/, "$2");

  el.innerHTML = `
    <div>gesture: ${g}</div>
    <div>confidence: ${c}</div>
    <div>fingers: ${f}</div>
  `;
}

function trainingHUD(msg) {
  let el = document.getElementById("training-hud");

  if (!el) {
    el = document.createElement("div");
    el.id = "training-hud";

    el.style.position = "fixed";
    el.style.bottom = "10px";
    el.style.right = "10px";
    el.style.background = "rgba(0,0,0,0.8)";
    el.style.color = "yellow";
    el.style.padding = "8px 12px";
    el.style.fontSize = "14px";
    el.style.fontFamily = "monospace";
    el.style.zIndex = "999999";
    el.style.borderRadius = "6px";

    document.body.appendChild(el);
  }

  el.textContent = msg;
}
/* ---------------- ERROR OVERLAY ---------------- */
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

/* ---------------- GESTURE DATABASE ---------------- */

let gestureDB;

/* default empty structure */
const DEFAULT_DB = {
  version: 1,

  meta: {
    created: Date.now(),
    updated: Date.now(),
    totalSamples: 0
  },

  basic: {
    PINCH: [],
    FIST: [],
    OPEN: []
  },

  motion: {
    UP: [],
    DOWN: [],
    LEFT: [],
    RIGHT: []
  }
};

/* ---------------- LOAD OR CREATE DB ---------------- */

function initGestureDB() {

  const savedDB = localStorage.getItem("gestureDB");

  /* DB EXISTS -> LOAD */
  if (savedDB) {

    try {
      gestureDB = JSON.parse(savedDB);

      console.log("Gesture DB loaded");
      console.log(gestureDB);

    } catch (err) {

      console.error("DB corrupted, recreating");

      gestureDB = structuredClone(DEFAULT_DB);

      saveGestureDB();
    }

  }

  /* DB DOES NOT EXIST -> CREATE */
  else {

    console.log("No DB found, creating new DB");

    gestureDB = structuredClone(DEFAULT_DB);

    saveGestureDB();
  }
}

/* ---------------- SAVE DB ---------------- */

function saveGestureDB() {

  gestureDB.meta.updated = Date.now();

  localStorage.setItem(
    "gestureDB",
    JSON.stringify(gestureDB)
  );

  console.log("Gesture DB saved");
}

/* ---------------- INIT ---------------- */

initGestureDB();




/* ---------------- ELEMENTS ---------------- */
const video = document.getElementById("video");
const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");
const loading = document.getElementById("loading-screen");

/* ---------------- ML ---------------- */
import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

let handLandmarker = null;
let mlReady = false;

/* ---------------- CAMERA ---------------- */
async function startCamera() {
  try {
    status("Requesting camera...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    status("Camera started");

    if (loading) loading.style.display = "none";

    initML();
    loop();

  } catch (err) {
    status("Camera failed: " + err.name);

    document.body.innerHTML = `
      <div style="
        position:fixed;
        inset:0;
        background:black;
        color:orange;
        padding:20px;
        font-family:monospace;
      ">
        <h3>Camera Failed</h3>
        <pre>${err.name}: ${err.message}</pre>
      </div>
    `;
  }
}

/* ---------------- ML INIT ---------------- */
async function initML() {
  try {
    status("Loading AI...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    status("Model loading...");

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
  status("READY - tracking active");
}

/* ---------------- RESIZE ---------------- */
function resizeCanvas() {
  if (!video.videoWidth) return;

  if (
    canvas.width !== video.videoWidth ||
    canvas.height !== video.videoHeight
  ) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
}

/* ---------------- DRAW HANDS ---------------- */
let gestureHistory = [];
const HISTORY_SIZE = 10;

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(value, wristToMiddle) {
  return value / wristToMiddle;
}

function mode(arr) {
  const count = {};
  let best = arr[0];
  let max = 0;

  for (const v of arr) {
    count[v] = (count[v] || 0) + 1;
    if (count[v] > max) {
      max = count[v];
      best = v;
    }
  }

  return best;
}

function drawHands() {

  if (!mlReady || !handLandmarker) return;
  if (video.readyState < 2) return;

  resizeCanvas();

  const result = handLandmarker.detectForVideo(
    video,
    performance.now()
  );

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ---------------- NO HAND ----------------
  if (!result.landmarks || result.landmarks.length === 0) {

    gestureHUD("NO HAND");

    status("RUNNING (0 hands)");

    gestureHistory.length = 0;

    return;
  }

  // ---------------- HAND ----------------
  const hand = result.landmarks[0];

  const thumb = hand[4];
  const index = hand[8];
  const middle = hand[12];
  const ring = hand[16];
  const pinky = hand[20];
  const wrist = hand[0];

  const handScale = dist(wrist, hand[9]);

  // ---------------- FEATURES ----------------
  const features = {

    pinch:
      dist(thumb, index) / handScale,

    indexCurl:
      dist(index, hand[5]) / handScale,

    middleCurl:
      dist(middle, hand[9]) / handScale,

    ringCurl:
      dist(ring, hand[13]) / handScale,

    pinkyCurl:
      dist(pinky, hand[17]) / handScale
  };

  features.open =
    (
      features.indexCurl +
      features.middleCurl +
      features.ringCurl +
      features.pinkyCurl
    ) / 4;

  // ---------------- DB MATCHING ----------------
  let bestGesture = "UNKNOWN";
  let bestScore = Infinity;

  for (const label in gestureDB.basic) {

    const samples = gestureDB.basic[label];

    for (const sample of samples) {

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
        bestGesture = label;
      }
    }
  }

  // ---------------- CONFIDENCE ----------------
  let confidence =
    Math.max(
      0,
      Math.min(
        100,
        Math.round((1 - bestScore) * 100)
      )
    );

  // ---------------- SMOOTHING ----------------
  gestureHistory.push(bestGesture);

  if (gestureHistory.length > HISTORY_SIZE) {
    gestureHistory.shift();
  }

  const stableGesture = mode(gestureHistory);

  // ---------------- FINGER COUNT ----------------
  let fingersUp = 0;

  if (features.indexCurl > 0.18) fingersUp++;
  if (features.middleCurl > 0.18) fingersUp++;
  if (features.ringCurl > 0.18) fingersUp++;
  if (features.pinkyCurl > 0.18) fingersUp++;

  // thumb special case
  if (thumb.x < hand[3].x) {
    fingersUp++;
  }

  // ---------------- HUD ----------------
  gestureHUD(
    `gesture: ${stableGesture}
    confidence: ${confidence}%
    fingers: ${fingersUp}`
  );

  // ---------------- TRAINING ----------------
  if (trainingActive && !trainingLocked) {

    trainingBuffer.push({
      ...features,
      landmarks: hand
    });

    trainingHUD(
      `RECORDING ${trainingBuffer.length}/${TRAIN_FRAMES}`
    );

    // ---------------- STOP CONDITION ----------------
    if (trainingBuffer.length >= TRAIN_FRAMES) {

      trainingLocked = true;
      trainingActive = false;

      const bufferCopy = trainingBuffer.slice();

      setTimeout(() => {
        askTrainingLabel(bufferCopy);
      }, 0);
    }
  }

  // ---------------- DRAW ----------------
  for (const p of hand) {

    ctx.beginPath();

    ctx.arc(
      p.x * canvas.width,
      p.y * canvas.height,
      6,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "cyan";

    ctx.fill();
  }

  status(
    `RUNNING (1 hand) ${stableGesture} ${confidence}%`
  );
}

/*---------------Label and save------------------*/

function askTrainingLabel(buffer) {

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.85)";
  overlay.style.zIndex = "999999";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.gap = "12px";
  overlay.style.fontFamily = "monospace";
  overlay.style.color = "white";

  // ---------------- TITLE ----------------
  const title = document.createElement("div");
  title.textContent = "SAVE TRAINING SAMPLE";
  title.style.fontSize = "20px";
  title.style.marginBottom = "10px";

  // ---------------- CATEGORY ----------------
  const categorySelect = document.createElement("select");
  categorySelect.style.padding = "8px";
  categorySelect.style.fontSize = "16px";

  ["BASIC", "MOTION"].forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });

  // ---------------- LABEL ----------------
  const labelSelect = document.createElement("select");
  labelSelect.style.padding = "8px";
  labelSelect.style.fontSize = "16px";

  const newLabelInput = document.createElement("input");
  newLabelInput.placeholder = "New label name";
  newLabelInput.style.padding = "8px";
  newLabelInput.style.fontSize = "16px";
  newLabelInput.style.display = "none";

  // ---------------- REFRESH LABELS ----------------
  function refreshLabels() {

    labelSelect.innerHTML = "";

    const dbSection =
      categorySelect.value === "MOTION"
        ? gestureDB.motion
        : gestureDB.basic;

    Object.keys(dbSection).forEach(k => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      labelSelect.appendChild(opt);
    });

    const newOpt = document.createElement("option");
    newOpt.value = "__new__";
    newOpt.textContent = "+ NEW LABEL";
    labelSelect.appendChild(newOpt);
  }

  categorySelect.onchange = refreshLabels;
  refreshLabels();

  labelSelect.onchange = () => {
    newLabelInput.style.display =
      labelSelect.value === "__new__" ? "block" : "none";
  };

  // ---------------- BUTTONS ----------------
  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "10px";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "SAVE";
  saveBtn.style.padding = "10px 20px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "CANCEL";
  cancelBtn.style.padding = "10px 20px";

  cancelBtn.onclick = () => {
    overlay.remove();
    trainingLocked = false;
  };

  saveBtn.onclick = () => {

    const category = categorySelect.value;

    let label =
      labelSelect.value === "__new__"
        ? newLabelInput.value.trim()
        : labelSelect.value;

    if (!label) return;

    label = label.toUpperCase();

    saveRecordedSample(category, label, buffer);

    overlay.remove();
  };

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);

  // ---------------- BUILD UI ----------------
  overlay.appendChild(title);
  overlay.appendChild(categorySelect);
  overlay.appendChild(labelSelect);
  overlay.appendChild(newLabelInput);
  overlay.appendChild(btnRow);

  document.body.appendChild(overlay);
}


function saveRecordedSample(category, label, buffer) {

  const avg = (k) =>
    buffer.reduce((sum, f) => sum + f[k], 0) / buffer.length;

  const sample = {
    features: {
      pinch: avg("pinch"),
      open: avg("open"),
      indexCurl: avg("indexCurl"),
      middleCurl: avg("middleCurl"),
      ringCurl: avg("ringCurl"),
      pinkyCurl: avg("pinkyCurl")
    },

    landmarks: buffer.map(f => f.landmarks),
    timestamp: Date.now()
  };

  const targetDB =
    category === "MOTION"
      ? gestureDB.motion
      : gestureDB.basic;

  targetDB[label] = targetDB[label] || [];
  targetDB[label].push(sample);

  saveGestureDB();

  trainingHUD(`SAVED ${category}:${label}`);

  trainingLocked = false;
}

/*----------------------TRAINING BUTTON--------------------------*/
let trainingActive = false;
let trainingGesture = null;
let trainingBuffer = [];
let TRAIN_FRAMES = 20;
let trainingLocked = false;

document.getElementById("train-btn").onclick = () => {

  if (trainingActive || trainingLocked) return;

  trainingActive = true;
  trainingLocked = false;
  trainingBuffer = [];

  trainingHUD("RECORDING...");
};





/* ---------------- LOOP ---------------- */
function loop() {
  requestAnimationFrame(loop);
  drawHands();
}


/* ---------------- START ---------------- */
window.addEventListener("load", startCamera);


/* ---------------- TRAIN BUTTON UI STYLE ---------------- */
const btn = document.getElementById("train-btn");

/* ---------------- BASE STYLE ---------------- */
btn.style.position = "fixed";
btn.style.left = "20px";
btn.style.top = "70vh"; // important: no bottom
btn.style.padding = "16px 22px";
btn.style.borderRadius = "999px";
btn.style.background = "rgba(255,255,255,0.25)";
btn.style.backdropFilter = "blur(10px)";
btn.style.color = "white";
btn.style.fontSize = "16px";
btn.style.fontWeight = "bold";
btn.style.border = "1px solid rgba(255,255,255,0.4)";
btn.style.zIndex = "999999";
btn.style.userSelect = "none";
btn.style.touchAction = "none"; // IMPORTANT for mobile

/* ---------------- STATE ---------------- */
let isDragging = false;
let startX = 0;
let startY = 0;
let startLeft = 0;
let startTop = 0;

/* movement threshold for tap vs drag */
const DRAG_THRESHOLD = 6;

/* ---------------- POINTER DOWN ---------------- */
btn.addEventListener("pointerdown", (e) => {
  isDragging = false;

  startX = e.clientX;
  startY = e.clientY;

  startLeft = btn.offsetLeft;
  startTop = btn.offsetTop;

  btn.setPointerCapture(e.pointerId);
  btn.style.cursor = "grabbing";
});

/* ---------------- POINTER MOVE ---------------- */
btn.addEventListener("pointermove", (e) => {
  if (startX === null) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  // only become drag AFTER movement threshold
  if (!isDragging && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
    isDragging = true;
  }

  if (!isDragging) return;

  btn.style.left = startLeft + dx + "px";
  btn.style.top = startTop + dy + "px";
});

/* ---------------- POINTER UP ---------------- */
btn.addEventListener("pointerup", (e) => {
  btn.releasePointerCapture(e.pointerId);
  btn.style.cursor = "grab";

  // IMPORTANT:
  // if it was NOT dragged → treat as tap
  if (!isDragging) {
    btn.click(); // triggers your existing training logic
  }

  isDragging = false;
});



