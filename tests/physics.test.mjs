import assert from "node:assert/strict";
import test from "node:test";
import { applyMaterialBrush, axisAlignment, clearGameInput, createNematicGame, DEFAULT_ENVIRONMENT, DEFAULT_MATERIAL, fieldVector, materialMetrics, MATERIAL_PRESETS, resizeNematicGame, rotateIonVelocity, setEnvironmentParameters, setMaterialMode, setMaterialParameters, stepIons, stepNematicGame, stirMaterial } from "../dist/core/nematic-game.js";

function evolve(w, seconds) { for (let i = 0; i < seconds * 60; i++) stepNematicGame(w, 1 / 60); }

test("the material starts live and evolves without a start button or input", () => {
  const w = createNematicGame(800, 550, 42), before = structuredClone(w);
  assert.equal(w.paused, false); evolve(w, 1);
  assert(w.time > 0.99); assert.notDeepEqual(w.rods, before.rods);
  assert.deepEqual(createNematicGame(800, 550, 42), before);
});

test("liquid, nematic and solid modes produce different motion and structure", () => {
  const samples = {};
  for (const [name, params] of Object.entries(MATERIAL_PRESETS)) {
    const w = createNematicGame(800, 550, 42); setMaterialMode(w, name); setMaterialParameters(w, params); evolve(w, 5);
    samples[name] = materialMetrics(w);
  }
  assert(samples.nematic.order > 0.85);
  assert(samples.liquid.order < 0.5);
  assert(samples.solid.latticeError < 3);
  assert(samples.nematic.latticeError > 30);
  assert(samples.liquid.motion > samples.solid.motion * 3);
  assert.equal(samples.solid.phase, "solid");
});

test("heat softens the chosen solid without disabling its lattice", () => {
  const w = createNematicGame(800, 550, 9); setMaterialMode(w, "solid"); setMaterialParameters(w, MATERIAL_PRESETS.solid); evolve(w, 5);
  const cold = materialMetrics(w);
  setMaterialParameters(w, { ...MATERIAL_PRESETS.solid, heat: 1 }); evolve(w, 5);
  const hot = materialMetrics(w);
  assert(hot.latticeError > cold.latticeError * 10);
  assert(hot.motion > cold.motion * 10);
  assert(hot.latticeError < 6);
  assert.equal(hot.phase, "solid");
});

test("crowding changes the particle count and controls clamp to their valid range", () => {
  const w = createNematicGame(800, 550, 3);
  setMaterialParameters(w, { heat: 0.5, density: 0, alignment: 0.5 }); const loose = w.rods.length;
  setMaterialParameters(w, { heat: -2, density: 2, alignment: 4 });
  assert(w.rods.length > loose * 2); assert(w.rods.length <= 420);
  assert.deepEqual(w.params, { ...DEFAULT_MATERIAL, heat: 0, density: 1, alignment: 1 });
  assert(w.rods.every(r => r.ax > 0 && r.ax < w.width && r.ay > 0 && r.ay < w.height));
});

test("crowding thins and refills the whole sample, including a paused solid", () => {
  for (const [width, height] of [[800, 550], [277, 320]]) {
    for (const mode of ["liquid", "nematic", "solid"]) {
      const w = createNematicGame(width, height, 3);
      setMaterialParameters(w, { density: 1 });
      w.rods.forEach(r => { r.x = r.ax; r.y = r.ay; });
      setMaterialMode(w, mode); w.solidness = mode === "solid" ? 1 : 0; w.paused = true;
      for (const density of [0, 0.35, 1, 0.12, 0.8, 0]) {
        setMaterialParameters(w, { density });
        const quadrants = [0, 0, 0, 0];
        for (const r of w.rods) quadrants[Number(r.x >= width / 2) + 2 * Number(r.y >= height / 2)]++;
        const average = w.rods.length / 4;
        assert(quadrants.every(n => n >= average * 0.5 && n <= average * 1.5 + 1),
          `${mode} at ${width}×${height}, crowding ${density}: ${quadrants}`);
        assert(Math.min(...w.rods.map(r => r.y)) < height * 0.3);
        assert(Math.max(...w.rods.map(r => r.y)) > height * 0.7);
        assert.equal(w.mode, mode); assert.equal(w.paused, true);
      }
    }
  }
});

