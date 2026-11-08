export type NematicTheme = {
    surface: string;
    ink: string;
    accent: string;
    controlSurface: string;
    subtleSurface: string;
    sample: string;
    rodLow: string;
    rodHigh: string;
    positiveIon: string;
    negativeIon: string;
    neutralIon: string;
};
export declare const DEFAULT_THEME: Readonly<NematicTheme>;
export declare function resolveTheme(theme?: Partial<NematicTheme>): NematicTheme;
export declare function rgb(hex: string): number[];
export declare function alpha(hex: string, opacity: number): string;
