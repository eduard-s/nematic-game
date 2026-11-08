import { type NematicGame } from "./nematic-game.js";
import { type NematicTheme } from "./theme.js";
export type MaterialDisplay = {
    mesh: boolean;
    directors: boolean;
    trails: boolean;
    detail: boolean;
    wakes: boolean;
    polarized: boolean;
};
export declare const DEFAULT_DISPLAY: Readonly<MaterialDisplay>;
export declare function renderNematicGame(ctx: CanvasRenderingContext2D, world: NematicGame, reducedMotion: boolean, display?: MaterialDisplay, theme?: NematicTheme): void;
