/**
 * Circle scaling for the homepage map.
 * Priority for size: max_proposed_mw → grid_connection_mw → phase_1_mw.
 * Undisclosed power → hollow dashed circle sized by land acres.
 *
 * Map uses sqrt-compressed radius so 5.6 MW remains clickable beside 1 GW.
 * Compare view uses area-true scaling separately.
 */

import type { PowerBlock, Quantity, SiteProperties } from "./types";
import { bestPower } from "./units";

export type CircleMode = "power" | "acreage_undisclosed";

export interface CircleScale {
  mode: CircleMode;
  /** Value used for sizing (MW or acres) */
  value: number;
  powerKind: ReturnType<typeof bestPower> extends infer B
    ? B extends { kind: infer K }
      ? K
      : null
    : null;
  quantity: Quantity | null;
}

export function circleScale(site: SiteProperties): CircleScale | null {
  const power = bestPower(site.power);
  if (power) {
    return {
      mode: "power",
      value: power.quantity.value,
      powerKind: power.kind,
      quantity: power.quantity,
    };
  }
  if (site.land.acres) {
    return {
      mode: "acreage_undisclosed",
      value: site.land.acres.value,
      powerKind: null,
      quantity: site.land.acres,
    };
  }
  return null;
}

/** Sqrt-compressed map radius in metres (visual). */
export function mapRadiusMetres(
  scale: CircleScale,
  opts: { minMw?: number; maxMw?: number; minR?: number; maxR?: number } = {},
): number {
  const minMw = opts.minMw ?? 5;
  const maxMw = opts.maxMw ?? 1000;
  const minR = opts.minR ?? 900;
  const maxR = opts.maxR ?? 14000;

  if (scale.mode === "acreage_undisclosed") {
    // Map acreage into a mid band so "not disclosed" reads large but distinct
    const acres = scale.value;
    const t = Math.sqrt(clamp(acres / 435, 0.15, 1));
    return minR + t * (maxR * 0.75 - minR);
  }

  const mw = clamp(scale.value, minMw, maxMw);
  const t = Math.sqrt((mw - minMw) / (maxMw - minMw));
  return minR + t * (maxR - minR);
}

/** Area-true radius for compare view (linear area ∝ MW). */
export function compareRadiusPx(
  mw: number | null,
  acres: number | null,
  opts: { maxMw?: number; maxPx?: number } = {},
): { r: number; mode: CircleMode } {
  const maxMw = opts.maxMw ?? 1000;
  const maxPx = opts.maxPx ?? 120;
  if (mw != null) {
    const area = mw / maxMw;
    return { r: Math.sqrt(area) * maxPx, mode: "power" };
  }
  const a = acres ?? 50;
  const area = a / 435;
  return { r: Math.sqrt(clamp(area, 0.05, 1)) * maxPx * 0.85, mode: "acreage_undisclosed" };
}

export function statusColour(status: SiteProperties["status"]): string {
  switch (status) {
    case "operating":
      return "#1D5DDB";
    case "under_construction":
      return "#3A6FBF";
    case "approved":
      return "#5B7C99";
    case "in_planning":
      return "#8A7355";
    case "proposed":
      return "#9A8B76";
    case "refused":
      return "#8B4A4A";
    case "withdrawn":
      return "#7A7A7A";
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function hasDisclosedPower(power: PowerBlock): boolean {
  return bestPower(power) !== null;
}
