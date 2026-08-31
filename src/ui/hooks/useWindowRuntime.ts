// useWindowRuntime.ts — React hook gắn windowStore (SSR-safe).
import { useSyncExternalStore } from "react";
import { subscribeWindows, getWindows } from "../wm95/windowRuntime";
export function useWindows() {
  return useSyncExternalStore(subscribeWindows, getWindows);
}
export { openWindow, dispatchWindow } from "../wm95/windowRuntime";
