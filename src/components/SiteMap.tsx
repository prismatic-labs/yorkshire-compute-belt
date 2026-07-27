import { useEffect, useId, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import type { Corridor, SiteFeature } from "../lib/types";
import { circleScale, mapRadiusMetres, statusColour } from "../lib/mapScale";
import { formatNumber, powerKindLabel, bestPower } from "../lib/units";
import { AIGZ_ZONES } from "../lib/aigz";

interface Props {
  sites: SiteFeature[];
  baseUrl: string;
  center: [number, number];
  zoom: number;
}

const CORRIDORS: Array<{ id: Corridor; label: string }> = [
  { id: "yorkshire", label: "Yorkshire" },
  { id: "humber", label: "The Humber" },
  { id: "teesside", label: "Teesside" },
];

/** Geographic framing extents [SW, NE] so zoom isn't pinned to the tight site cluster. */
const CORRIDOR_BOUNDS: Record<Corridor, [[number, number], [number, number]]> = {
  // Historic / ceremonial Yorkshire: Sheffield south to North York Moors / coast fringe
  yorkshire: [
    [-2.15, 53.35],
    [-0.5, 54.5],
  ],
  humber: [
    [-0.9, 53.45],
    [0.2, 53.85],
  ],
  teesside: [
    [-1.45, 54.48],
    [-0.95, 54.72],
  ],
};

type CorridorVisibility = Record<Corridor, boolean>;
type ZoomFocus = "all" | Corridor;

const ALL_VISIBLE: CorridorVisibility = {
  yorkshire: true,
  humber: true,
  teesside: true,
};

// Deep indigo — well clear of the whole warm status palette (stone, reddish-purple,
// ochre, green, blue, vermillion). Rendered as a diagonal hatch (below) as well, so the
// policy overlay never reads as a solid status pin even at a glance.
const ZONE_COLOUR = "#3730A3";

/** Indicative circle (not an official boundary) around a bid's lead site. */
function circleRing([lng, lat]: [number, number], radiusKm: number, points = 64): number[][] {
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const ring: number[][] = [];
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return ring;
}

const AIGZ_GEO: FeatureCollection = {
  type: "FeatureCollection",
  features: AIGZ_ZONES.map((z) => ({
    type: "Feature",
    properties: { id: z.id, name: z.name },
    geometry: { type: "Polygon", coordinates: [circleRing(z.centre, z.radiusKm)] },
  })),
};

export default function SiteMap({ sites, baseUrl, center, zoom }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<
    Map<string, { marker: maplibregl.Marker; corridor: Corridor }>
  >(new Map());
  const [selected, setSelected] = useState<SiteFeature | null>(null);
  const [visibleCorridors, setVisibleCorridors] =
    useState<CorridorVisibility>(ALL_VISIBLE);
  const [zoomFocus, setZoomFocus] = useState<ZoomFocus>("all");
  const [showZones, setShowZones] = useState(false);
  const visibleCorridorsRef = useRef(visibleCorridors);
  visibleCorridorsRef.current = visibleCorridors;
  const zoneMarkersRef = useRef<maplibregl.Marker[]>([]);
  const panelId = useId();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      // OpenFreeMap: MapLibre-native, no API key. OSM raster tiles often block embedded clients.
      style: "https://tiles.openfreemap.org/styles/positron",
      center,
      zoom,
      cooperativeGestures: true,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    // Stable Map instance captured for the cleanup below (lint: ref may change by teardown).
    const markers = markersRef.current;
    const zoneMarkers = zoneMarkersRef.current;

    map.on("load", () => {
      for (const site of sites) {
        const scale = circleScale(site.properties);
        const [lng, lat] = site.geometry.coordinates;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "ycb-marker";
        el.setAttribute("aria-label", site.properties.name);
        el.dataset.corridor = site.properties.corridor;
        const r = Math.max(14, mapRadiusMetres(scale) / 280);
        const colour = statusColour(site.properties.status);
        const dashed = scale.mode !== "power";
        el.style.width = `${r * 2}px`;
        el.style.height = `${r * 2}px`;
        el.style.borderRadius = "50%";
        el.style.border = dashed ? `2.5px dashed ${colour}` : `2px solid ${colour}`;
        // Whisper of fill on dashed rings so sites like Skelton stay visible on Positron
        el.style.background = dashed ? `${colour}28` : `${colour}33`;
        el.style.cursor = "pointer";
        el.style.padding = "0";
        const show = visibleCorridorsRef.current[site.properties.corridor];
        el.style.display = show ? "" : "none";
        el.disabled = !show;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelected(site);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current.set(site.properties.id, {
          marker,
          corridor: site.properties.corridor,
        });
      }

      // AI Growth Zone bid overlay — hidden until toggled on.
      map.addSource("aigz", { type: "geojson", data: AIGZ_GEO });
      // Diagonal-hatch tile (2x for retina) so the fill reads as an indicative overlay.
      if (!map.hasImage("aigz-hatch")) {
        const s = 16;
        const cvs = document.createElement("canvas");
        cvs.width = s;
        cvs.height = s;
        const ctx = cvs.getContext("2d");
        if (ctx) {
          ctx.strokeStyle = ZONE_COLOUR;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(0, s);
          ctx.lineTo(s, 0);
          ctx.stroke();
          const { data, width, height } = ctx.getImageData(0, 0, s, s);
          map.addImage("aigz-hatch", { width, height, data: new Uint8Array(data) }, { pixelRatio: 2 });
        }
      }
      map.addLayer({
        id: "aigz-fill",
        type: "fill",
        source: "aigz",
        layout: { visibility: "none" },
        paint: map.hasImage("aigz-hatch")
          ? { "fill-pattern": "aigz-hatch", "fill-opacity": 0.9 }
          : { "fill-color": ZONE_COLOUR, "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "aigz-line",
        type: "line",
        source: "aigz",
        layout: { visibility: "none", "line-join": "round" },
        paint: { "line-color": ZONE_COLOUR, "line-width": 2, "line-dasharray": [2, 1.5] },
      });
      // Labels as DOM markers (no dependency on the basemap's glyph set).
      for (const zone of AIGZ_ZONES) {
        const el = document.createElement("span");
        el.className = "ycb-zone-label";
        el.textContent = `${zone.name} · AIGZ bid`;
        el.style.display = "none";
        const marker = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat(zone.centre)
          .addTo(map);
        zoneMarkersRef.current.push(marker);
      }
    });

    return () => {
      markers.clear();
      zoneMarkers.length = 0;
      map.remove();
      mapRef.current = null;
    };
  }, [sites, center, zoom]);

  // Toggle the AI Growth Zone overlay (fill, outline, and DOM labels).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("aigz-fill")) return;
    const vis = showZones ? "visible" : "none";
    map.setLayoutProperty("aigz-fill", "visibility", vis);
    map.setLayoutProperty("aigz-line", "visibility", vis);
    for (const m of zoneMarkersRef.current) {
      m.getElement().style.display = showZones ? "" : "none";
    }
  }, [showZones]);

  useEffect(() => {
    for (const { marker, corridor } of markersRef.current.values()) {
      const el = marker.getElement() as HTMLButtonElement;
      el.style.display = visibleCorridors[corridor] ? "" : "none";
      el.disabled = !visibleCorridors[corridor];
    }
    if (selected && !visibleCorridors[selected.properties.corridor]) {
      setSelected(null);
    }
  }, [visibleCorridors, selected]);

  const best = selected ? bestPower(selected.properties.power) : null;
  const scale = selected ? circleScale(selected.properties) : null;

  function toggleCorridorDisplay(id: Corridor) {
    setVisibleCorridors((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      // Keep at least one corridor on so the map never goes blank by accident.
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  }

  function flyToFocus(id: ZoomFocus) {
    const map = mapRef.current;
    if (!map) return;
    setZoomFocus(id);

    if (id === "all") {
      map.flyTo({ center, zoom, essential: true });
      return;
    }

    const [sw, ne] = CORRIDOR_BOUNDS[id];
    const bounds = new maplibregl.LngLatBounds(sw, ne);
    // Still include any sites slightly outside the geographic frame.
    for (const site of sites.filter((s) => s.properties.corridor === id)) {
      bounds.extend(site.geometry.coordinates as [number, number]);
    }
    map.fitBounds(bounds, {
      padding: { top: 72, bottom: 48, left: 36, right: 36 },
      maxZoom: 9.2,
      duration: 900,
      essential: true,
    });
  }

  return (
    <div
      className="relative w-full bg-[var(--paper)]"
      style={{ height: "100dvh", minHeight: "100vh" }}
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
        role="application"
        aria-label="Map of data centre sites"
      />

      <div className="pointer-events-none absolute left-0 top-0 z-10 p-2.5 sm:p-3">
        <div className="pointer-events-auto max-w-[18.5rem] rounded border border-[var(--line)] bg-[var(--map-panel)] px-3 py-2 shadow-sm sm:max-w-xs">
          <a href={`${baseUrl}/`} className="wordmark block mb-1 no-underline text-[0.7rem]">
            The Yorkshire Compute Belt
          </a>
          <p className="m-0 text-[0.75rem] text-[var(--ink)] font-display tracking-tight leading-snug">
            AI and cloud leave a physical footprint: power, land, and water. This map puts data centres
            across Yorkshire, the Humber, and Teesside, and those figures, where communities can see them.
          </p>
          <nav className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.75rem]" aria-label="Site">
            <a href={`${baseUrl}/sites`} className="text-[var(--ink)]/75 no-underline hover:text-[var(--ink)]">Sites</a>
            <a href={`${baseUrl}/compare`} className="text-[var(--ink)]/75 no-underline hover:text-[var(--ink)]">Compare</a>
            <a href={`${baseUrl}/research`} className="text-[var(--ink)]/75 no-underline hover:text-[var(--ink)]">Research</a>
            <a href={`${baseUrl}/methodology`} className="text-[var(--ink)]/75 no-underline hover:text-[var(--ink)]">Methodology</a>
          </nav>

          <div className="mt-2 border-t border-[var(--line)] pt-2">
            <p className="m-0 mb-1.5 text-[0.65rem] uppercase tracking-wider text-[var(--muted)]">
              Display
            </p>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Show or hide sites by area"
            >
              {CORRIDORS.map(({ id, label }) => {
                const on = visibleCorridors[id];
                return (
                  <button
                    key={`display-${id}`}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleCorridorDisplay(id)}
                    className="rounded border px-2 py-1 text-[0.7rem] leading-none cursor-pointer transition-colors"
                    style={{
                      borderColor: on ? "var(--ink)" : "var(--line)",
                      background: on ? "var(--ink)" : "transparent",
                      color: on ? "var(--paper)" : "var(--muted)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="m-0 mt-2.5 mb-1.5 text-[0.65rem] uppercase tracking-wider text-[var(--muted)]">
              Zoom
            </p>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Zoom map to an area"
            >
              {(
                [
                  { id: "all" as const, label: "All" },
                  ...CORRIDORS,
                ] as Array<{ id: ZoomFocus; label: string }>
              ).map(({ id, label }) => {
                const on = zoomFocus === id;
                return (
                  <button
                    key={`zoom-${id}`}
                    type="button"
                    aria-pressed={on}
                    onClick={() => flyToFocus(id)}
                    className="rounded border px-2 py-1 text-[0.7rem] leading-none cursor-pointer transition-colors"
                    style={{
                      borderColor: on ? "var(--ink)" : "var(--line)",
                      background: "transparent",
                      color: on ? "var(--ink)" : "var(--muted)",
                      boxShadow: on ? "inset 0 0 0 1px var(--ink)" : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="m-0 mt-2.5 mb-1.5 text-[0.65rem] uppercase tracking-wider text-[var(--muted)]">
              Overlay
            </p>
            <button
              type="button"
              aria-pressed={showZones}
              onClick={() => setShowZones((v) => !v)}
              className="rounded border px-2 py-1 text-[0.7rem] leading-none cursor-pointer transition-colors"
              style={{
                borderColor: showZones ? ZONE_COLOUR : "var(--line)",
                background: showZones ? ZONE_COLOUR : "transparent",
                color: showZones ? "#ffffff" : "var(--muted)",
              }}
            >
              AI Growth Zone bids
            </button>
            <p className="m-0 mt-1.5 text-[0.65rem] leading-snug text-[var(--muted)]">
              Live bids drawn as indicative areas. None is designated yet.{" "}
              <a href={`${baseUrl}/methodology#aigz`} className="underline">About these bids</a>
            </p>
          </div>
        </div>
      </div>

      <ScaleBar />

      {selected && (
        <aside
          id={panelId}
          className="absolute z-20 bg-[var(--map-panel)] border border-[var(--line)] shadow-sm
            inset-x-0 bottom-0 max-h-[55vh] overflow-auto rounded-t-lg p-4
            sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-24 sm:w-96 sm:max-h-[70vh] sm:rounded-md"
          aria-label={`${selected.properties.name} summary`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-xs uppercase tracking-wider text-[var(--muted)]">{selected.properties.status.replaceAll("_", " ")}</p>
              <h2 className="font-display text-xl m-0 mt-1">{selected.properties.name}</h2>
              <p className="m-0 mt-1 text-sm text-[var(--muted)]">{selected.properties.operator} · {selected.properties.local_authority}</p>
            </div>
            <button
              type="button"
              className="text-[var(--muted)] border-0 bg-transparent cursor-pointer text-lg leading-none"
              onClick={() => setSelected(null)}
              aria-label="Close panel"
            >
              ×
            </button>
          </div>
          <p className="text-sm mt-3 mb-0">{selected.properties.summary}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm mt-3 mb-0">
            <dt className="text-[var(--muted)]">Stated size</dt>
            <dd className="m-0 font-tabular">
              {best ? (
                <>
                  <span>
                    {formatNumber(best.quantity.value)} megawatts · {powerKindLabel(best.kind)}
                  </span>
                  <span className="block text-xs text-[var(--muted)] font-sans font-normal mt-0.5 leading-snug">
                    How large the scheme claims to be, not how much electricity it will use day to day.
                  </span>
                  <span className="block text-xs text-[var(--muted)] font-sans font-normal mt-0.5 leading-snug">
                    Source: {best.quantity.source}
                  </span>
                </>
              ) : scale?.mode === "acreage_undisclosed" ? (
                "Not disclosed; circle sized by site area"
              ) : scale?.mode === "location_only" ? (
                "Not disclosed; marker shows location only"
              ) : (
                "Not disclosed"
              )}
            </dd>
            <dt className="text-[var(--muted)]">Site area</dt>
            <dd className="m-0 font-tabular">
              {selected.properties.land.acres
                ? `${formatNumber(selected.properties.land.acres.value)} acres`
                : scale?.mode === "location_only"
                  ? "Not disclosed"
                  : "Unknown"}
              {" · "}
              {selected.properties.land.land_type === "brownfield"
                ? "brownfield"
                : selected.properties.land.land_type === "agricultural"
                  ? "farmland"
                  : "industrial"}
            </dd>
          </dl>
          <p className="mt-4 mb-0">
            <a href={`${baseUrl}/site/${selected.properties.id}`}>Full site details →</a>
          </p>
        </aside>
      )}

      <style>{`
        .maplibregl-coop-gesture-screen { background: rgba(247,246,242,0.85) !important; color: #1a1d1f !important; }
        .ycb-zone-label {
          white-space: nowrap;
          padding: 2px 7px;
          border-radius: 9999px;
          background: ${ZONE_COLOUR};
          color: #ffffff;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

function ScaleBar() {
  const refs = [
    { label: "5 MW", mw: 5 },
    { label: "100 MW", mw: 100 },
    { label: "1 GW", mw: 1000 },
  ];
  const statusKeys: Array<{ label: string; colour: string }> = [
    { label: "Proposed", colour: statusColour("proposed") },
    { label: "In planning", colour: statusColour("in_planning") },
    { label: "Approved", colour: statusColour("approved") },
    { label: "Building", colour: statusColour("under_construction") },
    { label: "Operating", colour: statusColour("operating") },
  ];
  return (
    <div
      className="absolute bottom-3 left-3 z-10 max-w-[17.5rem] rounded-md border border-[var(--line)] bg-[var(--map-panel)] px-3 py-2.5 text-xs shadow-sm"
      aria-label="How to read map circles. Colour is planning status. Outline style is whether power is disclosed. Size is megawatts or site area."
    >
      <p className="m-0 mb-2 font-display tracking-wide uppercase text-[0.65rem] text-[var(--muted)]">
        How to read the circles
      </p>

      <p className="m-0 mb-1 text-[0.65rem] text-[var(--muted)]">
        Colour = planning status
      </p>
      <ul className="m-0 mb-2.5 list-none grid grid-cols-2 grid-rows-3 grid-flow-col gap-x-3 gap-y-1 p-0 text-[0.7rem] leading-snug text-[var(--ink)]">
        {statusKeys.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 min-w-0">
            <span
              className="inline-block shrink-0 rounded-full border-2"
              style={{
                width: 12,
                height: 12,
                borderColor: s.colour,
                background: `${s.colour}66`,
              }}
              aria-hidden
            />
            <span className="truncate">{s.label}</span>
          </li>
        ))}
      </ul>

      <p className="m-0 mb-1 text-[0.65rem] text-[var(--muted)]">
        Outline = size disclosed
      </p>
      <ul className="m-0 mb-2.5 list-none space-y-1.5 p-0 text-[0.7rem] leading-snug text-[var(--ink)]">
        <li className="flex items-center gap-2">
          <span
            className="inline-block shrink-0 rounded-full border-2 border-[var(--ink)] bg-[var(--ink)]/20"
            style={{ width: 14, height: 14 }}
            aria-hidden
          />
          <span>Solid fill: megawatts published</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            className="inline-block shrink-0 rounded-full border-2 border-dashed border-[var(--ink)] bg-transparent"
            style={{ width: 14, height: 14 }}
            aria-hidden
          />
          <span>Dashed: megawatts not disclosed (sized by site area, or location only if area unknown)</span>
        </li>
      </ul>
      <p className="m-0 mb-2 text-[0.65rem] text-[var(--muted)] leading-snug">
        Grey demos above are style only, not a status colour.
      </p>

      <p className="m-0 mb-1.5 text-[0.65rem] text-[var(--muted)]">
        Size = stated megawatts when known
      </p>
      <div className="flex items-end gap-3">
        {refs.map((r) => {
          const px = 8 + Math.sqrt(r.mw / 1000) * 28;
          return (
            <div key={r.label} className="flex flex-col items-center gap-1">
              <span
                className="rounded-full border-2 border-[var(--ink)] bg-[var(--ink)]/15"
                style={{ width: px, height: px }}
                aria-hidden
              />
              <span className="font-tabular text-[var(--ink)]">{r.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