test("other sliders leave rod positions, motion and lattice assignments unchanged", () => {
  const w = createNematicGame(800, 550, 13);
  setMaterialMode(w, "solid"); evolve(w, 3);
  const before = structuredClone(w.rods);
  setMaterialParameters(w, { heat: 0.4, alignment: 0.7, rodLength: 0.9, viscosity: 0.2, repulsion: 0.8, stiffness: 0.4, stirring: 0.7 });
  assert.deepEqual(w.rods, before);
});

test("nematic alignment treats both ends of a rod equally", () => {
  assert.equal(axisAlignment(0, Math.PI), 1); assert.equal(axisAlignment(0, Math.PI / 2), 0);
  const a = createNematicGame(800, 550, 1), b = createNematicGame(800, 550, 1);
  b.rods.forEach(r => { r.angle += Math.PI; });
  stepNematicGame(a, 1 / 60); stepNematicGame(b, 1 / 60);
  a.rods.forEach((r, i) => assert(Math.abs(axisAlignment(r.angle, b.rods[i].angle) - 1) < 1e-10));
});

test("dragging disturbs the sample and an anchored solid returns to its lattice", () => {
  const w = createNematicGame(800, 550, 5); setMaterialMode(w, "solid"); setMaterialParameters(w, MATERIAL_PRESETS.solid); evolve(w, 5);
  const r = w.rods[Math.floor(w.rods.length / 2)];
  stirMaterial(w, { x: r.x, y: r.y }, { x: 30, y: 15 }, true);
  assert(r.vx > 0); evolve(w, 0.3); const disturbed = materialMetrics(w).latticeError;
  evolve(w, 3); assert(materialMetrics(w).latticeError < disturbed);
  for (let i = 0; i < 30; i++) stirMaterial(w, { x: 400, y: 275 }, { x: 0, y: 0 }, true);
  assert(w.rings.length <= 5); evolve(w, 1); assert.equal(w.rings.length, 0);
});

test("pause, resize and resume preserve the selected material", () => {
  const w = createNematicGame(800, 550, 8); setMaterialParameters(w, MATERIAL_PRESETS.liquid); w.paused = true;
  const before = structuredClone(w); stepNematicGame(w, 10); stirMaterial(w, { x: 50, y: 50 }); assert.deepEqual(w, before);
  resizeNematicGame(w, 277, 320); assert.deepEqual(w.params, { ...DEFAULT_MATERIAL, ...MATERIAL_PRESETS.liquid });
  w.pointer.active = true; w.pointer.down = true; clearGameInput(w); assert.equal(w.pointer.down, false);
  w.paused = false; stepNematicGame(w, 1 / 60); assert(w.time > 0);
});

test("continuous parameter changes stay finite and bounded on phone and desktop", () => {
  for (const [width, height] of [[277, 320], [800, 550]]) {
    const w = createNematicGame(width, height, 123), presets = Object.values(MATERIAL_PRESETS);
    for (let i = 0; i < 3600; i++) {
      if (i % 600 === 0) {
        const k = Math.floor(i / 600);
        setMaterialMode(w, ["liquid", "nematic", "solid"][k % 3]);
        setMaterialParameters(w, { ...presets[k % presets.length], rodLength: k % 2, viscosity: (k % 3) / 2,
          repulsion: k % 2, stiffness: (k + 1) % 2, stirring: k % 2 });
        setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, electric: 1, magnetic: 1, magneticPlane: ["in-plane", "out", "into"][k % 3], ions: 1, charged: k % 2 === 0,
          electricResponse: k % 2 ? -1 : 1, magneticResponse: k % 2 ? 1 : -1,
          chargeStrength: k % 2 ? 0.1 : 2, ionMobility: k % 2, screening: (k + 1) % 2 });
      }
      if (i % 100 === 0) stirMaterial(w, { x: width / 2, y: height / 2 }, { x: 15, y: -8 }, true);
      stepNematicGame(w, 1 / 30);
    }
    assert(w.time > 119); assert(w.rods.length <= 420); assert(w.rings.length <= 5);
    assert(w.rods.every(r => Number.isFinite(r.angle) && Number.isFinite(r.x) && Number.isFinite(r.vx) && r.x >= 0 && r.x <= width && r.y >= 0 && r.y <= height));
    assert(w.ions.length <= 96);
    assert(w.ions.every(p => Number.isFinite(p.x) && Number.isFinite(p.vx) && Math.hypot(p.vx, p.vy) <= 300.001 && p.x >= 9 && p.x <= width - 9 && p.y >= 9 && p.y <= height - 9 && p.trail.length <= 24));
  }
});

