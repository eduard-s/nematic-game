import type { EnvironmentParameters, MaterialParameters } from "../core/nematic-game.js";
import { brushMultiplier, nominalRodLength, particleCount, particleDragMultiplier, rodDragMultiplier, screeningLength } from "../core/parameter-scales.js";

type Readout = { text: string; spoken?: string };
export type EnvironmentSlider = Exclude<keyof EnvironmentParameters, "charged" | "magneticPlane">;

function level(value: number, low: string, medium: string, high: string) {
  return value < 1 / 3 ? low : value < 2 / 3 ? medium : high;
}

function multiplier(value: number, reference: string): Readout {
  const amount = value.toFixed(2);
  return { text: `${amount}×`, spoken: `${amount} times ${reference}` };
}

function fieldStrength(value: number): Readout {
  return { text: value === 0 ? "Off" : level(value, "Weak", "Medium", "Strong") };
}

function fieldResponse(value: number): Readout {
  if (value === 0) return { text: "None", spoken: "No rod response" };
  const strength = level(Math.abs(value), "Weak", "Medium", "Strong");
  return value > 0
    ? { text: `${strength} along`, spoken: `${strength} response parallel to the field` }
    : { text: `${strength} across`, spoken: `${strength} response perpendicular to the field` };
}

function angle(value: number): Readout {
  const degrees = Math.round(value);
  return { text: `${degrees}°`, spoken: `${degrees} degrees` };
}

export const environmentReadouts: Record<EnvironmentSlider, (value: number) => Readout> = {
  electric: fieldStrength,
  magnetic: fieldStrength,
  electricAngle: angle,
  magneticAngle: angle,
  electricResponse: fieldResponse,
  magneticResponse: fieldResponse,
  ions: value => ({ text: `${particleCount(value)} particles` }),
  chargeStrength: value => multiplier(value, "default ion charge magnitude"),
  ionMobility: value => multiplier(1 / particleDragMultiplier(value), "default particle mobility"),
  screening: value => {
    if (value === 0) return { text: "Unscreened", spoken: "No electrostatic screening" };
    const pixels = Math.round(screeningLength(value));
    return { text: `${pixels} px`, spoken: `${pixels} simulation pixels of screening length` };
  }
};

export const materialReadouts: Record<keyof MaterialParameters, (value: number, count: number) => Readout> = {
  heat: value => ({ text: value === 0 ? "No noise" : level(value, "Cool", "Warm", "Hot") }),
  density: (value, count) => ({ text: count ? `${count} rods` : level(value, "Loose", "Moderate", "Packed") }),
  rodLength: value => {
    const pixels = nominalRodLength(value).toFixed(1);
    return { text: `${pixels} px`, spoken: `${pixels} simulation pixels at full display size` };
  },
  alignment: value => ({ text: value === 0 ? "Base only" : level(value, "Weak", "Medium", "Strong") }),
  viscosity: value => multiplier(rodDragMultiplier(value), "default rod damping"),
  repulsion: value => ({ text: level(value, "Soft", "Firm", "Hard") }),
  stiffness: value => ({ text: level(value, "Flexible", "Firm", "Rigid") }),
  stirring: value => multiplier(brushMultiplier(value), "default brush strength")
};
