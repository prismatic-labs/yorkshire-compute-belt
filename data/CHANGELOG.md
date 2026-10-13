# Data changelog

Corrections and material figure changes. Newest first.

## 2026-10-05 — Audit corrections

- Regional total: split into megawatts in planning documents and megawatts stated only by operators. The old "≥2,681 MW" mixed Elsham's planning-document IT load with operator ambitions, and no running site has a megawatt figure.
- Drax: removed the 1,000 MW "maximum". That was an ambition to grow beyond 1 GW after 2031, not an application; Drax's own page describes an application for under 100 MW. Dropped "contested" from the screening entry: the cited Northern Echo piece does not say so.
- Humber Tech Park: 386 MW "stated" replaced by IT load of up to 384 MW from the planning statement; site area now sourced to the planning statement (76 ha).
- Elsham: summary records the recommended 20 m³/day per-business water condition.
- Ferrybridge consent date corrected to 4 October 2024 (Wakefield portal).
- aql: "only independent internet exchange outside London" now attributed to aql.
- Local consumption: added Middlesbrough, Redcar and Cleveland and Stockton-on-Tees (DESNZ 2024), and North East Lincolnshire domestic use (216.0 GWh).
- `public/data/` is now copied from `data/` before every build; the published GeoJSON had been missing aql Leeds.

## 2026-07-15 — Teesworks figure relabelled; H2Teesside withdrawal recorded

- Teesworks (`R/2025/0382/ESM`): the ~462,419 m² figure was presented as floorspace; it equals ≈115 acres / 46 ha — the reported **site extent** — so it is now labelled as extent, not floorspace, in the dossier and research checklist.
- Teesworks timeline: BP formally withdrew the competing H2Teesside DCO bid in December 2025; land-conflict controversy marked resolved.
- Ferrybridge: archive.org snapshot stored for the Wakefield portal source (portal serves an incomplete TLS certificate chain).

## 2026-07-15 — Latos Preston Farm (Stockton) seeded

- Added Latos Preston Farm (`latos-preston-farm`): ~9.5 MW IT stated, Teesside corridor, status `proposed` (approval reported Sep 2025; Stockton Public Access URL still missing — same bar as Deep Green / Eggborough).

## 2026-07-15 — Display + zoom area controls

- Map panel: **Display** toggles show/hide Yorkshire / Humber / Teesside markers (at least one on).
- Separate **Zoom** row: All / Yorkshire / Humber / Teesside flies or fits the camera without changing which markers are displayed.

## 2026-07-15 — Area toggles on the map

- Map panel: independent show/hide for Yorkshire, the Humber, and Teesside (at least one must stay on).
- Sites gain a required `corridor` field (`yorkshire` | `humber` | `teesside`) used by the filter.

## 2026-07-15 — Teesside sites added

- Expanded map region label to Yorkshire, the Humber & Teesside; map centre/zoom adjusted north.
- Added Wilton International Phase 1 (`wilton-international`): Sembcorp Energy UK / Digital Reef, up to 280 MW stated, status `proposed`, live Redcar screening `R/2026/0183/SC` (Display `…/FF` currently redirects to portal home).
- Added Teesworks data centre campus (`teesworks`): reserved matters `R/2025/0382/ESM` approved Aug 2025, status `approved`, megawatts still undisclosed; ~115 acres stated from press pending red-line check.

## 2026-07-15 — Ferrybridge plot added

- Added Mountpark Ferrybridge data-centre plot (`ferrybridge`): ~40 acres within the former Ferrybridge C coal yard (Wakefield), status `proposed`.
- Linked live Wakefield summary for hybrid `22/02485/HYB` (wider Mountpark employment consent). Megawatts, Zone A red-line, and named operator still outstanding.
- Research log notes that the map is not a full regional census (smaller rented server halls / city hosting rooms still uninventoried).

## 2026-07-15 — Elsham status correction

- Elsham Tech Park (`PA/2025/643`) demoted `approved` → `in_planning`. The March 2026 committee was minded to approve, but the live North Lincolnshire portal records no decision issued (checked 2026-07-15). Matches the treatment already applied to Skelton Grange and Deep Green Bradford: no consented status without a recorded decision.
- Elsham ALC note added: stated grade areas sum to 179.7 ha against a site of ~176 ha; to reconcile against the committee report.

## 2026-07-15 — v0 seed

- Initial FeatureCollection of six sites under `$version` `0.1.0`.
- Elsham (`PA/2025/643`) and Humber Tech Park (`PA/2024/584`) carry live North Lincolnshire portal URLs and `approved` status.
- Skelton Grange, Deep Green Bradford, Drax, and Eggborough seeded from mid-2026 reporting; statuses constrained by the planning-URL hard rule where deep-links are still missing. See `RESEARCH.md`.
- DESNZ 2024 local-authority electricity totals loaded into `local_consumption.json`.
