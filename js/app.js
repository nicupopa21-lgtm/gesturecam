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
        delegate: "CPU"
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
function drawHands() {
  if (!mlReady || !handLandmarker) return;
  if (video.readyState < 2) return;

  resizeCanvas();

  const result = handLandmarker.detectForVideo(video, performance.now());

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!result.landmarks) return;

  for (const hand of result.landmarks) {
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
  }

  status("RUNNING (" + result.landmarks.length + " hand(s))");
}

/* ---------------- LOOP ---------------- */
function loop() {
  requestAnimationFrame(loop);
  drawHands();
}

/* ---------------- START ---------------- */
window.addEventListener("load", startCamera);
