import { useEffect, useId, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { SiteFeature } from "../lib/types";
import { circleScale, mapRadiusMetres, statusColour } from "../lib/mapScale";
import { formatNumber, powerKindLabel, bestPower } from "../lib/units";

interface Props {
  sites: SiteFeature[];
  baseUrl: string;
  center: [number, number];
  zoom: number;
}

export default function SiteMap({ sites, baseUrl, center, zoom }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selected, setSelected] = useState<SiteFeature | null>(null);
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

    map.on("load", () => {
      for (const site of sites) {
        const scale = circleScale(site.properties);
        const [lng, lat] = site.geometry.coordinates;
        const el = document.createElement("button");
        el.type = "button";
        el.className = "ycb-marker";
        el.setAttribute("aria-label", site.properties.name);
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
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelected(site);
        });
        new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [sites, center, zoom]);

  const best = selected ? bestPower(selected.properties.power) : null;
  const scale = selected ? circleScale(selected.properties) : null;

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
            AI and cloud leave a physical footprint: power, land, and water. This map puts Yorkshire and the Humber data centres, and those figures, where communities can see them.
          </p>
          <nav className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.75rem]" aria-label="Site">
            <a href={`${baseUrl}/sites`} className="text-[var(--ink)]/75 no-underline hover:text-[var(--ink)]">Sites</a>
            <a href={`${baseUrl}/compare`} className="text-[var(--ink)]/75 no-underline hover:text-[var(--ink)]">Compare</a>
            <a href={`${baseUrl}/research`} className="text-[var(--ink)]/75 no-underline hover:text-[var(--ink)]">Research</a>
            <a href={`${baseUrl}/methodology`} className="text-[var(--ink)]/75 no-underline hover:text-[var(--ink)]">Methodology</a>
          </nav>
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
