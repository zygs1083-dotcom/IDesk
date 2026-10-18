export type Skin = "classic" | "cartoon" | "pixel";

export function applySkin(skin: Skin) {
  document.documentElement.dataset.skin = skin;
  try {
    localStorage.setItem("idesk.skin", skin);
  } catch {
    // Keep the current page usable when browser storage is unavailable.
  }
}
