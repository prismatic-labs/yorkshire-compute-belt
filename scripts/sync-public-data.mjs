/**
 * Copy the canonical data files into public/data so the published downloads
 * always match what the site was built from.
 *
 * Run with --check to compare instead of copying: it reports any file whose
 * published copy has drifted and exits non-zero, so CI catches a data commit
 * that forgot to sync (the published GeoJSON was once missing aql Leeds).
 */
import { copyFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["sites.geojson", "schema.json", "config.json", "local_consumption.json", "CHANGELOG.md"];
const check = process.argv.includes("--check");

const src = (f) => join(root, "data", f);
const dest = (f) => join(root, "public/data", f);

if (check) {
  const drifted = FILES.filter((f) => {
    if (!existsSync(dest(f))) return true;
    return !readFileSync(src(f)).equals(readFileSync(dest(f)));
  });
  if (drifted.length > 0) {
    console.error(
      `public/data is out of date for ${drifted.length} file(s): ${drifted.join(", ")}\n` +
        "Run `npm run sync:data` and commit the result.",
    );
    process.exit(1);
  }
  console.log(`public/data matches data/ for all ${FILES.length} files`);
} else {
  mkdirSync(join(root, "public/data"), { recursive: true });
  for (const f of FILES) copyFileSync(src(f), dest(f));
  console.log(`synced ${FILES.length} data files to public/data`);
}
