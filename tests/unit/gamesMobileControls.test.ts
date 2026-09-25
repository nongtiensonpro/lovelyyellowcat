import { describe, expect, it } from "vitest";
import { mapPointerYToPong } from "../../src/lib/games/mobileInput";

describe("mobile game input mapping", () => {
  it("maps a client Y inside the canvas to Pong game coordinates", () => {
    expect(mapPointerYToPong(160, { top: 40, height: 240 }, 540)).toBe(270);
  });

  it("clamps pointer Y to the game bounds", () => {
    const rect = { top: 40, height: 240 };
    expect(mapPointerYToPong(-20, rect, 540)).toBe(0);
    expect(mapPointerYToPong(400, rect, 540)).toBe(540);
  });

  it("returns a safe value when the canvas has no height", () => {
    expect(mapPointerYToPong(100, { top: 0, height: 0 }, 540)).toBe(270);
  });
});
