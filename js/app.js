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
    el.style.bottom = "20px";
    el.style.left = "50%";
    el.style.transform = "translateX(-50%)";

    /* 🔥 3× BIGGER */
    el.style.fontSize = "42px";
    el.style.padding = "18px 26px";

    /* visual */
    el.style.fontFamily = "monospace";
    el.style.fontWeight = "800";
    el.style.color = "white";
    el.style.textAlign = "center";

    /* glass + glow */
    el.style.background = "rgba(255,255,255,0.18)";
    el.style.backdropFilter = "blur(14px)";
    el.style.webkitBackdropFilter = "blur(14px)";

    el.style.border = "1px solid rgba(255,255,255,0.35)";
    el.style.borderRadius = "18px";

    el.style.boxShadow =
      "0 10px 30px rgba(0,0,0,0.35), 0 0 20px rgba(255,255,255,0.25)";

    el.style.zIndex = "999999";

    /* mobile safe */
    el.style.maxWidth = "90vw";
    el.style.whiteSpace = "nowrap";

    document.body.appendChild(el);
  }

  el.textContent = msg;
}



function saveHUD(msg) {
  let el = document.getElementById("save-hud");

  if (!el) {
    el = document.createElement("div");
    el.id = "save-hud";
    document.body.appendChild(el);
  }

  el.style.position = "fixed";
  el.style.top = "20px";
  el.style.left = "50%";
  el.style.transform = "translateX(-50%)";

  /* 🔥 BIGGER THAN TRAINING HUD */
  el.style.fontSize = "36px";
  el.style.padding = "16px 24px";

  el.style.fontFamily = "monospace";
  el.style.fontWeight = "900";
  el.style.color = "white";
  el.style.textAlign = "center";

  /* GREEN SUCCESS STYLE */
  el.style.background = "rgba(0, 255, 120, 0.25)";
  el.style.border = "1px solid rgba(0, 255, 120, 0.6)";
  el.style.backdropFilter = "blur(14px)";
  el.style.webkitBackdropFilter = "blur(14px)";

  el.style.borderRadius = "18px";

  el.style.boxShadow =
    "0 10px 30px rgba(0,0,0,0.35), 0 0 25px rgba(0,255,120,0.35)";

  el.style.zIndex = "999999";

  el.textContent = msg;

  /* auto hide */
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.remove();
  }, 1200);
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
  },

  fingers: {
    ZERO: [],
    ONE: [],
    TWO: [],
    THREE: [],
    FOUR: [],
    FIVE: []
  }
};

/* ---------------- LOAD OR CREATE DB ---------------- */

