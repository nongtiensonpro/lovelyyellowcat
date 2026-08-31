// galleryTransform.ts — pure math cho transform ảnh (Phase 4, kế hoạch §4 Phase 4).
// Không DOM, không React — test 100% được. Clamp chặt để không mất ảnh.

export interface TransformState {
  zoom: number;
  pan: { x: number; y: number };
  rotation: number; // độ 0|90|180|270
  flipH: boolean;
}

export const ZOOM_MIN = 0.8;
export const ZOOM_MAX = 4.0;
export const ZOOM_STEP = 0.35;
export const ZOOM_WHEEL_STEP = 0.2;

export const INITIAL_TRANSFORM: TransformState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
  rotation: 0,
  flipH: false,
};

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

/** Zoom in/out quanh mức hiện tại. Zoom về ≤1 reset pan (không pan khi chưa phóng). */
export function zoomTo(state: TransformState, nextZoomRaw: number): TransformState {
  const zoom = clamp(Number(nextZoomRaw.toFixed(2)), ZOOM_MIN, ZOOM_MAX);
  if (zoom <= 1) return { ...state, zoom, pan: { x: 0, y: 0 } };
  return { ...state, zoom };
}

export function zoomIn(state: TransformState, step: number = ZOOM_STEP): TransformState {
  return zoomTo(state, state.zoom + step);
}

export function zoomOut(state: TransformState, step: number = ZOOM_STEP): TransformState {
  return zoomTo(state, state.zoom - step);
}

/** Pan tuyệt đối (đã là client coords — component xử lý pointer delta). */
export function panTo(state: TransformState, x: number, y: number): TransformState {
  if (state.zoom <= 1) return state; // không pan khi chưa zoom
  return { ...state, pan: { x, y } };
}

export function rotate(state: TransformState): TransformState {
  return { ...state, rotation: (state.rotation + 90) % 360 };
}

export function flipH(state: TransformState): TransformState {
  return { ...state, flipH: !state.flipH };
}

/** CSS transform string hoàn chỉnh cho <img>. */
export function transformToCss(state: TransformState): string {
  const parts = [
    `translate(${state.pan.x}px, ${state.pan.y}px)`,
    `scale(${state.zoom})`,
    `rotate(${state.rotation}deg)`,
  ];
  if (state.flipH) parts.push("scaleX(-1)");
  return parts.join(" ");
}

/** Nhãn % cho toast. */
export function zoomPercent(zoom: number): number {
  return Math.round(zoom * 100);
}