test("switching structure preserves every material and environment setting", () => {
  const w = createNematicGame(700, 500, 16);
  setMaterialParameters(w, { heat: 0.43, density: 0.72, rodLength: 0.9, viscosity: 0.7, repulsion: 0.2, stiffness: 0.9, stirring: 0.8 });
  setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, electric: 0.8, electricResponse: -0.5, magnetic: 0.4, magneticPlane: "into", ions: 0.6, charged: false, chargeStrength: 1.5, ionMobility: 0.7, screening: 0.6 });
  const parameters = structuredClone(w.params), environment = structuredClone(w.environment), count = w.ions.length;
  for (const mode of ["solid", "liquid", "nematic", "solid"]) {
    setMaterialMode(w, mode); evolve(w, 0.1);
    assert.equal(w.mode, mode); assert.deepEqual(w.params, parameters); assert.deepEqual(w.environment, environment); assert.equal(w.ions.length, count);
  }
});

test("structure modes change the sample while keeping identical slider values", () => {
  const states = {};
  for (const mode of ["liquid", "nematic", "solid"]) {
    const w = createNematicGame(700, 500, 21); setMaterialMode(w, mode); evolve(w, 5);
    assert.deepEqual(w.params, DEFAULT_MATERIAL); states[mode] = materialMetrics(w);
  }
  assert(states.liquid.order < 0.5); assert(states.nematic.order > 0.85); assert(states.solid.latticeError < 3);
});

test("structure switches visibly prepare every mode after parameter edits, even while paused", () => {
  for (const settings of [
    { heat: 1, alignment: 0, viscosity: 1, stiffness: 0, density: 0 },
    { heat: 0, alignment: 1, viscosity: 0, stiffness: 1, density: 1 },
    { heat: 0.61, alignment: 0.21, viscosity: 0.8, stiffness: 0.13, density: 0.45 }
  ]) {
    const w = createNematicGame(700, 500, 93);
    setMaterialParameters(w, { ...settings, rodLength: 1, repulsion: 0.8, stirring: 0.9 });
    setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, electric: 0.9, electricResponse: -0.7,
      magnetic: 0.7, magneticPlane: "out", ions: 0.75, chargeStrength: 1.7, screening: 0.9 });
    w.paused = true;
    const params = structuredClone(w.params), env = structuredClone(w.environment), ions = structuredClone(w.ions), time = w.time;
    for (const mode of ["solid", "liquid", "nematic", "solid"]) {
      const before = w.rods.map(r => [r.x, r.y, r.angle]);
      setMaterialMode(w, mode);
      assert.notDeepEqual(w.rods.map(r => [r.x, r.y, r.angle]), before);
      const m = materialMetrics(w);
      assert.equal(m.phase, mode);
      if (mode === "solid") assert.equal(m.latticeError, 0);
      if (mode === "nematic") assert(m.order > 0.97);
      if (mode === "liquid") assert(m.order < 0.5);
      assert.deepEqual(w.params, params); assert.deepEqual(w.environment, env); assert.deepEqual(w.ions, ions);
      assert.equal(w.paused, true); assert.equal(w.time, time);
    }
  }
});