function initGestureDB() {

  const savedDB = localStorage.getItem("gestureDB");

  /* DB DOES NOT EXIST -> CREATE */
  if (!savedDB) {
    gestureDB = structuredClone(DEFAULT_DB);
    saveGestureDB();
    return;
  }

  try {
    gestureDB = JSON.parse(savedDB);

    console.log("Gesture DB loaded");
    console.log(gestureDB);

    // ---------------- MIGRATION GOES HERE ----------------
    if ((gestureDB.version || 1) < 2) {
      gestureDB.fingers = gestureDB.fingers || structuredClone(DEFAULT_DB.fingers);
      gestureDB.version = 2;

      console.log("DB migrated to v2 (added fingers)");
      saveGestureDB();
    }

  } catch (err) {

    console.error("DB corrupted, recreating");

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

let fingersHistory = [];
const FINGERS_HISTORY_SIZE = 7;

let trail = [];

let directionHistory = [];
const DIRECTION_HISTORY_SIZE = 7;

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

function predictFromDB(dbSection, features) {

  let bestLabel = "UNKNOWN";
  let bestScore = Infinity;

  for (const label in dbSection) {
    const samples = dbSection[label];

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
        bestLabel = label;
      }
    }
  }

  return bestLabel;
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

  // ---------------- ML INFERENCE (kNN) ----------------
  const gesture = predictFromDB(gestureDB.basic, features);
  const fingers = predictFromDB(gestureDB.fingers, features);

  trail.push({ x: wrist.x, y: wrist.y, t: performance.now() });
  
  if (trail.length > 10) trail.shift();
  
  let direction = "NONE";
  
  // wait for enough samples (stability gate)
  if (trail.length >= 5) {
  
    let sumX = 0;
    let sumY = 0;
  
    // smooth motion over all points
    for (let i = 1; i < trail.length; i++) {
      const weight = i / trail.length;
      sumX += (trail[i].x - trail[i - 1].x) * weight;
      sumY += (trail[i].y - trail[i - 1].y) * weight;
    }
  
    const dx = sumX;
    const dy = sumY;
  
    // optional dead-zone (prevents micro jitter)
    const threshold = 0.03;
  
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      direction = "NONE";
    } 
    else if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? "LEFT" : "RIGHT";
    } 
    else {
      direction = dy > 0 ? "DOWN" : "UP";
    }
  }

  

  // ---------------- SMOOTHING ----------------
  gestureHistory.push(gesture);

  if (gestureHistory.length > HISTORY_SIZE) {
    gestureHistory.shift();
  }

  const stableGesture = mode(gestureHistory);

  fingersHistory.push(fingers);

    if (fingersHistory.length > FINGERS_HISTORY_SIZE) {
      fingersHistory.shift();
    }
    
    const stableFingers = mode(fingersHistory);

  directionHistory.push(direction);

    if (directionHistory.length > DIRECTION_HISTORY_SIZE) {
      directionHistory.shift();
    }
    
    const stableDirection = mode(directionHistory);
  

  // ---------------- HUD ----------------
  gestureHUD(
    `gesture: ${stableGesture}
    direction: ${stableDirection}
    fingers: ${stableFingers}`
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
    `RUNNING (1 hand) ${stableGesture}`
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

  ["BASIC", "MOTION", "FINGERS"].forEach(c => {
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
      categorySelect.value === "FINGERS"
        ? gestureDB.fingers
        : categorySelect.value === "MOTION"
          ? gestureDB.motion
          : gestureDB.basic;

    Object.keys(dbSection || {}).forEach(k => {
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

    timestamp: Date.now()
  };

  const targetDB =
    category === "FINGERS"
      ? gestureDB.fingers
      : category === "MOTION"
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
btn.style.top = "70vh";

/* ---- SIZE (bigger + easier mobile tap) ---- */
btn.style.padding = "18px 26px";
btn.style.fontSize = "18px";

/* ---- PERFECT ROUND SHAPE ---- */
btn.style.borderRadius = "999px";

/* ---- BRIGHTER GLASS LOOK ---- */
btn.style.background = "rgba(255, 255, 255, 0.35)";
btn.style.border = "1px solid rgba(255, 255, 255, 0.6)";

/* ---- MORE GLOW / VISIBILITY ---- */
btn.style.boxShadow = "0 8px 25px rgba(0,0,0,0.35), 0 0 18px rgba(255,255,255,0.25)";

/* ---- TEXT POP ---- */
btn.style.color = "white";
btn.style.fontWeight = "700";

/* ---- GLASS EFFECT (better blur) ---- */
btn.style.backdropFilter = "blur(14px)";
btn.style.webkitBackdropFilter = "blur(14px)";

/* ---- MOBILE TOUCH FEEL ---- */
btn.style.userSelect = "none";
btn.style.touchAction = "none";
btn.style.cursor = "grab";

/* ---- OPTIONAL: subtle animation feel ---- */
btn.style.transition = "transform 0.08s ease, box-shadow 0.2s ease";



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


btn.addEventListener("pointerdown", () => {
  btn.style.transform = "scale(0.96)";
});

btn.addEventListener("pointerup", () => {
  btn.style.transform = "scale(1)";
});

btn.addEventListener("pointercancel", () => {
  btn.style.transform = "scale(1)";
});


/*----------------------db handle--------------*/
const dbBtn = document.createElement("button");
dbBtn.id = "db-btn";
dbBtn.textContent = "DB";
document.body.appendChild(dbBtn);

dbBtn.style.position = "fixed";
dbBtn.style.right = "20px";
dbBtn.style.top = "70vh";

dbBtn.style.padding = "14px 18px";
dbBtn.style.borderRadius = "999px";
dbBtn.style.fontSize = "16px";
dbBtn.style.fontWeight = "700";

dbBtn.style.background = "rgba(255,255,255,0.35)";
dbBtn.style.color = "white";
dbBtn.style.border = "1px solid rgba(255,255,255,0.6)";
dbBtn.style.backdropFilter = "blur(14px)";
dbBtn.style.zIndex = "999999";


function openDBViewer() {
  const old = document.getElementById("db-viewer");
  if (old) old.remove();

  const overlay = document.createElement("div");
  overlay.id = "db-viewer";

  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.92)";
  overlay.style.zIndex = "999999";
  overlay.style.overflow = "auto";
  overlay.style.padding = "20px";
  overlay.style.fontFamily = "monospace";
  overlay.style.color = "white";

  const title = document.createElement("h2");
  title.textContent = "GESTURE DATABASE";
  overlay.appendChild(title);

  const db = JSON.parse(localStorage.getItem("gestureDB") || "{}");

  function saveAndRefresh(newDB) {
    localStorage.setItem("gestureDB", JSON.stringify(newDB));
    gestureDB = newDB; // keep runtime synced
    openDBViewer();
  }

  function renderSection(sectionName, section) {
    const h = document.createElement("h3");
    h.textContent = sectionName.toUpperCase();
    overlay.appendChild(h);

    for (const label in section) {
      const arr = section[label];

      const block = document.createElement("div");
      block.style.border = "1px solid rgba(255,255,255,0.2)";
      block.style.margin = "10px 0";
      block.style.padding = "10px";
      block.style.borderRadius = "10px";

      const labelTitle = document.createElement("div");
      labelTitle.textContent = `${label} (${arr.length})`;
      labelTitle.style.fontWeight = "700";

      const delLabelBtn = document.createElement("button");
      delLabelBtn.textContent = "DELETE ALL";
      delLabelBtn.style.marginLeft = "10px";

      delLabelBtn.onclick = () => {
        if (!confirm(`Delete ALL ${sectionName}:${label}?`)) return;

        const newDB = JSON.parse(localStorage.getItem("gestureDB"));

        newDB[sectionName][label] = [];

        saveAndRefresh(newDB);
      };

      block.appendChild(labelTitle);
      block.appendChild(delLabelBtn);

      arr.forEach((item, i) => {
        const row = document.createElement("div");
        row.style.marginTop = "6px";
        row.style.fontSize = "12px";
        row.style.opacity = "0.9";

        row.textContent = `#${i} | ${item.timestamp || "no-ts"}`;

        const delBtn = document.createElement("button");
        delBtn.textContent = "X";
        delBtn.style.marginLeft = "10px";

        delBtn.onclick = () => {
          const newDB = JSON.parse(localStorage.getItem("gestureDB"));

          const realArr = newDB[sectionName][label];

          const idx = realArr.findIndex(
            x => x.timestamp === item.timestamp
          );

          if (idx !== -1) {
            realArr.splice(idx, 1);
          }

          saveAndRefresh(newDB);
        };

        row.appendChild(delBtn);
        block.appendChild(row);
      });

      overlay.appendChild(block);
    }
  }

  renderSection("basic", db.basic || {});
  renderSection("motion", db.motion || {});

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "CLOSE";
  closeBtn.style.marginTop = "20px";
  closeBtn.onclick = () => overlay.remove();

  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);
}


dbBtn.onclick = openDBViewer;
