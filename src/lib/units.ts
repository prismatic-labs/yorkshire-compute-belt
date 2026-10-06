/**
 * Translation layer: capacity ≠ consumption.
 *
 * Three quantities:
 * 1. Nameplate / contracted capacity (what documents state) → power-to-power only
 * 2. Assumed average load = nameplate × load-factor range → energy comparisons as ranges
 * 3. Measured energy (if ever reported) → supersedes assumptions
 *
 * No operator on this map discloses expected load factor, so energy figures are bounded, not known.
 */

import type { Basis, BestPower, PowerBlock, PowerKind, Quantity } from "./types";

/** Instantaneous kettle power — UK domestic, clean power-to-power unit. */
export const KETTLE_KW = 3;

/**
 * Default load-factor range for energy derivations.
 * Literature on hyperscale utilisation commonly cites ~40–70% range for IT load vs nameplate;
 * cited for transparency, not as site-specific knowledge.
 * @see Lawrence Berkeley / IEA data-centre load discussions; NESO FES framing of connected vs draw.
 */
export const LOAD_FACTOR = {
  low: 0.4,
  high: 0.7,
  source:
    "Published data-centre literature band (about 40-70% utilisation of nameplate). No operator on this map discloses an expected load factor.",
} as const;

/** Ofgem typical domestic electricity use (Great Britain), cited for homes equivalence. */
export const HOME_KWH_PER_YEAR = {
  value: 2700,
  source:
    "Ofgem and Department for Energy Security and Net Zero (DESNZ) typical domestic electricity consumption figure used in UK comparisons",
} as const;

/** Yorkshire Water per-capita domestic water use (litres/day) — cited for water equivalence. */
export const WATER_LITRES_PER_PERSON_PER_DAY = {
  value: 141,
  source: "Yorkshire Water reported average per-capita domestic use (litres/person/day)",
} as const;

export const OLYMPIC_POOL_LITRES = 2_500_000;

/** FA football pitch ≈ 1.76 acres (105 × 68 m). */
export const ACRES_PER_FOOTBALL_PITCH = 1.76;

/**
 * Indicative UK winter wheat yield (tonnes/ha/year) for BMV arable —
 * only used where ALC grades support a yield comparison (Elsham: grades 1–3a present).
 * Range reflects yield variability; not a site soil survey.
 */
export const WHEAT_TONNES_PER_HA = {
  low: 7,
  high: 10,
  source: "UK winter wheat yield band for productive arable (Defra / AHDB indicative range)",
} as const;

export const ACRES_PER_HECTARE = 2.47105;

export const HOURS_PER_YEAR = 8760;

export interface Range {
  low: number;
  high: number;
}

export interface EquivalenceMeta {
  powerKind: PowerKind | null;
  powerBasis: Basis | null;
  quantity: "nameplate" | "assumed_average_load" | "measured";
  assumptions: string[];
  sources: string[];
  weakestBasis: Basis | null;
}

export interface Equivalence<T> {
  value: T;
  meta: EquivalenceMeta;
  label: string;
}

const POWER_PRIORITY: PowerKind[] = [
  "max_proposed_mw",
  "grid_connection_mw",
  "phase_1_mw",
];

const BASIS_WEAKNESS: Record<Basis, number> = {
  measured: 0,
  planning_doc: 1,
  stated: 2,
  estimated: 3,
};

export function weakestBasis(...bases: Array<Basis | null | undefined>): Basis | null {
  const present = bases.filter((b): b is Basis => Boolean(b));
  if (present.length === 0) return null;
  return present.reduce((a, b) =>
    BASIS_WEAKNESS[a] >= BASIS_WEAKNESS[b] ? a : b,
  );
}

/** Best available power figure for map/compare scaling and equivalences. */
export function bestPower(power: PowerBlock): BestPower | null {
  for (const kind of POWER_PRIORITY) {
    const q = power[kind];
    if (q && typeof q.value === "number") {
      return { kind, quantity: q };
    }
  }
  // it_load only if nothing else — not in map priority, but usable for dossiers
  if (power.it_load_mw) {
    return { kind: "it_load_mw", quantity: power.it_load_mw };
  }
  return null;
}

