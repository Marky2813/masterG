"use client";

// Shared pen activity, so the Brain never scolds while the kid is still writing.
export const penState = { down: false, lastActivity: 0 };

export function markPen(down: boolean): void {
  penState.down = down;
  penState.lastActivity = performance.now();
}

// Resolves once the pen has been up and still for `quietMs`.
export function waitForQuietPen(quietMs: number): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => {
      if (!penState.down && performance.now() - penState.lastActivity >= quietMs) resolve();
      else setTimeout(tick, 150);
    };
    tick();
  });
}
