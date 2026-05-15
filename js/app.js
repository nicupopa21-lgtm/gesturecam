console.log("APP LOADED");

/* ---------------- ERROR DISPLAY ---------------- */
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

/* ---------------- MEDIA PIPE IMPORT ---------------- */
import {
  HandLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

/* ---------------- ELEMENTS ---------------- */
const video = document.getElementById("video");
const canvas = document.getElementById("skeleton-canvas");
const ctx = canvas.getContext("2d");
const loading = document.getElementById("loading-screen");

/* ---------------- ML STATE ---------------- */
let handLandmarker = null;
let mlReady = false;

/* ---------------- CAMERA ---------------- */
async function startCamera() {
  try {
    console.log("Requesting camera...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    console.log("Camera started");

    if (loading) loading.style.display = "none";

    initML(); // start ML AFTER camera
    loop();  // start render loop

  } catch (err) {
    console.error(err);

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

/* ---------------- INIT MEDIA PIPE ---------------- */
async function initML() {
  try {
    console.log("Loading ML...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float32/1/hand_landmarker.task",
        delegate: "CPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });

    mlReady = true;
    console.log("ML READY");

  } catch (e) {
    console.error("ML failed", e);
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
}

/* ---------------- LOOP ---------------- */
function loop() {
  requestAnimationFrame(loop);
  drawHands();
}

/* ---------------- START ---------------- */
window.addEventListener("load", startCamera);
