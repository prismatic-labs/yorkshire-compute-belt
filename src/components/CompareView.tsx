import { useMemo, useRef, useState } from "react";
import type { SiteFeature } from "../lib/types";
import { compareRadiusPx, statusColour } from "../lib/mapScale";
import {
  bestPower,
  compareSitesByPower,
  formatNumber,
  powerCompetitionRanks,
  powerKindLabel,
} from "../lib/units";

interface Props {
  sites: SiteFeature[];
  baseUrl: string;
  siteUrl: string;
}

function formatMw(n: number): string {
  const digits = Number.isInteger(n) ? 0 : 1;
  return formatNumber(n, digits);
}

export default function CompareView({ sites, baseUrl, siteUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const { withPower, withoutPower, powerRanks, powerMw } = useMemo(() => {
    const withP: SiteFeature[] = [];
    const without: SiteFeature[] = [];
    for (const s of sites) {
      if (bestPower(s.properties.power)) withP.push(s);
      else without.push(s);
    }
    withP.sort((a, b) =>
      compareSitesByPower(
        bestPower(a.properties.power)?.quantity.value ?? 0,
        a.properties.name,
        bestPower(b.properties.power)?.quantity.value ?? 0,
        b.properties.name,
      ),
    );
    without.sort(
      (a, b) =>
        (b.properties.land.acres?.value ?? 0) - (a.properties.land.acres?.value ?? 0),
    );
    const mwValues = withP.map((s) => bestPower(s.properties.power)!.quantity.value);
    return {
      withPower: withP,
      withoutPower: without,
      powerRanks: powerCompetitionRanks(mwValues),
      powerMw: mwValues,
    };
  }, [sites]);

  const sortedAll = useMemo(
    () => [...withPower, ...withoutPower],
    [withPower, withoutPower],
  );

  function exportPng() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 1400;
    const H = 820;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = "#F7F6F2";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#1A1D1F";
    ctx.font = "700 42px Familjen Grotesk, Gill Sans, sans-serif";
    ctx.fillText("GOD'S OWN COMPUTE", 48, 64);

    ctx.font = "400 20px Source Sans 3, sans-serif";
    ctx.fillStyle = "#5C636A";
    ctx.fillText(
      "Physical power footprint of data centres across Yorkshire and the Humber",
      48,
      98,
    );
    ctx.font = "400 14px Source Sans 3, sans-serif";
    ctx.fillText(
      "Filled = megawatts disclosed (area matches power). Dashed = megawatts not disclosed (sized by acres).",
      48,
      126,
    );

    const maxMw = 1000;
    const cols = sortedAll.length;
    const slot = (W - 96) / cols;
    sortedAll.forEach((site, i) => {
      const best = bestPower(site.properties.power);
      const acres = site.properties.land.acres?.value ?? null;
      const { r, mode } = compareRadiusPx(best?.quantity.value ?? null, acres, {
        maxMw,
        maxPx: 100,
      });
      const cx = 48 + slot * i + slot / 2;
      const cy = 400;
      const colour = statusColour(site.properties.status);

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(r, 4), 0, Math.PI * 2);
      if (mode === "acreage_undisclosed" || mode === "location_only") {
        ctx.setLineDash([6, 5]);
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = colour + "55";
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = "#1A1D1F";
      ctx.font = "600 14px Source Sans 3, sans-serif";
      ctx.textAlign = "center";
      wrapText(ctx, site.properties.name, cx, cy + r + 28, slot - 12, 16);

      ctx.fillStyle = "#5C636A";
      ctx.font = "400 12px ui-monospace, monospace";
      const powerLabel = best
        ? `${formatMw(best.quantity.value)} MW · ${powerKindLabel(best.kind)}`
        : acres
          ? `${formatNumber(acres)} acres; MW not disclosed`
          : "MW not disclosed";
      wrapText(ctx, powerLabel, cx, cy + r + 70, slot - 10, 14);
      ctx.textAlign = "start";
    });

    ctx.fillStyle = "#5C636A";
    ctx.font = "400 13px Source Sans 3, sans-serif";
    const date = new Date().toISOString().slice(0, 10);
    ctx.fillText(
      `${date} · ${siteUrl} · stated power size only; load factor unknown`,
      48,
      H - 36,
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gods-own-compute-${date}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setExportNote(
        "PNG downloaded. Image title uses the share nickname “God's Own Compute”; the website itself does not.",
      );
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Legend />
        <button
          type="button"
          onClick={exportPng}
          className="font-display text-sm uppercase tracking-wider border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-4 py-2 cursor-pointer shrink-0"
        >
          Export PNG
        </button>
      </div>
      {exportNote && (
        <p className="text-sm text-[var(--muted)] m-0" role="status">
          {exportNote}
        </p>
      )}

      <section>
        <h2 className="font-display text-lg m-0 tracking-tight">
          Stated size disclosed (by megawatts)
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1 mb-4 max-w-2xl">
          Sorted by each site’s published power size: biggest size stated for that site if
          recorded, otherwise grid connection applied for, otherwise first stage only. Equal
          megawatt figures share a rank (joint largest) and are listed A-Z. Circle area matches
          megawatts; colour is status, same as the map.
        </p>
        <ol className="list-none m-0 p-0 space-y-3 border border-[var(--line)] bg-white/40">
          {withPower.map((site, i) => {
            const best = bestPower(site.properties.power)!;
            const rank = powerRanks[i]!;
            const tied = powerMw.filter((v) => v === best.quantity.value).length > 1;
            const { r } = compareRadiusPx(best.quantity.value, null, {
              maxMw: 1000,
              maxPx: 40,
            });
            const colour = statusColour(site.properties.status);
            const size = Math.max(r * 2, 10);
            return (
              <li key={site.properties.id} className="border-b border-[var(--line)] last:border-b-0">
                <a
                  href={`${baseUrl}/site/${site.properties.id}`}
                  className="grid grid-cols-[2rem_5.5rem_1fr] sm:grid-cols-[2.5rem_6.5rem_1fr_auto] items-center gap-3 sm:gap-4 px-3 py-3 no-underline text-[var(--ink)] hover:bg-[var(--paper)]"
                >
                  <span className="font-tabular text-[var(--muted)] text-sm">
                    {tied ? `${rank}=` : rank}
                  </span>
                  <span className="flex h-[5.5rem] sm:h-[6.5rem] items-center justify-center" aria-hidden>
                    <span
                      className="rounded-full block shrink-0"
                      style={{
                        width: size,
                        height: size,
                        minWidth: size,
                        minHeight: size,
                        aspectRatio: "1",
                        border: `2px solid ${colour}`,
                        background: `${colour}44`,
                      }}
                    />
                  </span>
                  <span>
                    <span className="font-display block leading-snug">{site.properties.name}</span>
                    <span className="text-xs text-[var(--muted)] capitalize">
                      {site.properties.status.replaceAll("_", " ")}
                    </span>
                  </span>
                  <span className="font-tabular text-sm sm:text-right col-span-3 sm:col-span-1 pl-[calc(2rem+5.5rem+0.75rem)] sm:pl-0">
                    <strong>{formatMw(best.quantity.value)} MW</strong>
                    <span className="text-[var(--muted)]">
                      {" · "}
                      {powerKindLabel(best.kind)}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      {withoutPower.length > 0 && (
        <section>
          <h2 className="font-display text-lg m-0 tracking-tight">
            Megawatts not disclosed
          </h2>
          <p className="text-sm text-[var(--muted)] mt-1 mb-4 max-w-2xl">
            These sites have no public megawatt figure. Dashed circles use site area when known;
            if area is also unknown, the marker is location only. Do not read them as size against
            the list above.
          </p>
          <ul className="list-none m-0 p-0 space-y-3 border border-[var(--line)] border-dashed bg-white/40">
            {withoutPower.map((site) => {
              const acres = site.properties.land.acres?.value ?? null;
              const { r } = compareRadiusPx(null, acres, { maxMw: 1000, maxPx: 40 });
              const colour = statusColour(site.properties.status);
              const size = Math.max(r * 2, 14);
              return (
                <li key={site.properties.id} className="border-b border-[var(--line)] last:border-b-0">
                  <a
                    href={`${baseUrl}/site/${site.properties.id}`}
                    className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[6.5rem_1fr_auto] items-center gap-3 sm:gap-4 px-3 py-3 no-underline text-[var(--ink)] hover:bg-[var(--paper)]"
                  >
                    <span className="flex h-[5.5rem] sm:h-[6.5rem] items-center justify-center" aria-hidden>
                      <span
                        className="rounded-full block shrink-0"
                        style={{
                          width: size,
                          height: size,
                          minWidth: size,
                          minHeight: size,
                          aspectRatio: "1",
                          border: `2px dashed ${colour}`,
                          background: "transparent",
                        }}
                      />
                    </span>
                    <span>
                      <span className="font-display block leading-snug">{site.properties.name}</span>
                      <span className="text-xs text-[var(--muted)] capitalize">
                        {site.properties.status.replaceAll("_", " ")}
                      </span>
                    </span>
                    <span className="font-tabular text-sm sm:text-right text-[var(--muted)] col-span-2 sm:col-span-1 pl-[calc(5.5rem+0.75rem)] sm:pl-0">
                      {acres != null
                        ? `${formatNumber(acres)} acres · power not disclosed`
                        : "Site area and power not disclosed"}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <canvas ref={canvasRef} className="hidden" aria-hidden />
    </div>
  );
}

function Legend() {
  const statusKeys: Array<{ label: string; colour: string }> = [
    { label: "Proposed", colour: statusColour("proposed") },
    { label: "In planning", colour: statusColour("in_planning") },
    { label: "Approved", colour: statusColour("approved") },
    { label: "Building", colour: statusColour("under_construction") },
    { label: "Operating", colour: statusColour("operating") },
  ];
  return (
    <div
      className="text-sm border border-[var(--line)] bg-[var(--paper)] px-3 py-2 max-w-md"
      aria-label="How to read the circles. Colour is planning status. Outline is disclosure. Size is megawatts or site area."
    >
      <p className="m-0 font-display text-xs uppercase tracking-wider text-[var(--muted)]">
        How to read
      </p>
      <p className="m-0 mt-2 text-xs text-[var(--muted)]">Colour = planning status</p>
      <ul className="m-0 mt-1.5 pl-0 list-none grid grid-cols-2 grid-rows-3 grid-flow-col gap-x-3 gap-y-1">
        {statusKeys.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-block rounded-full shrink-0"
              style={{
                width: 12,
                height: 12,
                border: `2px solid ${s.colour}`,
                background: `${s.colour}66`,
              }}
              aria-hidden
            />
            <span>{s.label}</span>
          </li>
        ))}
      </ul>
      <p className="m-0 mt-2.5 text-xs text-[var(--muted)]">Outline = size disclosed</p>
      <ul className="m-0 mt-1.5 pl-0 list-none space-y-1.5">
        <li className="flex items-center gap-2 text-xs">
          <span
            className="inline-block rounded-full shrink-0"
            style={{
              width: 16,
              height: 16,
              border: "2px solid #1A1D1F",
              background: "#1A1D1F33",
            }}
            aria-hidden
          />
          <span>Solid: megawatts published (area ∝ MW)</span>
        </li>
        <li className="flex items-center gap-2 text-xs">
          <span
            className="inline-block rounded-full shrink-0"
            style={{
              width: 16,
              height: 16,
              border: "2px dashed #1A1D1F",
              background: "transparent",
            }}
            aria-hidden
          />
          <span>Dashed: megawatts unknown; sized by site area</span>
        </li>
      </ul>
      <p className="m-0 mt-1.5 text-[0.65rem] text-[var(--muted)] leading-snug">
        Grey demos are style only, not a status colour.
      </p>
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}
