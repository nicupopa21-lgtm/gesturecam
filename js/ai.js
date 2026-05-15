import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

export const aiState = {
  handLandmarker: null,
  mlReady: false
};

export async function initAI() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  aiState.handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float32/1/hand_landmarker.task",
      delegate: "CPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });

  aiState.mlReady = true;
}
