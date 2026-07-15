import { describe, expect, it } from "vitest";
import {
  ACRES_PER_FOOTBALL_PITCH,
  HOME_KWH_PER_YEAR,
  HOURS_PER_YEAR,
  KETTLE_KW,
  LOAD_FACTOR,
  assumedAnnualGwh,
  bestPower,
  compareSitesByPower,
  footballPitchesEquivalence,
  homesEquivalence,
  kettleEquivalence,
  localGeographyEquivalence,
  powerCompetitionRanks,
  toKettles,
  waterResidentsEquivalence,
  weakestBasis,
  wheatForegoneEquivalence,
} from "./units";
import type { PowerBlock } from "./types";

const samplePower = (mw: number): PowerBlock => ({
  grid_connection_mw: null,
  it_load_mw: null,
  phase_1_mw: null,
  max_proposed_mw: {
    value: mw,
    unit: "MW",
    basis: "planning_doc",
    source: "test",
  },
});

describe("bestPower priority", () => {
  it("prefers max_proposed over grid and phase_1", () => {
    const power: PowerBlock = {
      max_proposed_mw: { value: 1000, unit: "MW", basis: "planning_doc", source: "a" },
      grid_connection_mw: { value: 400, unit: "MW", basis: "stated", source: "b" },
      phase_1_mw: { value: 100, unit: "MW", basis: "stated", source: "c" },
      it_load_mw: null,
    };
    expect(bestPower(power)?.kind).toBe("max_proposed_mw");
    expect(bestPower(power)?.quantity.value).toBe(1000);
  });

  it("falls through when higher fields are null", () => {
    const power: PowerBlock = {
      max_proposed_mw: null,
      grid_connection_mw: null,
      phase_1_mw: { value: 100, unit: "MW", basis: "stated", source: "c" },
      it_load_mw: null,
    };
    expect(bestPower(power)?.kind).toBe("phase_1_mw");
  });
});

describe("equal power sizes", () => {
  it("orders ties A–Z by name", () => {
    expect(compareSitesByPower(1000, "Elsham", 1000, "Drax")).toBeGreaterThan(0);
    expect(compareSitesByPower(1000, "Drax", 1000, "Elsham")).toBeLessThan(0);
  });

  it("shares competition ranks for joint maxima", () => {
    expect(powerCompetitionRanks([1000, 1000, 386, 5.6])).toEqual([1, 1, 3, 4]);
  });
});

describe("kettles (power-to-power)", () => {
  it("converts MW to continuous 3 kW kettles", () => {
    expect(toKettles(1)).toBeCloseTo(1000 / KETTLE_KW);
    expect(toKettles(5.6)).toBeCloseTo((5.6 * 1000) / KETTLE_KW);
  });

  it("declares nameplate quantity, not load", () => {
    const eq = kettleEquivalence(samplePower(100));
    expect(eq?.meta.quantity).toBe("nameplate");
    expect(eq?.value).toBeCloseTo(toKettles(100));
  });
});

describe("assumed load energy", () => {
  it("applies 40–70% load factor to annual GWh", () => {
    const gwh = assumedAnnualGwh(1000);
    expect(gwh.low).toBeCloseTo((1000 * HOURS_PER_YEAR * LOAD_FACTOR.low) / 1000);
    expect(gwh.high).toBeCloseTo((1000 * HOURS_PER_YEAR * LOAD_FACTOR.high) / 1000);
  });

  it("homes equivalence is a range using Ofgem figure", () => {
    const eq = homesEquivalence(samplePower(1));
    expect(eq?.meta.quantity).toBe("assumed_average_load");
    const gwh = assumedAnnualGwh(1);
    expect(eq?.value.low).toBeCloseTo((gwh.low * 1_000_000) / HOME_KWH_PER_YEAR.value);
    expect(eq?.value.high).toBeCloseTo((gwh.high * 1_000_000) / HOME_KWH_PER_YEAR.value);
  });
});

describe("local geography", () => {
  it("matches cumulative LA totals", () => {
    const authorities = [
      { name: "Smallville", total_gwh: 500 },
      { name: "Midtown", total_gwh: 1500 },
      { name: "Bigcity", total_gwh: 3000 },
    ];
    // 1 MW → ~3.5–6.1 GWh — smaller than Smallville alone
    const tiny = localGeographyEquivalence(samplePower(1), authorities);
    expect(tiny?.value.authoritiesUsedLow).toEqual(["Smallville"]);

    // 1000 MW → 3504–6132 GWh — needs accumulation
    const gw = localGeographyEquivalence(samplePower(1000), authorities);
    expect(gw?.value.authoritiesUsedLow.length).toBeGreaterThan(1);
    expect(gw?.meta.quantity).toBe("assumed_average_load");
  });
});

describe("water and land", () => {
  it("states undisclosed water explicitly", () => {
    expect(waterResidentsEquivalence(null).value).toBeNull();
    expect(waterResidentsEquivalence(null).label).toMatch(/not disclosed/i);
  });

  it("treats zero water as an operator claim, not a people equivalence", () => {
    const eq = waterResidentsEquivalence({
      value: 0,
      unit: "litres/year",
      basis: "stated",
      source: "operator claim",
    });
    expect(eq.value).toBe(0);
    expect(eq.label).toMatch(/operator claims zero/i);
    expect(eq.label).not.toMatch(/people/i);
  });

  it("converts acres to football pitches", () => {
    const eq = footballPitchesEquivalence({
      value: ACRES_PER_FOOTBALL_PITCH,
      unit: "acres",
      basis: "planning_doc",
      source: "test",
    });
    expect(eq?.value).toBeCloseTo(1);
  });

  it("withholds wheat unless ALC supports it", () => {
    const acres = {
      value: 435,
      unit: "acres",
      basis: "planning_doc" as const,
      source: "test",
    };
    expect(wheatForegoneEquivalence(acres, { alcSupportsYield: false })).toBeNull();
    expect(wheatForegoneEquivalence(acres, { alcSupportsYield: true })?.value.low).toBeGreaterThan(0);
  });
});

describe("basis weakness", () => {
  it("inherits the weakest basis", () => {
    expect(weakestBasis("measured", "estimated")).toBe("estimated");
    expect(weakestBasis("planning_doc", "stated")).toBe("stated");
  });
});
