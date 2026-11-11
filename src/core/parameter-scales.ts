export function nominalRodLength(value: number) {
  return 14 + value * 30;
}

export function particleCount(value: number) {
  return Math.round(value * 48) * 2;
}

export function brushMultiplier(value: number) {
  return 0.25 + value * 1.5;
}

export function rodDragMultiplier(value: number) {
  return Math.exp((value - 0.35) * 2);
}

export function particleDragMultiplier(value: number) {
  return Math.exp((0.5 - value) * 3);
}

export function screeningLength(value: number) {
  return (1.05 - value) * 100 / value;
}
