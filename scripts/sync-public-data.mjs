/**
 * Copy the canonical data files into public/data so the published downloads
 * always match what the site was built from.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["sites.geojson", "schema.json", "config.json", "local_consumption.json", "CHANGELOG.md"];

mkdirSync(join(root, "public/data"), { recursive: true });
for (const f of FILES) {
  copyFileSync(join(root, "data", f), join(root, "public/data", f));
}
console.log(`synced ${FILES.length} data files to public/data`);
