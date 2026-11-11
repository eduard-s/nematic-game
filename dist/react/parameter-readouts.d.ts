import type { EnvironmentParameters, MaterialParameters } from "../core/nematic-game.js";
type Readout = {
    text: string;
    spoken?: string;
};
export type EnvironmentSlider = Exclude<keyof EnvironmentParameters, "charged" | "magneticPlane">;
export declare const environmentReadouts: Record<EnvironmentSlider, (value: number) => Readout>;
export declare const materialReadouts: Record<keyof MaterialParameters, (value: number, count: number) => Readout>;
export {};
