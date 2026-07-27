/**
 * AI Growth Zone (AIGZ) bids across Yorkshire & the Humber.
 *
 * IMPORTANT: none of these are designated. As of July 2026 the confirmed UK AI
 * Growth Zones are Oxfordshire, the North East, North Wales, South Wales and
 * Scotland — see https://www.gov.uk/government/collections/ai-growth-zones.
 * The three below are live regional bids, drawn as indicative areas (a radius
 * around each bid's lead site), not official boundaries.
 */
export interface AigzZone {
  id: string;
  name: string;
  status: "bid";
  lead: string;
  centre: [number, number];
  radiusKm: number;
  note: string;
  source: { title: string; url: string };
}

export const AIGZ_ZONES: AigzZone[] = [
  {
    id: "york-north-yorkshire",
    name: "York & North Yorkshire",
    status: "bid",
    lead: "Centred on Drax power station, near Selby",
    centre: [-1.02, 53.77],
    radiusKm: 16,
    note: "Bid led by the York & North Yorkshire Combined Authority, built around a proposed AI and clean-energy campus at Drax.",
    source: {
      title: "York & North Yorkshire Combined Authority",
      url: "https://yorknorthyorks-ca.gov.uk/york-and-north-yorkshire-stands-ready-to-deliver-pioneering-ai-growth-zone/",
    },
  },
  {
    id: "south-yorkshire",
    name: "South Yorkshire",
    status: "bid",
    lead: "Doncaster / Gateway East (SYMCA)",
    centre: [-1.2, 53.5],
    radiusKm: 20,
    note: "Expression of interest from the South Yorkshire Mayoral Combined Authority, led by Doncaster and the Gateway East site.",
    source: {
      title: "Doncaster Chamber of Commerce",
      url: "https://www.doncaster-chamber.co.uk/2025/03/12/doncaster-artificial-intelligence-ai-growth-zone/",
    },
  },
  {
    id: "north-lincolnshire",
    name: "Northern Lincolnshire",
    status: "bid",
    lead: "Humber Tech Park, near Scunthorpe",
    centre: [-0.65, 53.59],
    radiusKm: 13,
    note: "North Lincolnshire Council bid for a multi-gigawatt zone anchored on the proposed Humber Tech Park.",
    source: {
      title: "North Lincolnshire Council",
      url: "https://www.northlincs.gov.uk/news/council-bids-to-bring-artificial-intelligence-growth-zone-to-northern-lincolnshire",
    },
  },
];

/** No Yorkshire/Humber zone is designated; these are bids. Shown when the layer is on. */
export const AIGZ_DESIGNATED_NOTE =
  "None are designated yet — these are live bids. The confirmed UK zones so far are Oxfordshire, the North East, North Wales, South Wales and Scotland.";
