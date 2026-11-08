import { type EnvironmentParameters, type MaterialParameters, type MaterialPhase } from "./nematic-game.js";
import { type MaterialDisplay } from "./nematic-renderer.js";
export type NematicOptions = {
    initialMaterial?: Partial<MaterialParameters>;
    initialEnvironment?: Partial<EnvironmentParameters>;
    initialDisplay?: Partial<MaterialDisplay>;
    initialMode?: MaterialPhase;
    initialPaused?: boolean;
    seed?: number;
    storageKey?: string | false;
};
export declare function resolveOptions(options?: NematicOptions): {
    material: MaterialParameters;
    environment: EnvironmentParameters;
    display: {
        mesh: boolean;
        directors: boolean;
        trails: boolean;
        detail: boolean;
        wakes: boolean;
        polarized: boolean;
    };
    mode: MaterialPhase;
    paused: boolean;
    seed: number | undefined;
    storageKey: string | false;
};
export type ResolvedNematicOptions = ReturnType<typeof resolveOptions>;
export declare function createConfiguredNematicGame(width: number, height: number, seed: number, options: ResolvedNematicOptions): import("./nematic-game.js").NematicGame;
