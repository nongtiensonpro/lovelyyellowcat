/** Map a pointer client Y coordinate into the logical 960×540 Pong field. */
export function mapPointerYToPong(
  clientY: number,
  rect: { top: number; height: number },
  gameHeight: number,
): number {
  if (rect.height <= 0) return gameHeight / 2;
  const ratio = (clientY - rect.top) / rect.height;
  return Math.max(0, Math.min(gameHeight, ratio * gameHeight));
}
