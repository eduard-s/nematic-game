export type NematicTheme = {
  surface: string; ink: string; accent: string; controlSurface: string;
  subtleSurface: string; sample: string; rodLow: string; rodHigh: string;
  positiveIon: string; negativeIon: string; neutralIon: string;
};
export const DEFAULT_THEME: Readonly<NematicTheme> = Object.freeze({
  surface: "#DFE5DC", ink: "#303832", accent: "#785448", controlSurface: "#EFF2ED",
  subtleSurface: "#DCE3D8", sample: "#303832", rodLow: "#B9907B", rodHigh: "#B4D2BC",
  positiveIon: "#D3A28B", negativeIon: "#9ECAB3", neutralIon: "#B8C3B5"
});
export function resolveTheme(theme: Partial<NematicTheme> = {}): NematicTheme {
  const result = { ...DEFAULT_THEME, ...theme };
  for (const [key, value] of Object.entries(result)) {
    if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) throw new TypeError(`Theme ${key} needs a six-digit hex color.`);
  }
  return result;
}
export function rgb(hex: string): number[] { return [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16)); }
export function alpha(hex: string, opacity: number) { return `rgba(${rgb(hex).join(",")},${opacity})`; }