export function nameplateMw(power: PowerBlock): { mw: number; kind: PowerKind; basis: Basis } | null {
  const best = bestPower(power);
  if (!best) return null;
  return { mw: best.quantity.value, kind: best.kind, basis: best.quantity.basis };
}

/** Power-to-power: continuous kettles at the stated nameplate (not energy). */
export function toKettles(nameplateMw: number): number {
  return (nameplateMw * 1000) / KETTLE_KW;
}

export function kettleEquivalence(
  power: PowerBlock,
): Equivalence<number> | null {
  const np = nameplateMw(power);
  if (!np) return null;
  const kettles = toKettles(np.mw);
  return {
    value: kettles,
    label: `${formatNumber(kettles)} kettles running at once (at ${powerKindLabel(np.kind)}; power size, not annual use)`,
    meta: {
      powerKind: np.kind,
      powerBasis: np.basis,
      quantity: "nameplate",
      assumptions: [
        `Nameplate ${np.mw} MW treated as continuous power for a power-to-power comparison only.`,
        `One kettle = ${KETTLE_KW} kW.`,
      ],
      sources: [`Kettle rating: ${KETTLE_KW} kW (UK domestic standard used site-wide)`],
      weakestBasis: np.basis,
    },
  };
}

/** Annual energy (GWh/year) at load-factor range applied to nameplate. */
export function assumedAnnualGwh(nameplateMw: number): Range {
  return {
    low: nameplateMw * HOURS_PER_YEAR * LOAD_FACTOR.low / 1000,
    high: nameplateMw * HOURS_PER_YEAR * LOAD_FACTOR.high / 1000,
  };
}

export function homesEquivalence(power: PowerBlock): Equivalence<Range> | null {
  const np = nameplateMw(power);
  if (!np) return null;
  const gwh = assumedAnnualGwh(np.mw);
  const kwhLow = gwh.low * 1_000_000;
  const kwhHigh = gwh.high * 1_000_000;
  const homes: Range = {
    low: kwhLow / HOME_KWH_PER_YEAR.value,
    high: kwhHigh / HOME_KWH_PER_YEAR.value,
  };
  return {
    value: homes,
    label: `${formatRange(homes)} homes' annual electricity (at ${pct(LOAD_FACTOR.low)}-${pct(LOAD_FACTOR.high)} load factor)`,
    meta: {
      powerKind: np.kind,
      powerBasis: np.basis,
      quantity: "assumed_average_load",
      assumptions: [
        `Uses ${powerKindLabel(np.kind)} = ${np.mw} MW.`,
        `Assumed average load = nameplate × ${pct(LOAD_FACTOR.low)}-${pct(LOAD_FACTOR.high)}.`,
        `Home use = ${HOME_KWH_PER_YEAR.value} kilowatt-hours/year.`,
        "No operator discloses load factor; this is a bound, not a measurement.",
      ],
      sources: [LOAD_FACTOR.source, HOME_KWH_PER_YEAR.source],
      weakestBasis: weakestBasis(np.basis, "estimated"),
    },
  };
}

export interface LocalGeoMatch {
  lowLabel: string;
  highLabel: string;
  lowGwh: number;
  highGwh: number;
  authoritiesUsedLow: string[];
  authoritiesUsedHigh: string[];
}

/**
 * Match assumed annual energy against cumulative DESNZ LA totals (ascending).
 * Returns descriptive geography at low and high ends of the load-factor range.
 */
