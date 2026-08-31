// WMHost.tsx — island duy nhất render tất cả cửa sổ WM + taskbar.
// Mount 1 lần ở layout; nội dung window đăng ký qua windowRuntime + children slot.
import React from "react";
import { useWindows } from "./windowRuntime";
import { WindowFrame } from "./WindowFrame";
import { Taskbar } from "./Taskbar";

export interface RegisteredContent {
  id: string;
  render: () => React.ReactNode;
}

const CONTENT_REGISTRY = new Map<string, () => React.ReactNode>();

export function registerWindowContent(id: string, render: () => React.ReactNode): () => void {
  CONTENT_REGISTRY.set(id, render);
  return () => { CONTENT_REGISTRY.delete(id); };
}

export const WMHost: React.FC = () => {
  const windows = useWindows();
  return (
    <>
      {windows.map((w) => {
        const render = CONTENT_REGISTRY.get(w.id);
        return (
          <WindowFrame key={w.id} id={w.id}>
            {render ? render() : null}
          </WindowFrame>
        );
      })}
      {windows.length > 0 && <Taskbar />}
    </>
  );
};
