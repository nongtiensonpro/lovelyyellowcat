// ssr-smoke.test.tsx — render các island qua renderToString để bắt lỗi
// "Missing getServerSnapshot" / window-undefined NGAYỤC TRONG CI, không đợi deploy thật.
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { WMHost } from "../../src/ui/wm95/WMHost";
import { DialogHost } from "../../src/ui/wm95/DialogHost";
import { CommandPalette } from "../../src/ui/shell/CommandPalette";

describe("SSR smoke — islands phải render được trên server", () => {
  it("WMHost render không throw (useSyncExternalStore có getServerSnapshot)", () => {
    const html = renderToString(React.createElement(WMHost));
    expect(typeof html).toBe("string");
  });
  it("DialogHost render không throw", () => {
    const html = renderToString(React.createElement(DialogHost));
    expect(typeof html).toBe("string");
  });
  it("CommandPalette render không throw (trả null khi đóng)", () => {
    const html = renderToString(React.createElement(CommandPalette, { role: "public" }));
    expect(html).toBe(""); // palette đóng => không render gì
  });
});

import React from "react";
