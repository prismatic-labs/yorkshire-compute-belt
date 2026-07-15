export type Basis = "stated" | "planning_doc" | "estimated" | "measured";

export type SiteStatus =
  | "proposed"
  | "in_planning"
  | "approved"
  | "under_construction"
  | "operating"
  | "refused"
  | "withdrawn";

export type LandType = "brownfield" | "agricultural" | "industrial_active";

export type Corridor = "yorkshire" | "humber" | "teesside";

export type ClaimStatus = "unverified" | "no_public_data" | "no_longer_stated";

export type PowerKind =
  | "max_proposed_mw"
  | "grid_connection_mw"
  | "phase_1_mw"
  | "it_load_mw";

export interface Quantity {
  value: number;
  unit: string;
  basis: Basis;
  source: string;
  page?: string | null;
  archived?: string | null;
}

export interface PlanningRef {
  id: string | null;
  url: string | null;
}

export interface PowerBlock {
  grid_connection_mw: Quantity | null;
  it_load_mw: Quantity | null;
  phase_1_mw: Quantity | null;
  max_proposed_mw: Quantity | null;
}

export interface LandBlock {
  acres: Quantity | null;
  previous_use: string | null;
  land_type: LandType;
  alc_grades?: string | null;
}

export interface ClaimOnRecord {
  claim: string;
  made_by: string;
  date: string | null;
  deadline?: string | null;
  status: ClaimStatus;
  source: string;
  archived?: string | null;
}

export interface OperatorResponse {
  date: string;
  text: string;
  source?: string | null;
}

export interface TimelineEvent {
  date: string;
  event: string;
  source?: string | null;
}

export interface Controversy {
  summary: string;
  source: string;
  label?: "campaign" | "procedural" | "reporting";
}

export interface SourceEntry {
  label: string;
  url: string;
  archived?: string | null;
  note?: string | null;
}

export interface SiteProperties {
  id: string;
  name: string;
  operator: string;
  status: SiteStatus;
  local_authority: string;
  corridor: Corridor;
  planning_ref: PlanningRef;
  power: PowerBlock;
  water_litres_pa: Quantity | null;
  land: LandBlock;
  grid_connection: {
    summary: string;
    new_substation: boolean | null;
    overhead_line_upgrades: boolean | null;
    basis: Basis;
    source: string;
  } | null;
  cooling: {
    claim: string;
    basis: Basis;
    source: string;
  } | null;
  claims_on_record: ClaimOnRecord[];
  operator_response: OperatorResponse | null;
  timeline: TimelineEvent[];
  controversies: Controversy[];
  sources: SourceEntry[];
  last_reviewed: string;
  summary?: string;
}

export interface SiteFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    /** GeoJSON order: [longitude, latitude] */
    coordinates: [number, number];
  };
  properties: SiteProperties;
}

export interface SitesCollection {
  $version: string;
  type: "FeatureCollection";
  features: SiteFeature[];
}

export interface BestPower {
  kind: PowerKind;
  quantity: Quantity;
}

export const STATUS_ABOVE_PROPOSED: ReadonlySet<SiteStatus> = new Set([
  "in_planning",
  "approved",
  "under_construction",
  "operating",
  "refused",
  "withdrawn",
]);
