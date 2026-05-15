export let video;

export async function initCamera(state) {
  video = document.getElementById("video");

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: false
  });

  video.srcObject = stream;

  return new Promise(res => {
    video.onloadedmetadata = () => {
      video.play();
      state.videoReady = true;
      res();
    };
  });
}