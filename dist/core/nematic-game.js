export const DEFAULT_ENVIRONMENT = Object.freeze({
    electric: 0, electricAngle: 0, magnetic: 0, magneticAngle: 90,
    magneticPlane: "in-plane", ions: 0.25, charged: true,
    electricResponse: 1, magneticResponse: 1, chargeStrength: 1, ionMobility: 0.5, screening: 0
});
export const DEFAULT_MATERIAL = Object.freeze({
    heat: 0.26, density: 0.58, alignment: 0.88, rodLength: 0.5,
    viscosity: 0.35, repulsion: 0.5, stiffness: 0.65, stirring: 0.5
});
export const MATERIAL_PRESETS = {
    liquid: { heat: 0.88, density: 0.3, alignment: 0.12 },
    nematic: { heat: 0.26, density: 0.58, alignment: 0.88 },
    solid: { heat: 0.06, density: 0.94, alignment: 0.88 }
};
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const wrapAngle = (angle) => ((angle % Math.PI) + Math.PI) % Math.PI;
export const axisAlignment = (a, b) => (1 + Math.cos(2 * (a - b))) / 2;
// The UI uses physical compass angles; canvas y points down.
export const fieldVector = (degrees) => ({ x: Math.cos(degrees * Math.PI / 180), y: -Math.sin(degrees * Math.PI / 180) });
// Exact planar magnetic rotation does not add kinetic energy. A positive ion
// moving right bends down when B points out of the screen.
export function rotateIonVelocity(vx, vy, radians) {
    const c = Math.cos(radians), s = Math.sin(radians);
    return { vx: vx * c - vy * s, vy: vx * s + vy * c };
}
export function setEnvironmentParameters(world, next) {
    world.environment = {
        electric: clamp(next.electric, 0, 1), electricAngle: clamp(next.electricAngle, 0, 360),
        magnetic: clamp(next.magnetic, 0, 1), magneticAngle: clamp(next.magneticAngle, 0, 180),
        magneticPlane: ["in-plane", "out", "into"].includes(next.magneticPlane) ? next.magneticPlane : "in-plane",
        ions: clamp(next.ions, 0, 1), charged: !!next.charged,
        electricResponse: clamp(next.electricResponse, -1, 1), magneticResponse: clamp(next.magneticResponse, -1, 1),
        chargeStrength: clamp(next.chargeStrength, 0.1, 2), ionMobility: clamp(next.ionMobility, 0, 1), screening: clamp(next.screening, 0, 1)
    };
    const count = Math.round(world.environment.ions * 48) * 2;
    if (world.ions.length > count)
        world.ions.length = count;
    while (world.ions.length < count)
        world.ions.push({
            x: 22 + random(world) * (world.width - 44), y: 22 + random(world) * (world.height - 44),
            vx: (random(world) - 0.5) * 18, vy: (random(world) - 0.5) * 18,
            polarity: world.ions.length % 2 === 0 ? 1 : -1, trail: []
        });
}
function random(world) {
    world.seed = (Math.imul(world.seed, 1664525) + 1013904223) >>> 0;
    return world.seed / 4294967296;
}
export function solidFraction(_params, mode) {
    return mode === "solid" ? 1 : 0;
}
export function setMaterialMode(world, mode) {
    if (world.mode === mode)
        return;
    world.mode = mode;
    // Structure is an explicit preparation, including while paused. Keep all
    // user parameters, ions and elapsed time; change only the rod arrangement.
    world.solidness = mode === "solid" ? 1 : 0;
    world.rods.forEach(r => {
        if (mode === "solid") {
            r.x = r.ax;
            r.y = r.ay;
            r.vx = 0;
            r.vy = 0;
            r.angle = 0.35 + (random(world) - 0.5) * 0.08;
        }
        else {
            r.x = 22 + random(world) * (world.width - 44);
            r.y = 22 + random(world) * (world.height - 44);
            r.angle = mode === "liquid" ? random(world) * Math.PI : 0.35 + (random(world) - 0.5) * 0.35;
            const motion = mode === "liquid" ? 12 + world.params.heat * 28 : 3 + world.params.heat * 8;
            r.vx = (random(world) - 0.5) * motion;
            r.vy = (random(world) - 0.5) * motion;
        }
    });
    world.rings = [];
    clearGameInput(world);
}
function resizeRodPopulation(world, count, columns) {
    const rows = Math.ceil(count / columns);
    const dx = (world.width - 52) / columns, dy = (world.height - 52) / rows;
    const sites = Array.from({ length: count }, (_, i) => ({
        x: 26 + (i % columns + 0.35 + (Math.floor(i / columns) % 2) * 0.3) * dx,
        y: 26 + (Math.floor(i / columns) + 0.5) * dy
    }));
    const changed = world.rods.length !== count || world.columns !== columns;
    if (changed) {
        const initializing = world.rods.length === 0;
        const assigned = new Array(count);
        if (count < world.rods.length) {
            // Thin across the full area, rather than truncating the row-major array.
            const available = [...world.rods];
            sites.forEach((site, i) => {
                let closest = 0, distance = Infinity;
                available.forEach((rod, j) => {
                    const d = (rod.x - site.x) ** 2 + (rod.y - site.y) ** 2;
                    if (d < distance) {
                        closest = j;
                        distance = d;
                    }
                });
                assigned[i] = available.splice(closest, 1)[0];
            });
        }
        else {
            // Keep existing fluid positions and add rods in the unoccupied regions.
            world.rods.forEach(rod => {
                let closest = 0, distance = Infinity;
                sites.forEach((site, i) => {
                    if (assigned[i])
                        return;
                    const d = (rod.x - site.x) ** 2 + (rod.y - site.y) ** 2;
                    if (d < distance) {
                        closest = i;
                        distance = d;
                    }
                });
                assigned[closest] = rod;
            });
        }
        const anchored = world.solidness > 0.55;
        world.rods = sites.map((site, i) => {
            const rod = assigned[i];
            if (rod) {
                // Expand a solid's lattice immediately, keeping its local disturbances.
                if (anchored) {
                    rod.x = clamp(site.x + rod.x - rod.ax, 14, world.width - 14);
                    rod.y = clamp(site.y + rod.y - rod.ay, 14, world.height - 14);
                }
                return rod;
            }
            const jitter = anchored ? 0 : 0.45;
            const x = initializing ? 22 + random(world) * (world.width - 44) : site.x + (random(world) - 0.5) * dx * jitter;
            const y = initializing ? 22 + random(world) * (world.height - 44) : site.y + (random(world) - 0.5) * dy * jitter;
            return { x, y, angle: random(world) * Math.PI, vx: 0, vy: 0, ax: site.x, ay: site.y, tint: random(world) };
        });
    }
    world.columns = columns;
    world.rods.forEach((r, i) => {
        r.ax = sites[i].x;
        r.ay = sites[i].y;
    });
}
export function setMaterialParameters(world, next) {
    const values = { ...world.params, ...next };
    world.params = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, clamp(value, 0, 1)]));
    const capacity = clamp(Math.round(world.width * world.height / 1000), 75, 420);
    const target = Math.max(24, Math.round(capacity * (0.23 + world.params.density * 0.77)));
    const columns = Math.max(2, Math.round(Math.sqrt(target * world.width / world.height)));
    const rows = Math.max(2, Math.min(Math.floor(capacity / columns), Math.round(target / columns)));
    resizeRodPopulation(world, columns * rows, columns);
}
export function createNematicGame(width, height, seed) {
    const world = {
        width: Math.max(100, width), height: Math.max(100, height), seed: seed >>> 0,
        time: 0, paused: false, params: { ...DEFAULT_MATERIAL }, mode: "nematic", solidness: 0, columns: 1,
        rods: [], environment: { ...DEFAULT_ENVIRONMENT }, ions: [],
        pointer: { x: width / 2, y: height / 2, active: false, down: false }, rings: [],
        tool: "stir", brushAngle: 0, wakes: [],
        play: { swirl: 0, comb: 0, crossed: 0, reboundArmed: false, discoveries: [] }
    };
    setMaterialParameters(world, world.params);
    // The initial sample already has an axis, then continues to evolve on load.
    world.rods.forEach(r => { r.angle = 0.35 + (random(world) - 0.5) * 1.6; });
    setEnvironmentParameters(world, world.environment);
    return world;
}
export function clearGameInput(world) { world.pointer.active = false; world.pointer.down = false; }
export function resizeNematicGame(world, width, height) {
    width = Math.max(100, width);
    height = Math.max(100, height);
    const sx = width / world.width, sy = height / world.height;
    for (const p of [...world.rods, ...world.ions, ...world.rings, world.pointer]) {
        p.x *= sx;
        p.y *= sy;
    }
    world.rods.forEach(r => { r.ax *= sx; r.ay *= sy; });
    world.ions.forEach(ion => { ion.trail = []; });
    world.wakes = [];
    world.width = width;
    world.height = height;
    clearGameInput(world);
    setMaterialParameters(world, world.params);
}
// Input is consumed once per simulation frame, so high-frequency mice cannot
// multiply forces or rendering work. Brushes have a fixed, local footprint.
export function applyMaterialBrush(world, point, delta, tool, seconds, pulse = false) {
    if (world.paused)
        return;
    const dt = clamp(seconds, 0, 1 / 30);
    if (!dt)
        return;
    world.tool = tool;
    if (delta.x * delta.x + delta.y * delta.y > 1)
        world.brushAngle = Math.atan2(delta.y, delta.x);
    if (tool === "stir")
        stirMaterial(world, point, delta, pulse);
    else {
        const radius = Math.min(110, world.width * 0.3), strength = 0.25 + world.params.stirring * 1.5;
        let affected = 0;
        for (const rod of world.rods) {
            const dx = rod.x - point.x, dy = rod.y - point.y, d = Math.hypot(dx, dy);
            if (d >= radius)
                continue;
            const weight = (1 - d / radius) ** 1.3;
            if (tool === "comb") {
                rod.angle = wrapAngle(rod.angle + Math.sin(2 * (world.brushAngle - rod.angle)) * Math.min(0.45, dt * 80 * weight * strength));
            }
            else {
                const force = dt * 600 * weight * strength / Math.max(12, d);
                rod.vx = clamp(rod.vx + (tool === "swirl" ? -dy - dx * 0.35 : -dx) * force, -220, 220);
                rod.vy = clamp(rod.vy + (tool === "swirl" ? dx - dy * 0.35 : -dy) * force, -220, 220);
                const angle = tool === "swirl" ? Math.atan2(dx, -dy) : Math.atan2(-dy, -dx);
                rod.angle = wrapAngle(rod.angle + Math.sin(2 * (angle - rod.angle)) * Math.min(0.45, dt * 60 * weight * strength));
            }
            affected++;
        }
        if (tool !== "comb")
            for (const ion of world.ions) {
                const dx = ion.x - point.x, dy = ion.y - point.y, d = Math.hypot(dx, dy);
                if (d >= radius)
                    continue;
                const force = dt * 500 * (1 - d / radius) ** 1.3 * strength / Math.max(12, d);
                ion.vx = clamp(ion.vx + (tool === "swirl" ? -dy - dx * 0.35 : -dx) * force, -220, 220);
                ion.vy = clamp(ion.vy + (tool === "swirl" ? dx - dy * 0.35 : -dy) * force, -220, 220);
            }
        if (affected > 2 && tool === "swirl")
            world.play.swirl += dt;
        if (affected > 2 && tool === "comb")
            world.play.comb += dt;
    }
    if (world.wakes.length === 0 || world.wakes[world.wakes.length - 1].life < 0.93) {
        world.wakes.push({ ...point, angle: world.brushAngle, life: 1, tool });
        if (world.wakes.length > 24)
            world.wakes.shift();
    }
}
function updateDiscoveries(world, dt) {
    const { play, environment: env } = world;
    const unlock = (id) => { if (!play.discoveries.includes(id))
        play.discoveries.push(id); };
    if (play.swirl >= 2)
        unlock("vortex");
    if (play.comb >= 2)
        unlock("combed");
    if (world.mode === "solid" && !play.discoveries.includes("rebound")) {
        const error = materialMetrics(world).latticeError;
        if (world.pointer.down && error > 3)
            play.reboundArmed = true;
        if (play.reboundArmed && !world.pointer.down && error < 1.2)
            unlock("rebound");
    }
    else
        play.reboundArmed = false;
    const crossed = env.charged && world.ions.length > 0 && env.electric > 0.2 && env.magnetic > 0.2 && env.magneticPlane !== "in-plane";
    play.crossed = crossed ? play.crossed + dt : 0;
    if (play.crossed >= 2)
        unlock("crossed");
}
const scratchByWorld = new WeakMap();
function physicsScratch(world) {
    const count = world.rods.length, cols = Math.ceil(world.width / 70), rows = Math.ceil(world.height / 70);
    let s = scratchByWorld.get(world);
    if (!s || s.cos.length < count || s.heads.length < cols * rows) {
        const capacity = Math.max(count, 420);
        s = { cos: new Float64Array(capacity), sin: new Float64Array(capacity), turns: new Float64Array(capacity), fx: new Float64Array(capacity), fy: new Float64Array(capacity), ionFx: new Float64Array(96), ionFy: new Float64Array(96), heads: new Int32Array(cols * rows), next: new Int32Array(capacity), cols, rows };
        scratchByWorld.set(world, s);
    }
    s.cols = cols;
    s.rows = rows;
    return s;
}
export function stirMaterial(world, point, delta = { x: 0, y: 0 }, pulse = false) {
    if (world.paused)
        return;
    const radius = Math.min(100, world.width * 0.28);
    const strength = 0.25 + world.params.stirring * 1.5;
    if (pulse) {
        world.rings.push({ ...point, life: 1 });
        if (world.rings.length > 5)
            world.rings.shift();
    }
    for (const r of world.rods) {
        const dx = r.x - point.x, dy = r.y - point.y, distance = Math.hypot(dx, dy);
        if (distance >= radius)
            continue;
        const weight = 1 - distance / radius;
        const kick = pulse ? 70 : 0;
        r.vx = clamp(r.vx + (delta.x * 7 + dx / Math.max(1, distance) * kick) * weight * strength, -220, 220);
        r.vy = clamp(r.vy + (delta.y * 7 + dy / Math.max(1, distance) * kick) * weight * strength, -220, 220);
        r.angle = wrapAngle(r.angle + ((delta.x - delta.y) * 0.025 * weight + (pulse ? weight * 0.7 : 0)) * strength);
    }
    for (const ion of world.ions) {
        const dx = ion.x - point.x, dy = ion.y - point.y, d = Math.hypot(dx, dy);
        if (d >= radius)
            continue;
        const weight = 1 - d / radius, kick = pulse ? 60 : 0;
        ion.vx = clamp(ion.vx + (delta.x * 6 + dx / Math.max(d, 1) * kick) * weight * strength, -220, 220);
        ion.vy = clamp(ion.vy + (delta.y * 6 + dy / Math.max(d, 1) * kick) * weight * strength, -220, 220);
    }
}
export function materialMetrics(world) {
    let cx = 0, cy = 0, motion = 0, latticeError = 0;
    for (const r of world.rods) {
        cx += Math.cos(2 * r.angle);
        cy += Math.sin(2 * r.angle);
        motion += r.vx * r.vx + r.vy * r.vy;
        latticeError += (r.x - r.ax) ** 2 + (r.y - r.ay) ** 2;
    }
    const count = Math.max(1, world.rods.length);
    const order = Math.hypot(cx, cy) / count;
    const phase = world.solidness > 0.55 ? "solid" : order > 0.55 ? "nematic" : "liquid";
    const error = Math.sqrt(latticeError / count);
    const director = ((-Math.atan2(cy, cx) / 2 * 180 / Math.PI) % 180 + 180) % 180;
    return { order, director, motion: Math.sqrt(motion / count), latticeError: error, count: world.rods.length, ionCount: world.ions.length, phase, settling: world.solidness > 0.2 && error > 5 };
}
export function stepIons(world, dt) {
    const { ions, environment: env } = world;
    const e = fieldVector(env.electricAngle);
    const normalB = env.magneticPlane === "in-plane" ? 0 : env.magnetic * (env.magneticPlane === "out" ? 1 : -1);
    const { ionFx: fx, ionFy: fy } = physicsScratch(world);
    fx.fill(0);
    fy.fill(0);
    for (let i = 0; i < ions.length; i++) {
        const a = ions[i], q = env.charged ? a.polarity * env.chargeStrength : 0;
        fx[i] += q * env.electric * e.x * 150;
        fy[i] += q * env.electric * e.y * 150;
        for (let j = i + 1; j < ions.length; j++) {
            const b = ions[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
            // Softened electrostatics plus a short-range collision force. Charge can
            // be switched off without removing the tracer particles.
            let force = env.charged ? 2300 * a.polarity * b.polarity * env.chargeStrength ** 2 / Math.pow(d2 + 81, 1.5) : 0;
            if (env.screening > 0) {
                const lambda = (1.05 - env.screening) * 100 / env.screening, scaled = Math.sqrt(d2 + 81) / lambda;
                force *= (1 + scaled) * Math.exp(-scaled);
            }
            if (d < 14 && d > 0.01)
                force += (1 - d / 14) * 180 / d;
            fx[i] += dx * force;
            fy[i] += dy * force;
            fx[j] -= dx * force;
            fy[j] -= dy * force;
        }
        for (const rod of world.rods) {
            const dx = a.x - rod.x, dy = a.y - rod.y, d2 = dx * dx + dy * dy;
            if (d2 > 225 || d2 < 0.01)
                continue;
            const d = Math.sqrt(d2), push = (1 - d / 15) * 90 / d;
            fx[i] += dx * push;
            fy[i] += dy * push;
        }
    }
    const mobilityDrag = 1.1 * Math.exp((0.5 - env.ionMobility) * 3);
    const damping = Math.exp(-dt * (mobilityDrag + world.solidness * 1.8));
    const noise = world.params.heat * 70 * Math.sqrt(dt);
    ions.forEach((ion, i) => {
        const q = env.charged ? ion.polarity * env.chargeStrength : 0;
        const rotated = rotateIonVelocity(ion.vx + fx[i] * dt / 2, ion.vy + fy[i] * dt / 2, q * normalB * dt * 7);
        ion.vx = (rotated.vx + fx[i] * dt / 2 + (random(world) - 0.5) * noise) * damping;
        ion.vy = (rotated.vy + fy[i] * dt / 2 + (random(world) - 0.5) * noise) * damping;
        const speed = Math.hypot(ion.vx, ion.vy);
        if (speed > 300) {
            ion.vx *= 300 / speed;
            ion.vy *= 300 / speed;
        }
        ion.x += ion.vx * dt;
        ion.y += ion.vy * dt;
        if (ion.x < 9 || ion.x > world.width - 9) {
            ion.x = clamp(ion.x, 9, world.width - 9);
            ion.vx *= -0.3;
        }
        if (ion.y < 9 || ion.y > world.height - 9) {
            ion.y = clamp(ion.y, 9, world.height - 9);
            ion.vy *= -0.3;
        }
        ion.trail.push({ x: ion.x, y: ion.y });
        if (ion.trail.length > 24)
            ion.trail.shift();
    });
}
export function stepNematicGame(world, seconds) {
    if (world.paused)
        return;
    const dt = clamp(seconds, 0, 1 / 30);
    if (!dt)
        return;
    world.time += dt;
    world.solidness += (solidFraction(world.params, world.mode) - world.solidness) * (1 - Math.exp(-dt * 2.5));
    world.rings.forEach(r => { r.life -= dt * 1.8; });
    world.rings = world.rings.filter(r => r.life > 0);
    world.wakes.forEach(w => { w.life -= dt * 1.4; });
    // Compact this tiny bounded buffer in place.
    let alive = 0;
    for (const wake of world.wakes)
        if (wake.life > 0)
            world.wakes[alive++] = wake;
    world.wakes.length = alive;
    const rods = world.rods, { heat, alignment } = world.params, solid = world.solidness;
    const { cos, sin, turns, fx: forceX, fy: forceY, heads, next, cols, rows } = physicsScratch(world);
    forceX.fill(0);
    forceY.fill(0);
    heads.fill(-1);
    // A 70px spatial grid preserves the exact interaction radius while skipping
    // distant rods. Linked buckets and force buffers are reused every frame.
    for (let i = 0; i < rods.length; i++) {
        const r = rods[i];
        cos[i] = Math.cos(2 * r.angle);
        sin[i] = Math.sin(2 * r.angle);
        const cell = Math.min(rows - 1, Math.floor(r.y / 70)) * cols + Math.min(cols - 1, Math.floor(r.x / 70));
        next[i] = heads[cell];
        heads[cell] = i;
    }
    for (let i = 0; i < rods.length; i++) {
        const r = rods[i];
        let cx = Math.cos(0.7) * 2, cy = Math.sin(0.7) * 2;
        const col = Math.floor(r.x / 70), row = Math.floor(r.y / 70);
        for (let gy = Math.max(0, row - 1); gy <= Math.min(rows - 1, row + 1); gy++)
            for (let gx = Math.max(0, col - 1); gx <= Math.min(cols - 1, col + 1); gx++)
                for (let j = heads[gy * cols + gx]; j !== -1; j = next[j]) {
                    if (i === j)
                        continue;
                    const dx = rods[j].x - r.x, dy = rods[j].y - r.y, d2 = dx * dx + dy * dy;
                    if (d2 > 4900)
                        continue;
                    const w = 1 - d2 / 4900;
                    cx += cos[j] * w;
                    cy += sin[j] * w;
                    const radius = 12 + world.params.rodLength * 12;
                    if (d2 < radius * radius && d2 > 0.01) {
                        const d = Math.sqrt(d2), push = (1 - d / radius) * (15 + world.params.repulsion * 120) * (1 - solid) / d;
                        forceX[i] -= dx * push;
                        forceY[i] -= dy * push;
                    }
                }
        const target = solid > 0.5 ? 0.35 : Math.atan2(cy, cx) / 2;
        // The structure supplies the base interaction; the slider strengthens it.
        turns[i] = Math.sin(2 * (target - r.angle)) * ((world.mode === "liquid" || rods.length === 1 ? 0 : 5 + alignment * 11) + solid * 4);
        // Signed responses select parallel or perpendicular alignment of apolar rods.
        const env = world.environment;
        turns[i] += env.electricResponse * env.electric ** 2 * 22 * Math.sin(2 * (-env.electricAngle * Math.PI / 180 - r.angle));
        if (env.magneticPlane === "in-plane")
            turns[i] += env.magneticResponse * env.magnetic ** 2 * 22 * Math.sin(2 * (-env.magneticAngle * Math.PI / 180 - r.angle));
    }
    const noise = Math.pow(heat, 1.15) * (world.mode === "liquid" ? 12 : 5), rootDt = Math.sqrt(dt);
    const dragFactor = Math.exp((world.params.viscosity - 0.35) * 2);
    const angularMobility = 1 / dragFactor;
    const damping = Math.exp(-dt * (3 * dragFactor + solid * 12));
    rods.forEach((r, i) => {
        r.angle = wrapAngle(r.angle + turns[i] * dt * angularMobility + (random(world) - 0.5) * noise * rootDt * Math.sqrt(angularMobility));
        // Heat softens the chosen solid without silently switching off its lattice.
        const spring = (8 + world.params.stiffness * 60) * (1 - heat * 0.65);
        r.vx += (forceX[i] + (r.ax - r.x) * solid * spring) * dt + (random(world) - 0.5) * heat * 160 * rootDt * Math.sqrt(dragFactor);
        r.vy += (forceY[i] + (r.ay - r.y) * solid * spring) * dt + (random(world) - 0.5) * heat * 160 * rootDt * Math.sqrt(dragFactor);
        r.vx *= damping;
        r.vy *= damping;
        // Neutral rods translate through thermal motion, collisions and stirring.
        // Uniform fields apply torque, without self-propelling rods into the walls.
        r.x += r.vx * dt;
        r.y += r.vy * dt;
        if (r.x < 14 || r.x > world.width - 14) {
            r.x = clamp(r.x, 14, world.width - 14);
            r.vx *= -0.5;
        }
        if (r.y < 14 || r.y > world.height - 14) {
            r.y = clamp(r.y, 14, world.height - 14);
            r.vy *= -0.5;
        }
    });
    stepIons(world, dt);
    updateDiscoveries(world, dt);
}
