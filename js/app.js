console.log("APP LOADED");

/* ---------------- ERROR DISPLAY (mobile-safe debugging) ---------------- */
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

/* ---------------- MAIN ---------------- */
async function startCamera() {
  const video = document.getElementById("video");
  const loading = document.getElementById("loading-screen");

  try {
    if (!video) throw new Error("Missing <video id='video'>");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;

    await video.play();

    console.log("Camera started");

    if (loading) {
      loading.style.display = "none";
    }

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
        <pre>${err.message}</pre>
      </div>
    `;
  }
}

window.addEventListener("load", startCamera);