export function localGeographyEquivalence(
  power: PowerBlock,
  authorities: Array<{ name: string; total_gwh: number }>,
): Equivalence<LocalGeoMatch> | null {
  const np = nameplateMw(power);
  if (!np) return null;
  const gwh = assumedAnnualGwh(np.mw);
  const sorted = [...authorities].sort((a, b) => a.total_gwh - b.total_gwh);
  const low = matchAuthorities(gwh.low, sorted);
  const high = matchAuthorities(gwh.high, sorted);
  const smallest = sorted[0];
  const bothBelowSmallest =
    smallest !== undefined && gwh.high < smallest.total_gwh;
  const match: LocalGeoMatch = {
    lowLabel: low.label,
    highLabel: high.label,
    lowGwh: gwh.low,
    highGwh: gwh.high,
    authoritiesUsedLow: low.names,
    authoritiesUsedHigh: high.names,
  };
  return {
    value: match,
    label: bothBelowSmallest
      ? `At ${pct(LOAD_FACTOR.low)}-${pct(LOAD_FACTOR.high)} load factor: about ${shareRange(gwh.low / smallest.total_gwh, gwh.high / smallest.total_gwh)} of ${smallest.name}'s annual electricity (the smallest council area listed)`
      : `At ${pct(LOAD_FACTOR.low)}-${pct(LOAD_FACTOR.high)} load factor: about ${match.lowLabel} to ${match.highLabel} (annual electricity)`,
    meta: {
      powerKind: np.kind,
      powerBasis: np.basis,
      quantity: "assumed_average_load",
      assumptions: [
        `Uses ${powerKindLabel(np.kind)} = ${np.mw} MW.`,
        `Energy = MW × ${HOURS_PER_YEAR} h × load factor / 1000 → GWh/year.`,
        "Compared to Department for Energy Security and Net Zero local-authority total metered electricity (all sectors).",
        "No operator discloses load factor; this is a bound, not a measurement.",
      ],
      sources: [
        LOAD_FACTOR.source,
        "Department for Energy Security and Net Zero subnational electricity consumption statistics (local authority)",
      ],
      weakestBasis: weakestBasis(np.basis, "estimated"),
    },
  };
}

function matchAuthorities(
  targetGwh: number,
  sortedAsc: Array<{ name: string; total_gwh: number }>,
): { label: string; names: string[] } {
  if (sortedAsc.length === 0) return { label: "no local data", names: [] };
  let cum = 0;
  const names: string[] = [];
  for (const a of sortedAsc) {
    cum += a.total_gwh;
    names.push(a.name);
    if (cum >= targetGwh) {
      if (names.length === 1) {
        return {
          label:
            targetGwh < a.total_gwh
              ? `${sharePct(targetGwh / a.total_gwh)} of ${a.name}`
              : a.name,
          names,
        };
      }
      return {
        label: `${names[0]} + ${names.length - 1} further ${names.length === 2 ? "authority" : "authorities"} (to ${names[names.length - 1]})`,
        names,
      };
    }
  }
  return {
    label: `all listed authorities combined (${formatNumber(cum)} gigawatt-hours), still below ${formatNumber(targetGwh)} gigawatt-hours`,
    names: sortedAsc.map((a) => a.name),
  };
}

/** Table / summary label for annual water (litres/year quantity). */
export function formatWaterUse(waterLitresPa: Quantity | null): string {
  if (!waterLitresPa) return "Not disclosed";
  if (waterLitresPa.value === 0) return "Zero claimed";
  return `${formatNumber(waterLitresPa.value)} litres/year`;
}

export function waterResidentsEquivalence(
  waterLitresPa: Quantity | null,
): Equivalence<number | null> {
  if (!waterLitresPa) {
    return {
      value: null,
      label: "Water use: not disclosed",
      meta: {
        powerKind: null,
        powerBasis: null,
        quantity: "measured",
        assumptions: [],
        sources: [],
        weakestBasis: null,
      },
    };
  }
  if (waterLitresPa.value === 0) {
    return {
      value: 0,
      label: "Operator claims zero water use (closed-loop cooling; not independently verified)",
      meta: {
        powerKind: null,
        powerBasis: waterLitresPa.basis,
        quantity: "measured",
        assumptions: [
          "Recorded as 0 litres/year because the operator claims water use is eliminated.",
          "This is a stated claim, not a metered figure.",
        ],
        sources: [waterLitresPa.source],
        weakestBasis: waterLitresPa.basis,
      },
    };
  }
  const litresPerDay = waterLitresPa.value / 365;
  const residents = litresPerDay / WATER_LITRES_PER_PERSON_PER_DAY.value;
  const pools = waterLitresPa.value / OLYMPIC_POOL_LITRES;
  return {
    value: residents,
    label: `${formatNumber(residents)} people's daily water use (also ≈ ${formatNumber(pools)} Olympic pools/year)`,
    meta: {
      powerKind: null,
      powerBasis: waterLitresPa.basis,
      quantity: "measured",
      assumptions: [
        `Annual water ${formatNumber(waterLitresPa.value)} litres ÷ 365 ÷ ${WATER_LITRES_PER_PERSON_PER_DAY.value} L/person/day.`,
        `Olympic pool = ${formatNumber(OLYMPIC_POOL_LITRES)} litres (secondary unit).`,
      ],
      sources: [waterLitresPa.source, WATER_LITRES_PER_PERSON_PER_DAY.source],
      weakestBasis: waterLitresPa.basis,
    },
  };
}

