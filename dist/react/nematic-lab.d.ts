import { type CSSProperties } from "react";
import { materialMetrics } from "../core/nematic-game.js";
import { type NematicOptions } from "../core/options.js";
import { type NematicTheme } from "../core/theme.js";
export type NematicLabProps = NematicOptions & {
    theme?: Partial<NematicTheme>;
    transparentCanvas?: boolean;
    className?: string;
    style?: CSSProperties;
    onMetrics?: (metrics: ReturnType<typeof materialMetrics>) => void;
};
export declare function NematicLab(props?: NematicLabProps): import("react").JSX.Element;
