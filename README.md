# The Yorkshire Compute Belt

A public, open-source map of the physical footprint of AI and cloud infrastructure across Yorkshire, the Humber, and Teesside: data centres, power, land, and water, with sourced figures assembled in one place.

**Site name (fixed):** The Yorkshire Compute Belt  
**Sub-brand (PNG export / social only):** God's Own Compute  
**Suggested domains:** computebelt.uk → yorkshirecomputebelt.uk (GitHub Pages until secured)  
**Repo slug:** `yorkshire-compute-belt`

## Stance

Disclosed, not neutral: make the physical and environmental cost of the regional compute build-out visible and comparable. Within that stance: every number sourced or null, claims shown as claims, no adjective advocacy. See [`/methodology`](./src/pages/methodology.astro).

## v0

1. Map homepage (MapLibre)
2. Site dossiers (seed → §3 verification; see `RESEARCH.md`)
3. `src/lib/units.ts` (capacity / load / energy discipline)
4. Methodology page
5. Compare view + PNG export
6. Sortable `/sites` table (crawlable spine)

## Develop

```bash
npm install
npm test
npm run validate:data
npm run dev
```

Base path for GitHub Pages: `/yorkshire-compute-belt`.

## Data

- `data/sites.geojson` — FeatureCollection, coordinates **`[lng, lat]`**
- `data/schema.json` — JSON Schema (`$version` from day one)
- `data/local_consumption.json` — DESNZ LA electricity totals
- `data/config.json` — region + contacts (not Yorkshire-hardcoded in code paths)
- `data/CHANGELOG.md` — corrections log

Contributions: GitHub Issue Forms and email `marco@prismaticlabs.ai` (subject: `Yorkshire Compute Belt: correction`). Review queue only; nothing writes the data store from the public.

## More from Prismatic Labs

[Cloud Kettle Index](https://prismatic-labs.github.io/cloud-kettle-index/) · [CULM](https://prismatic-labs.github.io/culm/)

## License

Content and data: sources remain with their publishers; site code MIT (see `LICENSE` when added).
