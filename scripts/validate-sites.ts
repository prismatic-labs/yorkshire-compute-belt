/**
 * CI validator for data/sites.geojson against data/schema.json
 * plus editorial hard rules from the build plan.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(join(root, "data/schema.json"), "utf8"));
const data = JSON.parse(readFileSync(join(root, "data/sites.geojson"), "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const errors: string[] = [];

if (!validate(data)) {
  for (const e of validate.errors ?? []) {
    errors.push(`schema: ${e.instancePath} ${e.message}`);
  }
}

const ABOVE = new Set([
  "in_planning",
  "approved",
  "under_construction",
  "operating",
  "refused",
  "withdrawn",
]);

const ids = new Set<string>();

for (const feature of data.features ?? []) {
  const p = feature.properties;
  if (ids.has(p.id)) errors.push(`duplicate id: ${p.id}`);
  ids.add(p.id);

  const [lng, lat] = feature.geometry.coordinates;
  if (lng < -3 || lng > 1 || lat < 52 || lat > 55.5) {
    errors.push(`${p.id}: coordinates look outside Yorkshire & Humber box (got [lng,lat]=[${lng},${lat}])`);
  }

  if (ABOVE.has(p.status)) {
    if (!p.planning_ref?.url) {
      errors.push(`${p.id}: status "${p.status}" requires planning_ref.url`);
    } else if (
      /search\.do/i.test(p.planning_ref.url) &&
      !/applicationDetails|\/application\//i.test(p.planning_ref.url)
    ) {
      errors.push(
        `${p.id}: planning_ref.url must resolve to the live application, not a search form (${p.planning_ref.url})`,
      );
    }
  }

  // Every non-null quantity must carry basis + source
  const checkQty = (path: string, q: unknown) => {
    if (q == null) return;
    if (typeof q !== "object") {
      errors.push(`${path}: expected quantity object or null`);
      return;
    }
    const o = q as Record<string, unknown>;
    for (const k of ["value", "unit", "basis", "source"]) {
      if (o[k] == null || o[k] === "") errors.push(`${path}: missing ${k}`);
    }
  };

  checkQty(`${p.id}.power.grid_connection_mw`, p.power?.grid_connection_mw);
  checkQty(`${p.id}.power.it_load_mw`, p.power?.it_load_mw);
  checkQty(`${p.id}.power.phase_1_mw`, p.power?.phase_1_mw);
  checkQty(`${p.id}.power.max_proposed_mw`, p.power?.max_proposed_mw);
  checkQty(`${p.id}.water_litres_pa`, p.water_litres_pa);
  checkQty(`${p.id}.land.acres`, p.land?.acres);
}

if (errors.length) {
  console.error("validate:sites failed:\n" + errors.map((e) => ` - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`validate:sites ok — ${data.features.length} features, $version ${data.$version}`);
