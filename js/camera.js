export const video = document.getElementById("video");

export const cameraState = {
  stream: null,
  ready: false
};

export async function initCamera() {
  cameraState.stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });

  video.srcObject = cameraState.stream;

  await new Promise(resolve => {
    video.onloadedmetadata = () => {
      video.play();
      cameraState.ready = true;
      resolve();
    };
  });
}