test("extreme heat and zero extra alignment retain distinct structure dynamics", () => {
  const states = {};
  for (const mode of ["liquid", "nematic", "solid"]) {
    const w = createNematicGame(700, 500, 24);
    setMaterialParameters(w, { heat: 1, alignment: 0, viscosity: 1, stiffness: 0, density: 0 });
    setMaterialMode(w, "liquid"); setMaterialMode(w, mode); evolve(w, 5);
    states[mode] = materialMetrics(w);
  }
  assert(states.liquid.order < 0.4); assert(states.nematic.order > 0.65);
  assert.equal(states.solid.phase, "solid"); assert(states.solid.latticeError < 12);
});

test("lattice stiffness changes recovery without changing the selected structure", () => {
  const displacement = [];
  for (const stiffness of [0, 1]) {
    const w = createNematicGame(700, 500, 22); setMaterialMode(w, "solid");
    setMaterialParameters(w, { heat: 0, stiffness }); setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, ions: 0 });
    const r = w.rods[0]; r.x = r.ax + 20; r.y = r.ay; w.rods = [r]; evolve(w, 0.5);
    displacement.push(Math.abs(r.x - r.ax)); assert.equal(w.mode, "solid");
  }
  assert(displacement[0] > displacement[1] * 2);
});

function ionWorld(environment = {}) {
  const w = createNematicGame(700, 500, 42);
  setMaterialParameters(w, { heat: 0, density: 0, alignment: 0 }); w.rods = [];
  setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, ions: 0, ...environment });
  return w;
}
const ion = (x, y, polarity, vx = 0, vy = 0) => ({ x, y, polarity, vx, vy, trail: [] });

test("electric fields separate charges, reverse with the field and leave neutral tracers alone", () => {
  for (const angle of [0, 180]) {
    const w = ionWorld({ electric: 1, electricAngle: angle });
    w.ions = [ion(350, 220, 1), ion(350, 280, -1)];
    for (let i = 0; i < 60; i++) stepIons(w, 1 / 60);
    const direction = angle === 0 ? 1 : -1;
    assert((w.ions[0].x - 350) * direction > 25);
    assert((w.ions[1].x - 350) * direction < -25);
  }
  const neutral = ionWorld({ electric: 1, magnetic: 1, magneticPlane: "out", charged: false });
  neutral.ions = [ion(350, 220, 1), ion(350, 280, -1)];
  for (let i = 0; i < 60; i++) stepIons(neutral, 1 / 60);
  assert.deepEqual(neutral.ions.map(p => [p.x, p.y, p.vx, p.vy]), [[350, 220, 0, 0], [350, 280, 0, 0]]);
  assert(Math.abs(fieldVector(90).y + 1) < 1e-12);
});

test("magnetic rotation bends velocity without adding energy and reverses with charge", () => {
  const a = rotateIonVelocity(3, 4, 1.2), b = rotateIonVelocity(3, 4, -1.2);
  assert(Math.abs(Math.hypot(a.vx, a.vy) - 5) < 1e-12);
  assert(Math.abs(Math.hypot(b.vx, b.vy) - 5) < 1e-12);
  const still = rotateIonVelocity(0, 0, 10); assert.equal(Math.hypot(still.vx, still.vy), 0);
  for (const polarity of [1, -1]) {
    const w = ionWorld({ magnetic: 1, magneticPlane: "out" }); w.ions = [ion(350, 250, polarity, 30)];
    stepIons(w, 1 / 60); assert((w.ions[0].y - 250) * polarity > 0);
    for (let i = 1; i < 60; i++) stepIons(w, 1 / 60);
    assert(Math.abs(Math.hypot(w.ions[0].vx, w.ions[0].vy) - 30 * Math.exp(-1.1)) < 1e-9);
  }
});

test("through-plane field reversal reverses ion curvature; in-plane B does not curve a 2D path", () => {
  for (const plane of ["in-plane", "out", "into"]) {
    const w = ionWorld({ magnetic: 1, magneticPlane: plane }); w.ions = [ion(350, 250, 1, 30)];
    stepIons(w, 1 / 60);
    if (plane === "in-plane") assert.equal(w.ions[0].y, 250);
    else assert((w.ions[0].y - 250) * (plane === "out" ? 1 : -1) > 0);
  }
});