export function footballPitchesEquivalence(
  acres: Quantity | null,
): Equivalence<number> | null {
  if (!acres) return null;
  const pitches = acres.value / ACRES_PER_FOOTBALL_PITCH;
  return {
    value: pitches,
    label: `${formatNumber(pitches)} football pitches`,
    meta: {
      powerKind: null,
      powerBasis: acres.basis,
      quantity: "nameplate",
      assumptions: [
        `1 football pitch ≈ ${ACRES_PER_FOOTBALL_PITCH} acres (FA 105×68 m).`,
      ],
      sources: [acres.source],
      weakestBasis: acres.basis,
    },
  };
}

/** Sum of grades 1, 2 and 3a hectares from an ALC note such as "Grade 1: 33.4 ha; Grade 2: 49.2 ha; …". */
export function bmvHectares(alcGrades: string | null | undefined): number | null {
  if (!alcGrades) return null;
  let total = 0;
  let found = false;
  for (const m of alcGrades.matchAll(/Grade (1|2|3a):\s*([\d,]*\d(?:\.\d+)?)\s*ha/gi)) {
    const value = Number(m[2]!.replace(/,/g, ""));
    if (!Number.isFinite(value)) continue;
    total += value;
    found = true;
  }
  return found ? total : null;
}

export function wheatForegoneEquivalence(
  acres: Quantity | null,
  opts: { alcSupportsYield: boolean; bmvHectares?: number | null },
): Equivalence<Range> | null {
  if (!acres || !opts.alcSupportsYield) return null;
  const ha = opts.bmvHectares ?? acres.value / ACRES_PER_HECTARE;
  const tonnes: Range = {
    low: ha * WHEAT_TONNES_PER_HA.low,
    high: ha * WHEAT_TONNES_PER_HA.high,
  };
  return {
    value: tonnes,
    label: `${formatRange(tonnes)} tonnes/year of winter wheat (indicative, best and most versatile arable)`,
    meta: {
      powerKind: null,
      powerBasis: acres.basis,
      quantity: "assumed_average_load",
      assumptions: [
        opts.bmvHectares != null
          ? `Best and most versatile farmland (grades 1, 2 and 3a) only: ${formatNumber(ha, 1)} hectares of the ${acres.value}-acre site.`
          : `Site area ${acres.value} acres → ${formatNumber(ha)} hectares.`,
        `Yield ${WHEAT_TONNES_PER_HA.low}-${WHEAT_TONNES_PER_HA.high} tonnes per hectare (indicative; not a site soil survey).`,
        "Only shown where Agricultural Land Classification grades include best and most versatile farmland supporting a yield comparison.",
      ],
      sources: [acres.source, WHEAT_TONNES_PER_HA.source],
      weakestBasis: weakestBasis(acres.basis, "estimated"),
    },
  };
}

