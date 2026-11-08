import { createNematicGame, DEFAULT_ENVIRONMENT, DEFAULT_MATERIAL, setEnvironmentParameters, setMaterialMode, setMaterialParameters, type EnvironmentParameters, type MaterialParameters, type MaterialPhase } from "./nematic-game.js";
import { DEFAULT_DISPLAY, type MaterialDisplay } from "./nematic-renderer.js";
export type NematicOptions = {
  initialMaterial?: Partial<MaterialParameters>;
  initialEnvironment?: Partial<EnvironmentParameters>;
  initialDisplay?: Partial<MaterialDisplay>;
  initialMode?: MaterialPhase;
  initialPaused?: boolean;
  seed?: number;
  storageKey?: string | false;
};
export function resolveOptions(options: NematicOptions = {}) {
  for (const [group, baseline] of [[options.initialMaterial, DEFAULT_MATERIAL], [options.initialEnvironment, DEFAULT_ENVIRONMENT], [options.initialDisplay, DEFAULT_DISPLAY]] as const) {
    for (const [key, value] of Object.entries(group ?? {})) {
      if (value === undefined) continue;
      const expected = (baseline as Record<string, unknown>)[key];
      if (expected === undefined || typeof value !== typeof expected || (typeof value === "number" && !Number.isFinite(value))) throw new TypeError(`${key} has an invalid value.`);
    }
  }
  if (options.initialPaused !== undefined && typeof options.initialPaused !== "boolean") throw new TypeError("initialPaused needs a Boolean.");
  if (options.storageKey !== undefined && options.storageKey !== false && (typeof options.storageKey !== "string" || !options.storageKey.trim())) throw new TypeError("storageKey needs a nonempty string or false.");
  const defined = <T extends object>(group: T | undefined) => Object.fromEntries(Object.entries(group ?? {}).filter(([, value]) => value !== undefined));
  if (options.seed !== undefined && (!Number.isInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff)) throw new TypeError("The seed needs an unsigned 32-bit integer.");
  const mode = options.initialMode ?? "nematic";
  if (!["liquid", "nematic", "solid"].includes(mode)) throw new TypeError("The initial mode is not valid.");
  // Use the engine limits for both the initial controls and the reset state.
  const probe = createNematicGame(100, 100, 0);
  setMaterialParameters(probe, { ...DEFAULT_MATERIAL, ...defined(options.initialMaterial) });
  setEnvironmentParameters(probe, { ...DEFAULT_ENVIRONMENT, ...defined(options.initialEnvironment) });
  return { material: probe.params, environment: probe.environment, display: { ...DEFAULT_DISPLAY, ...defined(options.initialDisplay) }, mode,
    paused: options.initialPaused ?? false, seed: options.seed, storageKey: options.storageKey ?? "nematic-game-discoveries-v1" };
}
export type ResolvedNematicOptions = ReturnType<typeof resolveOptions>;
export function createConfiguredNematicGame(width: number, height: number, seed: number, options: ResolvedNematicOptions) {
  const world = createNematicGame(width, height, seed);
  setMaterialParameters(world, options.material);
  setEnvironmentParameters(world, options.environment);
  setMaterialMode(world, options.mode);
  world.paused = options.paused;
  return world;
}
