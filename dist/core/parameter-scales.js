export function nominalRodLength(value) {
    return 14 + value * 30;
}
export function particleCount(value) {
    return Math.round(value * 48) * 2;
}
export function brushMultiplier(value) {
    return 0.25 + value * 1.5;
}
export function rodDragMultiplier(value) {
    return Math.exp((value - 0.35) * 2);
}
export function particleDragMultiplier(value) {
    return Math.exp((0.5 - value) * 3);
}
export function screeningLength(value) {
    return (1.05 - value) * 100 / value;
}
