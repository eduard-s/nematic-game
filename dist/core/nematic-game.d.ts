export type Point = {
    x: number;
    y: number;
};
export type MaterialParameters = {
    heat: number;
    density: number;
    alignment: number;
    rodLength: number;
    viscosity: number;
    repulsion: number;
    stiffness: number;
    stirring: number;
};
export type MaterialPhase = "liquid" | "nematic" | "solid";
export type MaterialTool = "stir" | "swirl" | "pull" | "comb";
export type Discovery = "vortex" | "combed" | "rebound" | "crossed";
export type MagneticPlane = "in-plane" | "out" | "into";
export type EnvironmentParameters = {
    electric: number;
    electricAngle: number;
    magnetic: number;
    magneticAngle: number;
    magneticPlane: MagneticPlane;
    ions: number;
    charged: boolean;
    electricResponse: number;
    magneticResponse: number;
    chargeStrength: number;
    ionMobility: number;
    screening: number;
};
export type Ion = Point & {
    vx: number;
    vy: number;
    polarity: 1 | -1;
    trail: Point[];
};
export type Molecule = Point & {
    angle: number;
    vx: number;
    vy: number;
    ax: number;
    ay: number;
    tint: number;
};
export type NematicGame = {
    width: number;
    height: number;
    time: number;
    paused: boolean;
    seed: number;
    params: MaterialParameters;
    mode: MaterialPhase;
    solidness: number;
    columns: number;
    rods: Molecule[];
    environment: EnvironmentParameters;
    ions: Ion[];
    pointer: Point & {
        active: boolean;
        down: boolean;
    };
    rings: (Point & {
        life: number;
    })[];
    tool: MaterialTool;
    brushAngle: number;
    wakes: (Point & {
        angle: number;
        life: number;
        tool: MaterialTool;
    })[];
    play: {
        swirl: number;
        comb: number;
        crossed: number;
        reboundArmed: boolean;
        discoveries: Discovery[];
    };
};
export declare const DEFAULT_ENVIRONMENT: Readonly<EnvironmentParameters>;
export declare const DEFAULT_MATERIAL: Readonly<MaterialParameters>;
export declare const MATERIAL_PRESETS: Record<MaterialPhase, Pick<MaterialParameters, "heat" | "density" | "alignment">>;
export declare const axisAlignment: (a: number, b: number) => number;
export declare const fieldVector: (degrees: number) => {
    x: number;
    y: number;
};
export declare function rotateIonVelocity(vx: number, vy: number, radians: number): {
    vx: number;
    vy: number;
};
export declare function setEnvironmentParameters(world: NematicGame, next: EnvironmentParameters): void;
export declare function solidFraction(_params: MaterialParameters, mode: MaterialPhase): 1 | 0;
export declare function setMaterialMode(world: NematicGame, mode: MaterialPhase): void;
export declare function setMaterialParameters(world: NematicGame, next: Partial<MaterialParameters>): void;
export declare function createNematicGame(width: number, height: number, seed: number): NematicGame;
export declare function clearGameInput(world: NematicGame): void;
export declare function resizeNematicGame(world: NematicGame, width: number, height: number): void;
export declare function applyMaterialBrush(world: NematicGame, point: Point, delta: Point, tool: MaterialTool, seconds: number, pulse?: boolean): void;
export declare function stirMaterial(world: NematicGame, point: Point, delta?: Point, pulse?: boolean): void;
export declare function materialMetrics(world: NematicGame): {
    order: number;
    director: number;
    motion: number;
    latticeError: number;
    count: number;
    ionCount: number;
    phase: MaterialPhase;
    settling: boolean;
};
export declare function stepIons(world: NematicGame, dt: number): void;
export declare function stepNematicGame(world: NematicGame, seconds: number): void;