/** Drax biomass context — pellet tonnes and forestry hectares as ranges; no tree counts in v0. */
export function draxBiomassContext(opts: {
  pelletsMtPerYear: Range;
  hectaresPerMt: Range;
}): Equivalence<{ pelletsMt: Range; forestryHa: Range }> {
  const forestryHa: Range = {
    low: opts.pelletsMtPerYear.low * opts.hectaresPerMt.low,
    high: opts.pelletsMtPerYear.high * opts.hectaresPerMt.high,
  };
  return {
    value: { pelletsMt: opts.pelletsMtPerYear, forestryHa },
    label: `${formatRange(opts.pelletsMtPerYear)} Mt pellets/year; forestry land ≈ ${formatRange(forestryHa)} ha (range; not site-specific to a data hall)`,
    meta: {
      powerKind: null,
      powerBasis: "stated",
      quantity: "assumed_average_load",
      assumptions: [
        "Plant-level biomass burn rates, not attributed 1:1 to a proposed data hall.",
        "Forestry hectare factors are literature ranges; tree counts are omitted in this version.",
      ],
      sources: [
        "Operator / reporting figures for Drax pellet throughput (see site dossier sources)",
      ],
      weakestBasis: "estimated",
    },
  };
}

/** Short label for which MW figure we are using (size ≠ running use). */
export function powerKindLabel(kind: PowerKind): string {
  switch (kind) {
    case "max_proposed_mw":
      return "biggest size stated for this site";
    case "grid_connection_mw":
      return "grid connection applied for";
    case "phase_1_mw":
      return "first stage only";
    case "it_load_mw":
      return "IT equipment only";
  }
}

/** Plain-English gloss for communities and journalists. */
export function powerKindExplanation(kind: PowerKind): string {
  switch (kind) {
    case "max_proposed_mw":
      return "The largest megawatt figure on the public record for this one site (planning docs or operator materials). It may include stages that are not built yet. Not everyday electricity use; the source sits with the number.";
    case "grid_connection_mw":
      return "How big a link to the electricity grid they applied for or described. Not the same as everyday use.";
    case "phase_1_mw":
      return "Power size for the first stage of construction only. They may seek more later.";
    case "it_load_mw":
      return "Power for the computers alone, as written in planning materials. Still a stated size, not metered use.";
  }
}

/**
 * Sort helper: higher MW first; equal MW ordered A–Z by site name so
 * joint maxima (e.g. two 1 GW schemes) stay stable and do not invent a sole “largest”.
 */
export function compareSitesByPower(
  aMw: number,
  aName: string,
  bMw: number,
  bName: string,
): number {
  if (bMw !== aMw) return bMw - aMw;
  return aName.localeCompare(bName, "en", { sensitivity: "base" });
}

/** Competition ranks (1,1,3…) for a MW-sorted list — equal sizes share a rank. */
export function powerCompetitionRanks(mwValues: number[]): number[] {
  const ranks: number[] = [];
  for (let i = 0; i < mwValues.length; i++) {
    if (i > 0 && mwValues[i] === mwValues[i - 1]) ranks.push(ranks[i - 1]!);
    else ranks.push(i + 1);
  }
  return ranks;
}

export function basisLabel(basis: Basis): string {
  switch (basis) {
    case "stated":
      return "Operator";
    case "planning_doc":
      return "Planning";
    case "estimated":
      return "Estimated";
    case "measured":
      return "Measured";
  }
}

export function basisAriaLabel(basis: Basis): string {
  switch (basis) {
    case "stated":
      return "operator-stated figure";
    case "planning_doc":
      return "figure from a planning document";
    case "estimated":
      return "estimated figure; see methodology";
    case "measured":
      return "measured figure";
  }
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(n);
}

/** Megawatts for display: keep one decimal when the figure is not a whole number. */
export function formatMw(n: number): string {
  const digits = Number.isInteger(n) ? 0 : 1;
  return formatNumber(n, digits);
}

export function formatRange(r: Range, digits = 0): string {
  return `${formatNumber(r.low, digits)}-${formatNumber(r.high, digits)}`;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

function sharePct(x: number): string {
  const p = x * 100;
  return p < 1 ? "under 1%" : `${Math.round(p)}%`;
}

function shareRange(low: number, high: number): string {
  const lo = Math.round(low * 100);
  const hi = Math.round(high * 100);
  if (high * 100 < 1) return "under 1%";
  if (low * 100 < 1) return `up to ${hi}%`;
  return lo === hi ? `${hi}%` : `${lo}-${hi}%`;
}

export const LOAD_FACTOR_DISCLOSURE =
  "No operator on this map discloses expected load factor (the share of peak power used on average), so yearly electricity figures are shown as a range, not as a known total.";
