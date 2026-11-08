import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NematicLab } from "../dist/react/index.js";
import { resolveOptions, createConfiguredNematicGame, DEFAULT_MATERIAL, DEFAULT_ENVIRONMENT, DEFAULT_THEME, resolveTheme, materialMetrics } from "../dist/core/index.js";

test("the package applies defaults and preserves caller settings", () => {
  const defaults = resolveOptions();
  assert.deepEqual(defaults.material, DEFAULT_MATERIAL);
  assert.deepEqual(defaults.environment, DEFAULT_ENVIRONMENT);
  const options = resolveOptions({ initialMode: "solid", initialMaterial: { heat: 0.1, density: 0.25 }, initialEnvironment: { ions: 0, electric: 0.7 }, initialPaused: true, seed: 7, storageKey: false });
  const first = createConfiguredNematicGame(800, 450, 7, options);
  assert.equal(first.mode, "solid"); assert.equal(first.paused, true);
  assert.equal(first.params.heat, 0.1); assert.equal(first.params.rodLength, DEFAULT_MATERIAL.rodLength);
  assert.equal(first.ions.length, 0); assert.equal(first.environment.electric, 0.7);
  first.params.heat = 0.9;
  const reset = createConfiguredNematicGame(800, 450, 7, options);
  assert.equal(reset.params.heat, 0.1); assert.equal(materialMetrics(reset).latticeError, 0);
  assert.equal(options.storageKey, false);
});

test("invalid numeric options and colors fail before the simulation starts", () => {
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => resolveOptions({ initialMaterial: { heat: value } }), TypeError);
  assert.throws(() => resolveOptions({ seed: -1 }), TypeError);
  assert.throws(() => resolveOptions({ initialMaterial: { heat: "hot" } }), TypeError);
  assert.throws(() => resolveOptions({ initialDisplay: { mesh: "yes" } }), TypeError);
  assert.throws(() => resolveOptions({ storageKey: "" }), TypeError);
  assert.equal(resolveOptions({ initialMaterial: { heat: undefined } }).material.heat, DEFAULT_MATERIAL.heat);
  assert.throws(() => resolveOptions({ initialMode: "gas" }), TypeError);
  assert.throws(() => resolveTheme({ sample: "url(https://example.com)" }), TypeError);
  assert.deepEqual(resolveTheme(), DEFAULT_THEME);
  assert.equal(resolveTheme({ sample: "#172D42" }).rodHigh, DEFAULT_THEME.rodHigh);
  assert.equal(resolveOptions({ initialMaterial: { heat: 9 } }).material.heat, 1);
});

test("two server-rendered instances have unique control IDs and complete labels", () => {
  const html = renderToStaticMarkup(createElement("main", null,
    createElement(NematicLab, { seed: 7, storageKey: false }),
    createElement(NematicLab, { seed: 42, initialMaterial: { heat: 0.1 }, theme: { sample: "#172D42" } })
  ));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/\b(?:for|aria-describedby|aria-labelledby)="([^"]+)"/g)) {
    for (const id of match[1].split(" ")) assert(ids.includes(id), `Missing control target: ${id}`);
  }
  assert(html.includes("--nematic-sample:#172D42"));
  assert(html.includes("Sample controls"));
});
