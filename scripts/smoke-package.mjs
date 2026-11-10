import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const temp = mkdtempSync(join(tmpdir(), "nematic-package-"));
const npm = (args, cwd = temp) => execFileSync("npm", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const node = source => execFileSync(process.execPath, ["--input-type=module", "-e", source], { cwd: temp, encoding: "utf8" });

try {
  assert.equal(manifest.name, "@esmirnov.ai/nematic-game", "Use the public npm package name.");
  const [pack] = JSON.parse(npm(["pack", "--json", "--ignore-scripts", "--pack-destination", temp], root));
  const paths = pack.files.map(({ path }) => path);
  for (const path of [
    "package.json", "README.md", "LICENSE",
    "docs/API.md", "docs/MODEL.md", "docs/DEPLOY.md",
    "dist/core/index.js", "dist/core/index.d.ts",
    "dist/react/index.js", "dist/react/index.d.ts",
    "dist/react/nematic-lab.js", "dist/react/copy.json", "dist/styles.css",
  ]) assert(paths.includes(path), `The package must contain ${path}.`);
  assert(!paths.some(path => /(?:^|\/)(?:node_modules|demo-dist|output|tests|src|scripts|\.git|\.github)(?:\/|$)|\.env(?:\.|$)|\.tgz$/.test(path)), "The package contains development or private files.");
  for (const [name, entry] of Object.entries(manifest.exports)) {
    const targets = typeof entry === "string" ? [entry] : [entry.types, entry.import];
    for (const target of targets) {
      assert.equal(typeof target, "string", `The ${name} export needs its target.`);
      assert(paths.includes(target.replace(/^\.\//, "")), `The ${name} export target is missing from the package.`);
    }
  }
  for (const name of [".", "./core", "./styles.css"]) assert(name in manifest.exports, `The ${name} export is missing.`);
  assert.equal(manifest.main, manifest.exports["."].import);
  assert.equal(manifest.types, manifest.exports["."].types);
  assert(manifest.sideEffects.includes("**/*.css"), "The CSS must remain a side effect.");
  assert.equal(manifest.peerDependenciesMeta?.react?.optional, true, "The headless core must not need React.");
  assert.equal(manifest.peerDependencies?.["react-dom"], undefined, "The component does not import React DOM.");

  writeFileSync(join(temp, "package.json"), JSON.stringify({ private: true, type: "module" }));
  npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", resolve(temp, pack.filename)]);
  const installedRoot = join(temp, "node_modules", "@esmirnov.ai", "nematic-game");
  const installed = JSON.parse(readFileSync(join(installedRoot, "package.json"), "utf8"));
  assert.equal(installed.version, manifest.version);
  const lock = JSON.parse(readFileSync(join(temp, "package-lock.json"), "utf8"));
  assert(!lock.packages["node_modules/react"], "A default headless install must not add React.");
  assert(!lock.packages["node_modules/react-dom"], "A headless install must not add React DOM.");
  for (const path of ["dist/react/index.js", "dist/react/nematic-lab.js"]) {
    assert(/^['"]use client['"];/.test(readFileSync(join(installedRoot, path), "utf8")), `${path} must keep its client directive.`);
  }
  assert(/\.nematic-game\b/.test(readFileSync(join(installedRoot, "dist/styles.css"), "utf8")), "The installed CSS must contain the component styles.");

  const core = JSON.parse(node(`
    import assert from 'node:assert/strict';
    import { fileURLToPath } from 'node:url';
    import { readFileSync } from 'node:fs';
    import { createNematicGame, stepNematicGame, materialMetrics, setMaterialMode, resolveOptions, createConfiguredNematicGame } from '@esmirnov.ai/nematic-game/core';
    const world = createNematicGame(640, 360, 42);
    stepNematicGame(world, 1 / 60);
    assert(world.time > 0);
    assert(world.rods.length > 0);
    assert(world.rods.every(rod => [rod.x, rod.y, rod.vx, rod.vy, rod.angle].every(Number.isFinite)));
    world.paused = true;
    const before = JSON.stringify(world);
    stepNematicGame(world, 1);
    assert.equal(JSON.stringify(world), before);
    setMaterialMode(world, 'solid');
    assert.equal(materialMetrics(world).latticeError, 0);
    const options = resolveOptions({ seed: 7, initialMode: 'liquid', initialEnvironment: { ions: 0 } });
    const configured = createConfiguredNematicGame(640, 360, 7, options);
    assert.equal(configured.mode, 'liquid');
    assert.equal(configured.ions.length, 0);
    const css = fileURLToPath(import.meta.resolve('@esmirnov.ai/nematic-game/styles.css'));
    assert(readFileSync(css, 'utf8').includes('.nematic-game'));
    process.stdout.write(JSON.stringify({ phase: world.mode, rods: world.rods.length, css: true }));
  `));
  assert.equal(core.phase, "solid");
  assert(core.rods > 0 && core.css);

  writeFileSync(join(temp, "core-consumer.mts"), `
    import { createNematicGame, stepNematicGame, type NematicGame, type NematicOptions } from '@esmirnov.ai/nematic-game/core';
    const options: NematicOptions = { initialMode: 'nematic', seed: 42 };
    const world: NematicGame = createNematicGame(640, 360, options.seed ?? 42);
    stepNematicGame(world, 1 / 60);
  `);
  execFileSync(process.execPath, [join(root, "node_modules/typescript/bin/tsc"), "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", "--lib", "ES2022,DOM", "core-consumer.mts"], { cwd: temp, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  console.log("Headless core: clean install, typed imports, physics, and CSS resolution pass without React.");

  for (const version of ["18.3.1", "19.2.6"]) {
    npm(["install", "--ignore-scripts", "--no-audit", "--no-fund", `react@${version}`, `react-dom@${version}`]);
    const markup = node(`
      import assert from 'node:assert/strict';
      import React from 'react';
      import { renderToString } from 'react-dom/server';
      import { NematicLab, NematicGame } from '@esmirnov.ai/nematic-game';
      assert.equal(NematicLab, NematicGame);
      if (${JSON.stringify("./react" in manifest.exports)}) {
        const entry = await import('@esmirnov.ai/nematic-game/react');
        assert.equal(entry.NematicLab, NematicLab);
      }
      process.stdout.write(renderToString(React.createElement(NematicLab, { seed: 42, storageKey: false, transparentCanvas: true })));
    `);
    for (const label of ["Material", "Motion", "Display", "Electric field", "Magnetic field", "Particles", "Readouts", "Things to try"]) {
      assert(markup.includes(label), `React ${version} must render ${label}.`);
    }
    assert(markup.includes("<canvas"));
    assert(markup.includes("<button"));
    console.log(`React ${version}: the installed component renders on the server.`);
  }
  console.log(`Package smoke tests passed. ${paths.length} files, ${pack.size} compressed bytes. Node ${process.versions.node}.`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