test("positive rod anisotropy aligns neutral rods with in-plane E or B, independent of ion charging", () => {
  for (const field of ["electric", "magnetic"]) {
    const w = createNematicGame(700, 500, 9);
    setMaterialParameters(w, { heat: 0.05, density: 0.3, alignment: 0.05 });
    setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, [field]: 1, electricAngle: 90, magneticAngle: 90, ions: 0, charged: false });
    evolve(w, 3);
    const alignment = w.rods.reduce((sum, r) => sum + axisAlignment(r.angle, Math.PI / 2), 0) / w.rods.length;
    assert(alignment > 0.95);
  }
});

test("a uniform electric field turns a neutral rod without translating it", () => {
  const w = createNematicGame(700, 500, 9);
  setMaterialParameters(w, { heat: 0, density: 0.3, alignment: 0 });
  const r = { ...w.rods[0], x: 350, y: 250, ax: 350, ay: 250, vx: 0, vy: 0, angle: 0.8 };
  w.rods = [r];
  setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, electric: 1, electricAngle: 90, ions: 0 });
  evolve(w, 3);
  assert.equal(r.x, 350); assert.equal(r.y, 250);
  assert(axisAlignment(r.angle, Math.PI / 2) > 0.999);
});

test("like charges repel and opposite charges attract, with no electrostatics in neutral mode", () => {
  for (const same of [true, false]) {
    const w = ionWorld(); w.ions = [ion(320, 250, 1), ion(380, 250, same ? 1 : -1)];
    stepIons(w, 1 / 60);
    assert(w.ions[0].vx * (same ? -1 : 1) > 0);
    assert(w.ions[1].vx * (same ? 1 : -1) > 0);
  }
});

test("ion amounts stay charge-balanced, survive material changes and can be cleared", () => {
  const w = createNematicGame(700, 500, 9);
  setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, ions: 1, electric: 0.7, charged: false });
  assert.equal(w.ions.length, 96); assert.equal(w.ions.reduce((sum, p) => sum + p.polarity, 0), 0);
  setMaterialParameters(w, MATERIAL_PRESETS.solid); assert.equal(w.environment.electric, 0.7); assert.equal(w.environment.charged, false);
  resizeNematicGame(w, 277, 320); assert.equal(w.ions.length, 96); assert(w.ions.every(p => p.trail.length === 0));
  setEnvironmentParameters(w, { ...w.environment, ions: 0 }); assert.equal(w.ions.length, 0);
});

test("negative field response turns rods across the field", () => {
  for (const field of ["electric", "magnetic"]) {
    const w = createNematicGame(700, 500, 12); setMaterialMode(w, "liquid");
    setMaterialParameters(w, { heat: 0.05 });
    setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, [field]: 1, [`${field}Response`]: -1, electricAngle: 0, magneticAngle: 0, ions: 0 });
    evolve(w, 3);
    assert(w.rods.reduce((sum, r) => sum + axisAlignment(r.angle, Math.PI / 2), 0) / w.rods.length > 0.95);
  }
});

test("damping slows existing rod motion and collision strength changes separation", () => {
  const speeds = [], pushes = [];
  for (const viscosity of [0, 1]) {
    const w = createNematicGame(700, 500, 2); setMaterialMode(w, "liquid");
    setMaterialParameters(w, { heat: 0, viscosity }); setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, ions: 0 });
    w.rods = [{ ...w.rods[0], x: 350, y: 250, vx: 60, vy: 0 }]; evolve(w, 1); speeds.push(Math.abs(w.rods[0].vx));
  }
  assert(speeds[0] > speeds[1] * 10);
  for (const repulsion of [0, 1]) {
    const w = createNematicGame(700, 500, 2); setMaterialMode(w, "liquid");
    setMaterialParameters(w, { heat: 0, repulsion }); setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, ions: 0 });
    w.rods = [{ ...w.rods[0], x: 350, y: 250, vx: 0, vy: 0 }, { ...w.rods[1], x: 362, y: 250, vx: 0, vy: 0 }];
    stepNematicGame(w, 1 / 60); pushes.push(Math.abs(w.rods[0].vx));
  }
  assert(pushes[1] > pushes[0] * 5);
});

