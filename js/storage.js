export function loadAll(state) {
  try {
    const raw = localStorage.getItem("gesturecam");
    if (!raw) return;
    const data = JSON.parse(raw);
    state.photos = data.photos || [];
  } catch {}
}