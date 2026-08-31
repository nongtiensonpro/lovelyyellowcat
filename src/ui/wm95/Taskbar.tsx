// Taskbar.tsx — taskbar Win95: hiển thị cửa sổ taskbarWindows + đồng hồ + Start.
import React, { useEffect, useState } from "react";
import { useWindows, dispatchWindow } from "./windowRuntime";
import { taskbarWindows } from "./windowStore";

export const Taskbar: React.FC = () => {
  const windows = useWindows();
  const items = taskbarWindows(windows);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let t: ReturnType<typeof setInterval> | null = null;
    const tick = () => setNow(new Date());
    const start = () => { if (!t) t = setInterval(tick, 1000); };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    start();
    return stop;
  }, []);

  return (
    <div
      className="win95-statusbar fixed bottom-0 left-0 right-0 flex items-center gap-1 px-1 z-[400]"
      role="toolbar"
      aria-label="Thanh tác vụ"
      style={{ height: 36 }}
    >
      <button type="button" className="win95-btn font-bold text-xs px-2 py-1 shrink-0" aria-label="Start">
        📼 LYC
      </button>
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {items.map((w) => (
          <button
            key={w.id}
            type="button"
            className={[
              "win95-btn text-xs px-2 py-1 max-w-40 truncate shrink-0",
              w.state === "active" || w.state === "maximized" ? "win95-sunken font-bold" : "",
            ].join(" ")}
            aria-pressed={w.state === "active" || w.state === "maximized"}
            onClick={() => {
              if (w.state === "minimized") dispatchWindow({ type: "focus", id: w.id });
              else if (w.state === "active" || w.state === "maximized") dispatchWindow({ type: "minimize", id: w.id });
              else dispatchWindow({ type: "focus", id: w.id });
            }}
          >
            <span aria-hidden="true">{w.icon || "🗔"}</span> {w.title}
          </button>
        ))}
      </div>
      <span className="win95-statusbar-panel font-mono text-xs shrink-0" aria-label="Đồng hồ">
        {now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
      </span>
    </div>
  );
};
