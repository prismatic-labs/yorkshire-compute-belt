/**
 * Circle scaling for the homepage map.
 * Priority for size: max_proposed_mw → grid_connection_mw → phase_1_mw.
 * Undisclosed power → dashed circle sized by land acres.
 * No power and no acres → fixed location marker (still on the map).
 *
 * Map uses sqrt-compressed radius so 5.6 MW remains clickable beside 1 GW.
 * Compare view uses area-true scaling separately.
 */

import type { PowerBlock, Quantity, SiteProperties } from "./types";
import { bestPower } from "./units";

export type CircleMode = "power" | "acreage_undisclosed" | "location_only";

export interface CircleScale {
  mode: CircleMode;
  /** Value used for sizing (MW or acres); 0 for location_only */
  value: number;
  powerKind: ReturnType<typeof bestPower> extends infer B
    ? B extends { kind: infer K }
      ? K
      : null
    : null;
  quantity: Quantity | null;
}

/** Every site with geometry gets a scale — never omit from the map. */
export function circleScale(site: SiteProperties): CircleScale {
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
  return {
    mode: "location_only",
    value: 0,
    powerKind: null,
    quantity: null,
  };
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

  if (scale.mode === "location_only") {
    // Small fixed marker: presence only — do not imply acres or MW
    return minR * 1.15;
  }

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
  if (acres == null) {
    return { r: maxPx * 0.12, mode: "location_only" };
  }
  const area = acres / 435;
  return { r: Math.sqrt(clamp(area, 0.05, 1)) * maxPx * 0.85, mode: "acreage_undisclosed" };
}

/**
 * Status colours from the Okabe–Ito qualitative palette: adjacent pipeline
 * stages use distant hues (not two blues, not red/green alone).
 * Ref: Okabe & Ito, Color Universal Design.
 */
export function statusColour(status: SiteProperties["status"]): string {
  switch (status) {
    case "proposed":
      // Warm stone from the original palette — holds on Positron when hollow/dashed
      // (bright Okabe orange washes out on dashed rings).
      return "#9A8B76";
    case "in_planning":
      return "#CC79A7"; // reddish purple (Okabe–Ito)
    case "approved":
      // Ochre (Okabe–Ito yellow darkened): pale #F0E442 washes out on light basemaps
      return "#B59F00";
    case "under_construction":
      return "#009E73"; // bluish green (Okabe–Ito)
    case "operating":
      return "#0072B2"; // blue (Okabe–Ito)
    case "refused":
      return "#D55E00"; // vermillion (Okabe–Ito)
    case "withdrawn":
      return "#999999"; // grey
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function hasDisclosedPower(power: PowerBlock): boolean {
  return bestPower(power) !== null;
}