test("rod length changes collision spacing and stirring strength changes the impulse", () => {
  const lengths = [], impulses = [];
  for (const rodLength of [0, 1]) {
    const w = createNematicGame(700, 500, 2); setMaterialMode(w, "liquid");
    setMaterialParameters(w, { heat: 0, rodLength }); setEnvironmentParameters(w, { ...DEFAULT_ENVIRONMENT, ions: 0 });
    w.rods = [{ ...w.rods[0], x: 350, y: 250, vx: 0, vy: 0 }, { ...w.rods[1], x: 370, y: 250, vx: 0, vy: 0 }];
    stepNematicGame(w, 1 / 60); lengths.push(Math.abs(w.rods[0].vx));
  }
  assert.equal(lengths[0], 0); assert(lengths[1] > 0);
  for (const stirring of [0, 1]) {
    const w = createNematicGame(700, 500, 2); setMaterialParameters(w, { stirring });
    w.rods = [{ ...w.rods[0], x: 370, y: 250, vx: 0, vy: 0 }];
    stirMaterial(w, { x: 350, y: 250 }, { x: 10, y: 0 }); impulses.push(w.rods[0].vx);
  }
  assert(impulses[1] > impulses[0] * 5);
});

test("charge magnitude, mobility and screening change ion response", () => {
  const charges = [], mobilities = [], screening = [];
  for (const chargeStrength of [0.5, 1.5]) {
    const w = ionWorld({ electric: 1, chargeStrength }); w.ions = [ion(350, 250, 1)];
    for (let i = 0; i < 30; i++) stepIons(w, 1 / 60); charges.push(w.ions[0].x - 350);
  }
  assert(charges[1] > charges[0] * 2.9);
  for (const ionMobility of [0, 1]) {
    const w = ionWorld({ electric: 1, ionMobility }); w.ions = [ion(350, 250, 1)];
    for (let i = 0; i < 120; i++) stepIons(w, 1 / 60); mobilities.push(w.ions[0].x);
  }
  assert(mobilities[1] > mobilities[0] + 80);
  for (const level of [0, 1]) {
    const w = ionWorld({ screening: level }); w.ions = [ion(300, 250, 1), ion(400, 250, 1)];
    stepIons(w, 1 / 60); screening.push(Math.abs(w.ions[0].vx));
  }
  assert(screening[1] < screening[0] * 0.01);
});


test("play brushes have distinct local effects and pause is inert", () => {
  for (const tool of ["swirl", "pull", "comb"]) {
    const w = createNematicGame(400, 300, 12);
    w.rods = [{ x: 225, y: 150, ax: 225, ay: 150, angle: 0.7, vx: 0, vy: 0, tint: 0.5 }];
    w.ions = [{ x: 225, y: 150, vx: 0, vy: 0, polarity: 1, trail: [] }];
    applyMaterialBrush(w, { x: 200, y: 150 }, { x: 10, y: 0 }, tool, 1 / 60);
    if (tool === "swirl") { assert(w.rods[0].vy > 0); assert(w.ions[0].vy > 0); }
    if (tool === "pull") { assert(w.rods[0].vx < 0); assert(w.ions[0].vx < 0); }
    if (tool === "comb") { assert(w.rods[0].angle < 0.7); assert.equal(w.rods[0].vx, 0); }
    w.paused = true; const before = structuredClone(w);
    applyMaterialBrush(w, { x: 200, y: 150 }, { x: 10, y: 0 }, tool, 1, true);
    assert.deepEqual(w, before);
  }
});

test("brush wakes and velocities stay bounded through sustained play and resize", () => {
  const w = createNematicGame(800, 550, 12);
  for (let i = 0; i < 900; i++) {
    const p = { x: 400 + Math.sin(i / 30) * 120, y: 275 + Math.cos(i / 30) * 100 };
    applyMaterialBrush(w, p, { x: 4, y: 3 }, ["stir", "swirl", "pull", "comb"][i % 4], 1 / 60, i % 6 === 0);
    stepNematicGame(w, 1 / 60);
    assert(w.wakes.length <= 24); assert(w.rings.length <= 5);
    assert(w.rods.every(r => Number.isFinite(r.angle) && Math.abs(r.vx) < 300 && Math.abs(r.vy) < 300));
    assert(w.ions.every(ion => ion.trail.length <= 24));
  }
  evolve(w, 1); assert.equal(w.wakes.length, 0);
  applyMaterialBrush(w, { x: 400, y: 275 }, { x: 0, y: 0 }, "swirl", 1 / 60);
  resizeNematicGame(w, 300, 250); assert.equal(w.wakes.length, 0);
});

