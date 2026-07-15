import { readFileSync } from "node:fs";
import { join } from "node:path";
import localConsumption from "../../data/local_consumption.json";
import config from "../../data/config.json";
import type {
  BestPower,
  SiteFeature,
  SiteProperties,
  SitesCollection,
} from "./types";
import { STATUS_ABOVE_PROPOSED } from "./types";
import { bestPower, formatMw, formatNumber, powerKindLabel } from "./units";
import { circleScale, hasDisclosedPower } from "./mapScale";

/** Load GeoJSON from repo root so prerender and `npm run dev` share one path. */
const collection = JSON.parse(
  readFileSync(join(process.cwd(), "data/sites.geojson"), "utf8"),
) as SitesCollection;

export function getConfig() {
  return config;
}

export function getSites(): SiteFeature[] {
  return collection.features;
}

export function getSite(id: string): SiteFeature | undefined {
  return collection.features.find((f) => f.properties.id === id);
}

export function getLocalAuthorities() {
  return localConsumption.authorities
    .filter((a) => typeof a.total_gwh === "number")
    .map((a) => ({ name: a.name, total_gwh: a.total_gwh as number }));
}

export function siteBestPower(site: SiteProperties): BestPower | null {
  return bestPower(site.power);
}

export function formatBestPower(site: SiteProperties): string {
  const best = siteBestPower(site);
  if (!best) return "Not disclosed";
  return `${formatMw(best.quantity.value)} MW · ${powerKindLabel(best.kind)}`;
}

export function formatLand(site: SiteProperties): string {
  const acres = site.land.acres;
  const typeLabel =
    site.land.land_type === "brownfield"
      ? "ex-industrial / brownfield"
      : site.land.land_type === "agricultural"
        ? "farmland"
        : "active industrial";
  if (!acres) return typeLabel;
  return `${formatNumber(acres.value)} acres · ${typeLabel}`;
}

export function regionalTotals(sites: SiteFeature[] = getSites()) {
  let disclosedMw = 0;
  let acres = 0;
  let undisclosedPower = 0;
  for (const f of sites) {
    const best = bestPower(f.properties.power);
    if (best) disclosedMw += best.quantity.value;
    else undisclosedPower += 1;
    if (f.properties.land.acres) acres += f.properties.land.acres.value;
  }
  return {
    count: sites.length,
    disclosedMw,
    acres,
    undisclosedPower,
    powerLabel:
      undisclosedPower > 0
        ? `≥${formatNumber(disclosedMw)} megawatts disclosed`
        : `${formatNumber(disclosedMw)} megawatts`,
  };
}

export function disclosureChecklist(site: SiteProperties) {
  return {
    power: hasDisclosedPower(site.power),
    water: site.water_litres_pa != null,
    pue: false, // none disclosed in v0 seed set
    energy_source: site.claims_on_record.some((c) =>
      /renewable|biomass|heat/i.test(c.claim),
    ),
    load_factor: false, // none disclose — the finding
  };
}

export function assertPlanningRule(site: SiteProperties): string | null {
  if (!STATUS_ABOVE_PROPOSED.has(site.status)) return null;
  if (!site.planning_ref.url) {
    return `${site.id}: status "${site.status}" requires planning_ref.url`;
  }
  return null;
}

export function medianStalenessDays(
  sites: SiteFeature[] = getSites(),
  today = new Date(),
): number {
  const days = sites.map((s) => {
    const reviewed = new Date(s.properties.last_reviewed);
    return (today.getTime() - reviewed.getTime()) / (86400 * 1000);
  });
  days.sort((a, b) => a - b);
  const mid = Math.floor(days.length / 2);
  return days.length % 2 === 0
    ? (days[mid - 1]! + days[mid]!) / 2
    : days[mid]!;
}

export { circleScale, collection as sitesCollection };
