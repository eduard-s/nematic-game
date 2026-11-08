import { fieldVector } from "./nematic-game.js";
import { DEFAULT_THEME, rgb, alpha } from "./theme.js";
const palettes = new WeakMap();
function colorsFor(theme) {
    let colors = palettes.get(theme);
    if (!colors) {
        const a = rgb(theme.rodLow), b = rgb(theme.rodHigh);
        colors = Array.from({ length: 64 }, (_, angle) => {
            const w = (Math.cos(angle / 64 * Math.PI * 2) + 1) / 2;
            return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * w)).join(" ")})`;
        });
        palettes.set(theme, colors);
    }
    return colors;
}
function orientationColor(angle, colors) {
    return colors[((Math.round(angle / Math.PI * 64) % 64) + 64) % 64];
}
function drawArrow(ctx, x, y, angle, length) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-length / 2, 0);
    ctx.lineTo(length / 2, 0);
    ctx.moveTo(length / 2 - 5, -3);
    ctx.lineTo(length / 2, 0);
    ctx.lineTo(length / 2 - 5, 3);
    ctx.stroke();
    ctx.restore();
}
function drawFields(ctx, world, theme) {
    const { width: w, height: h, environment: env } = world;
    ctx.save();
    ctx.lineWidth = 1;
    for (let row = 0; row < 3; row++)
        for (let col = 0; col < 4; col++) {
            const x = (col + 0.5) * w / 4, y = (row + 0.5) * h / 3;
            if (env.electric > 0.01) {
                ctx.strokeStyle = alpha(theme.positiveIon, env.electric * 0.28);
                drawArrow(ctx, x, y, -env.electricAngle * Math.PI / 180, 20 + env.electric * 22);
            }
            if (env.magnetic > 0.01) {
                ctx.strokeStyle = alpha(theme.negativeIon, env.magnetic * 0.3);
                if (env.magneticPlane === "in-plane") {
                    ctx.setLineDash([3, 3]);
                    drawArrow(ctx, x + 8, y + 12, -env.magneticAngle * Math.PI / 180, 20 + env.magnetic * 22);
                    ctx.setLineDash([]);
                }
                else {
                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, Math.PI * 2);
                    ctx.stroke();
                    if (env.magneticPlane === "out") {
                        ctx.fillStyle = ctx.strokeStyle;
                        ctx.beginPath();
                        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    else {
                        ctx.beginPath();
                        ctx.moveTo(x - 3, y - 3);
                        ctx.lineTo(x + 3, y + 3);
                        ctx.moveTo(x - 3, y + 3);
                        ctx.lineTo(x + 3, y - 3);
                        ctx.stroke();
                    }
                }
            }
        }
    if (env.electric > 0.01) {
        const e = fieldVector(env.electricAngle), t = Math.min((w / 2 - 8) / Math.max(0.001, Math.abs(e.x)), (h / 2 - 8) / Math.max(0.001, Math.abs(e.y)));
        for (const sign of [-1, 1]) {
            const x = w / 2 + e.x * t * sign, y = h / 2 + e.y * t * sign;
            ctx.strokeStyle = sign < 0 ? theme.positiveIon : theme.negativeIon;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - e.y * 24, y + e.x * 24);
            ctx.lineTo(x + e.y * 24, y - e.x * 24);
            ctx.stroke();
            ctx.font = "bold 12px Arial, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillText(sign < 0 ? "+" : "-", x - e.x * 13 * sign, y - e.y * 13 * sign);
        }
    }
    ctx.restore();
}
export const DEFAULT_DISPLAY = Object.freeze({ mesh: true, directors: false, trails: true, detail: true, wakes: true, polarized: false });
export function renderNematicGame(ctx, world, reducedMotion, display = DEFAULT_DISPLAY, theme = DEFAULT_THEME, transparent = false) {
    const background = theme.sample, rodColors = colorsFor(theme);
    const { width: w, height: h, solidness: solid, rods } = world;
    const line = (a, b) => { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); };
    if (transparent)
        ctx.clearRect(0, 0, w, h);
    else {
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, w, h);
    }
    ctx.save();
    drawFields(ctx, world, theme);
    if (display.wakes && !reducedMotion) {
        ctx.save();
        ctx.lineCap = "round";
        for (const wake of world.wakes) {
            ctx.save();
            ctx.translate(wake.x, wake.y);
            ctx.rotate(wake.angle);
            ctx.strokeStyle = wake.tool === "pull" ? theme.positiveIon : theme.rodHigh;
            ctx.globalAlpha = wake.life * 0.14;
            ctx.lineWidth = 1;
            const size = 15 + (1 - wake.life) * 65;
            ctx.beginPath();
            if (wake.tool === "comb")
                for (const y of [-13, 0, 13]) {
                    ctx.moveTo(-size, y);
                    ctx.lineTo(size, y);
                }
            else if (wake.tool === "swirl")
                for (let i = 0; i < 3; i++) {
                    const angle = i * Math.PI * 2 / 3 + (1 - wake.life) * 2;
                    ctx.moveTo(Math.cos(angle) * size, Math.sin(angle) * size);
                    ctx.arc(0, 0, size, angle, angle + 1.2);
                }
            else
                ctx.arc(0, 0, wake.tool === "pull" ? 80 - size * 0.7 : size, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }
    if (solid > 0.12 && display.mesh) {
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = alpha(theme.rodHigh, solid * 0.22);
        ctx.beginPath();
        rods.forEach((r, i) => {
            for (const j of [i % world.columns < world.columns - 1 ? i + 1 : -1, i + world.columns]) {
                if (j >= 0 && j < rods.length)
                    line(r, rods[j]);
            }
        });
        ctx.stroke();
    }
    if (display.directors) {
        ctx.strokeStyle = alpha(theme.positiveIon, 0.55);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let row = 0; row < 5; row++)
            for (let col = 0; col < 7; col++) {
                const p = { x: (col + 0.5) * w / 7, y: (row + 0.5) * h / 5 };
                let cx = 0, cy = 0, total = 0;
                for (const r of rods) {
                    const d2 = (r.x - p.x) ** 2 + (r.y - p.y) ** 2;
                    if (d2 > 10000)
                        continue;
                    const weight = 1 - d2 / 10000;
                    cx += Math.cos(2 * r.angle) * weight;
                    cy += Math.sin(2 * r.angle) * weight;
                    total += weight;
                }
                if (total < 0.1 || Math.hypot(cx, cy) / total < 0.25)
                    continue;
                const angle = Math.atan2(cy, cx) / 2, dx = Math.cos(angle) * 16, dy = Math.sin(angle) * 16;
                line({ x: p.x - dx, y: p.y - dy }, { x: p.x + dx, y: p.y + dy });
            }
        ctx.stroke();
    }
    const length = Math.max(10, (14 + world.params.rodLength * 30) * Math.min(1, w / 500));
    rods.forEach(r => {
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.angle);
        ctx.lineCap = "round";
        if (display.polarized)
            ctx.globalAlpha = 0.12 + Math.sin(2 * r.angle) ** 2 * 0.88;
        ctx.strokeStyle = orientationColor(r.angle, rodColors);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-length / 2 + 3, 0);
        ctx.lineTo(length / 2 - 3, 0);
        ctx.stroke();
        if (display.detail && length > 16) {
            ctx.strokeStyle = alpha(transparent ? theme.ink : theme.surface, 0.55);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -1.5);
            ctx.lineTo(0, 1.5);
            ctx.stroke();
        }
        ctx.restore();
    });
    world.ions.forEach(ion => {
        const charged = world.environment.charged;
        const color = !charged ? theme.neutralIon : ion.polarity > 0 ? theme.positiveIon : theme.negativeIon;
        if (display.trails && !reducedMotion && ion.trail.length > 1) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ion.trail.forEach((p, i) => { if (i)
                ctx.lineTo(p.x, p.y);
            else
                ctx.moveTo(p.x, p.y); });
            ctx.stroke();
            ctx.restore();
        }
        ctx.save();
        ctx.translate(ion.x, ion.y);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = transparent ? theme.surface : background;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (!charged)
            ctx.ellipse(0, 0, 1.7, 2.7, 0, 0, Math.PI * 2);
        else {
            ctx.moveTo(-2.5, 0);
            ctx.lineTo(2.5, 0);
            if (ion.polarity > 0) {
                ctx.moveTo(0, -2.5);
                ctx.lineTo(0, 2.5);
            }
        }
        ctx.stroke();
        ctx.restore();
    });
    if (!reducedMotion)
        world.rings.forEach(r => {
            ctx.strokeStyle = alpha(theme.rodHigh, r.life * 0.35);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 8 + (1 - r.life) * 80, 0, Math.PI * 2);
            ctx.stroke();
        });
    if (world.pointer.active) {
        ctx.save();
        ctx.translate(world.pointer.x, world.pointer.y);
        ctx.strokeStyle = alpha(theme.rodHigh, 0.6);
        ctx.lineWidth = 1;
        const radius = Math.min(110, w * 0.3);
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.rotate(world.tool === "comb" ? world.brushAngle : world.time * 1.5);
        ctx.beginPath();
        if (world.tool === "swirl") {
            ctx.arc(0, 0, 15, 0.3, Math.PI * 1.8);
            ctx.moveTo(5, -19);
            ctx.lineTo(12, -9);
            ctx.lineTo(20, -16);
        }
        else if (world.tool === "comb") {
            for (const y of [-6, 0, 6]) {
                ctx.moveTo(-14, y);
                ctx.lineTo(14, y);
            }
        }
        else {
            ctx.arc(0, 0, world.pointer.down ? 8 : 4, 0, Math.PI * 2);
            if (world.tool === "pull")
                for (let i = 0; i < 4; i++) {
                    const angle = i * Math.PI / 2;
                    ctx.moveTo(Math.cos(angle) * 22, Math.sin(angle) * 22);
                    ctx.lineTo(Math.cos(angle) * 13, Math.sin(angle) * 13);
                }
        }
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}