test("discoveries require actual play, unlock once and preserve sample parameters", () => {
  const w = createNematicGame(400, 300, 21), params = structuredClone(w.params);
  const point = { x: 200, y: 150 };
  for (const tool of ["swirl", "comb"]) for (let i = 0; i < 130; i++) {
    applyMaterialBrush(w, point, { x: 2, y: 0 }, tool, 1 / 60); stepNematicGame(w, 1 / 60);
  }
  assert(w.play.discoveries.includes("vortex")); assert(w.play.discoveries.includes("combed"));
  setEnvironmentParameters(w, { ...w.environment, electric: 0.7, magnetic: 0.5, magneticPlane: "out" });
  evolve(w, 3); assert(w.play.discoveries.includes("crossed"));
  const before = [...w.play.discoveries]; evolve(w, 3); assert.deepEqual(w.play.discoveries, before);
  assert.deepEqual(w.params, params);
  const empty = createNematicGame(400, 300, 21); empty.rods = [];
  for (let i = 0; i < 150; i++) { applyMaterialBrush(empty, point, { x: 0, y: 0 }, "swirl", 1 / 60); stepNematicGame(empty, 1 / 60); }
  assert.equal(empty.play.discoveries.length, 0);
});

test("solid comeback unlocks after a disturbance has actually recovered", () => {
  const w = createNematicGame(400, 300, 7);
  setMaterialMode(w, "solid"); setMaterialParameters(w, { heat: 0.05 }); evolve(w, 2);
  w.pointer.down = true;
  for (let i = 0; i < 30; i++) { applyMaterialBrush(w, { x: 200, y: 150 }, { x: 12, y: 7 }, "stir", 1 / 60); stepNematicGame(w, 1 / 60); }
  assert.equal(w.play.reboundArmed, true); assert(!w.play.discoveries.includes("rebound"));
  w.pointer.down = false; evolve(w, 4); assert(w.play.discoveries.includes("rebound"));
});

test("spatial rod neighbors match the full pairwise forces and torque", () => {
  const w = createNematicGame(800, 550, 44);
  setMaterialParameters(w, { heat: 0 }); w.ions = [];
  const before = structuredClone(w.rods), dt = 1 / 60;
  const expected = before.map((r, i) => {
    let cx = Math.cos(0.7) * 2, cy = Math.sin(0.7) * 2, fx = 0, fy = 0;
    for (let j = 0; j < before.length; j++) {
      if (i === j) continue;
      const b = before[j], dx = b.x - r.x, dy = b.y - r.y, d2 = dx * dx + dy * dy;
      if (d2 > 4900) continue;
      const weight = 1 - d2 / 4900;
      cx += Math.cos(2 * b.angle) * weight; cy += Math.sin(2 * b.angle) * weight;
      const radius = 12 + w.params.rodLength * 12;
      if (d2 < radius * radius && d2 > 0.01) {
        const d = Math.sqrt(d2), push = (1 - d / radius) * (15 + w.params.repulsion * 120) / d;
        fx -= dx * push; fy -= dy * push;
      }
    }
    const angle = r.angle + Math.sin(2 * (Math.atan2(cy, cx) / 2 - r.angle)) * (5 + w.params.alignment * 11) * dt;
    return { angle, vx: fx * dt * Math.exp(-dt * 3), vy: fy * dt * Math.exp(-dt * 3) };
  });
  stepNematicGame(w, dt);
  w.rods.forEach((r, i) => {
    assert(Math.abs(r.vx - expected[i].vx) < 1e-10); assert(Math.abs(r.vy - expected[i].vy) < 1e-10);
    assert(Math.abs(axisAlignment(r.angle, expected[i].angle) - 1) < 1e-10);
  });
});
