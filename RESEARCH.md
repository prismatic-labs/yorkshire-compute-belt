# Phase 0 research log

Public mirror: `/research` on the site.

§3 protocol status for seed sites on the map (Yorkshire, the Humber, and Teesside). Seed data in `data/sites.geojson` is **not** a complete regional census until checklist items below are closed and further sites are verified.

## Hard rule

No status above `proposed` without a `planning_ref.url` that opens the live application (not a search form).

## Site checklist

| Site | Portal ref | Live URL | Coords vs red-line | Power disagg. | Archives | ALC (if agri) | Notes |
|---|---|---|---|---|---|---|---|
| Skelton Grange | `25/06139/FU` | **no lasting Public Access case URL** (Idox `keyVal` still missing; search form only) | point only | all null (undisclosed) | pending | n/a brownfield | Resolution-to-grant reported; status demoted until live case page |
| Eggborough | unknown | null | point only | all null | pending | n/a | Held at proposed |
| Drax | screening / full ref TBD | null | point only | phase_1 + max stated | pending | n/a | EIA screening contested (amber) |
| Elsham Tech Park | `PA/2025/643` | [portal](https://apps.northlincs.gov.uk/application/pa-2025-643) | point only | 1 GW IT load from committee report | pending | **yes: grades 1–3a BMV** (sum 179.7 ha vs ~176 ha site: reconcile) | Minded to approve Mar 2026; portal shows **no decision issued** (2026-07-15): held at `in_planning` |
| Humber Tech Park | `PA/2024/584` | [portal](https://apps.northlincs.gov.uk/application/pa-2024-584) | point only | 386 MW (stated / reporting) | pending | confirm | Outline Aug 2024 |
| Deep Green Bradford | unknown | null | point only | 5.6 MW stated | pending | n/a | News reports approval May 2026; demoted until portal URL |
| Mountpark Ferrybridge (DC plot) | `22/02485/HYB` (wider site) | [Wakefield summary](https://planning.wakefield.gov.uk/online-applications/applicationDetails.do?activeTab=summary&keyVal=RMF1XRQQ06E00) | point only | all null | pending | n/a brownfield | ~40 acres Zone A for data centre (press); MW + Zone A red-line TBD; operator undisclosed |
| Wilton International Phase 1 | `R/2026/0183/SC` | [Redcar Display (screening)](https://planning.redcar-cleveland.gov.uk/Planning/Display/R/2026/0183/SC) | point only | 280 MW stated Phase 1 | pending | n/a industrial | Sembcorp / Digital Reef; `proposed` (FF Display redirects; use SC until full app resolves) |
| Teesworks DC campus | `R/2025/0382/ESM` | [Redcar Display](https://planning.redcar-cleveland.gov.uk/Planning/Display/R/2025/0382/ESM) | point only | all null (extent ~462,419 m² ≈ 115 acres; treat as site extent, not floorspace) | pending | n/a brownfield | Reserved matters approved Aug 2025; BP withdrew competing H2Teesside Dec 2025 |
| Latos Preston Farm (Stockton) | unknown | null | point only | 9.5 MW IT stated | pending | n/a industrial | Approval reported Sep 2025; `proposed` until Stockton Public Access URL |

## Not yet on the map

Known gaps for later dossiers (same evidentiary bar):

- **Conesby / Scunthorpe campus (North Lincolnshire)**: early / press-stage schemes near the Humber corridor. Only seed once a live planning page and stated size exist.
- Redcar / Tees Valley: older smaller consented schemes (e.g. reported ~48 MW former chemicals-plant campus, 2023) if still live and distinct from Wilton / Teesworks / Latos.
- Other large schemes once they appear with a planning page and stated size.
- Existing smaller rented server halls and city hosting rooms across the region (often no public megawatt figure). Inventory separately; do not mix with hyperscale campus dossiers without clear labelling.

## Outstanding (blocks “Phase 0 acceptance”)

1. Snapshot every cited URL to archive.org at ingestion; store `archived` fields.
2. Replace Skelton / Deep Green / Drax / Eggborough portal gaps with resolving URLs, then upgrade statuses.
3. Page-level citations inside planning PDFs (not only committee-report summaries).
4. Verify coordinates against red-line drawings.
5. Confirm Humber acreage and MW basis against PA/2024/584 documents (not press alone).
6. Ferrybridge: confirm Zone A red-line, operator, and whether a separate reserved-matters / full application states megawatts.
7. Teesside: page-level MW citations for Wilton; seek MW for Teesworks in application pack if published; find lasting Stockton Public Access URL for Latos Preston Farm (then consider upgrading from `proposed`).

## Local consumption

`data/local_consumption.json` loaded from DESNZ `elec_LA_stacked_2005-2024.csv` (2024 rows) on 2026-07-15.

## Sample FOI / EIR letters

### Leeds City Council — Skelton Grange deep-link and documents

Send via Leeds City Council’s published FOI/EIR channel.

```text
[Your name]
[Date]

Information Governance
Leeds City Council
[published FOI/EIR email or portal]

Dear Sir/Madam,

Freedom of Information Act 2000 / Environmental Information Regulations 2004

I request information about planning application 25/06139/FU (Microsoft / Skelton Grange data centre, Stourton).

Please provide:

1. The lasting public URL (or Idox system keyVal / unique reference) that opens this application’s
   live case page on the Council’s Public Access system, not only the generic search form.

2. The decision notice, committee report, and any officer report recommending grant or
   resolution-to-grant, with document titles and dates.

3. Any Environmental Statement chapters, energy statements, or utilities/infrastructure notes
   that state megawatt capacity, grid connection size, water demand, or cooling method for this
   development (or confirmation that no such figures appear in the application documents held).

4. If any item is already published, please give the direct document URL on Public Access rather
   than attaching duplicates.

I am happy to receive the response electronically. If the cost limit applies, please advise how
to refine the request. This is for a public-interest project assembling sourced environmental
figures for regional data centre proposals (The Yorkshire Compute Belt).

Yours faithfully,
[Name]
[Email]
```

See also the Yorkshire Water EIR sample in the project notes (water capacity / zero-water claims).
