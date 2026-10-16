"use client";

import { useState } from "react";
import type { Channel } from "@/lib/backoffice/types";
import type { Dashboard } from "@/lib/backoffice/calc";
import { CHANNEL_LABEL } from "@/lib/backoffice/calc";
import { formatPrice } from "@/lib/format";

// Validated categorical palette (light surface): cobalt, flare, deep lime.
// Lime is below 3:1 on the panel, so the chart always ships a legend and a table view.
export const CHANNEL_COLOR: Record<Channel, string> = { website: "#0462d3", private: "#d52200", agent: "#7db20d" };
const ORDER: Channel[] = ["website", "private", "agent"];

const compact = (n: number) => (n >= 1_000_000 ? `R${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `R${Math.round(n / 1000)}K` : `R${Math.round(n)}`);
const monthName = (key: string) => new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-ZA", { month: "short", timeZone: "UTC" });

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** Monthly turnover stacked by sales channel, with hover detail and a table view. */
export function SalesChart({ months }: { months: Dashboard["months"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const totals = months.map((m) => ORDER.reduce((n, c) => n + m.values[c], 0));
  const max = niceMax(Math.max(...totals));
  const W = 600, H = 240, left = 48, bottom = 28, top = 12;
  const plotH = H - bottom - top;
  const band = (W - left) / months.length;
  const barW = Math.min(24, band * 0.5);
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-4 text-sm" aria-label="Legend">
          {ORDER.map((c) => (
            <li key={c} className="flex items-center gap-2"><span className="h-3 w-3 rounded-[2px]" style={{ background: CHANNEL_COLOR[c] }} />{CHANNEL_LABEL[c]}</li>
          ))}
        </ul>
        <button type="button" onClick={() => setTable((t) => !t)} className="font-mono text-xs font-bold uppercase tracking-wider underline hover:text-flare">
          {table ? "Show chart" : "Show as table"}
        </button>
      </div>

      {table ? (
        <div className="overflow-x-auto">
          <table className="num w-full min-w-[28rem] text-sm">
            <thead><tr className="border-b-2 border-ink text-left">
              <th className="py-2 pr-3 font-mono text-xs uppercase tracking-wider">Month</th>
              {ORDER.map((c) => <th key={c} className="py-2 pr-3 text-right font-mono text-xs uppercase tracking-wider">{CHANNEL_LABEL[c]}</th>)}
              <th className="py-2 text-right font-mono text-xs uppercase tracking-wider">Total</th>
            </tr></thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={m.month} className="border-b border-line">
                  <td className="py-2 pr-3">{monthName(m.month)} {m.month.slice(0, 4)}</td>
                  {ORDER.map((c) => <td key={c} className="py-2 pr-3 text-right">{formatPrice(m.values[c])}</td>)}
                  <td className="py-2 text-right font-bold">{formatPrice(totals[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Monthly turnover by sales channel for the last six months">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={W} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
                <text x={left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)" className="num">{compact(t)}</text>
              </g>
            ))}
            {months.map((m, i) => {
              const cx = left + band * i + band / 2;
              let acc = 0;
              const segments = ORDER.filter((c) => m.values[c] > 0);
              return (
                <g key={m.month}>
                  {segments.map((c, si) => {
                    const v = m.values[c];
                    const y0 = y(acc), y1 = y(acc + v);
                    acc += v;
                    const isTop = si === segments.length - 1;
                    // 2px surface gap between stacked segments; rounded data-end only on the top.
                    const h = Math.max(0, y0 - y1 - (si > 0 ? 2 : 0));
                    const yTop = y1;
                    return isTop ? (
                      <path key={c} d={`M${cx - barW / 2} ${yTop + h} V${yTop + 4} Q${cx - barW / 2} ${yTop} ${cx - barW / 2 + 4} ${yTop} H${cx + barW / 2 - 4} Q${cx + barW / 2} ${yTop} ${cx + barW / 2} ${yTop + 4} V${yTop + h} Z`} fill={CHANNEL_COLOR[c]} opacity={hover === null || hover === i ? 1 : 0.45} />
                    ) : (
                      <rect key={c} x={cx - barW / 2} y={yTop} width={barW} height={h} fill={CHANNEL_COLOR[c]} opacity={hover === null || hover === i ? 1 : 0.45} />
                    );
                  })}
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)">{monthName(m.month)}</text>
                  {/* Hit target: the whole band, larger than the bar. */}
                  <rect
                    x={left + band * i} y={top} width={band} height={plotH} fill="transparent" tabIndex={0}
                    aria-label={`${monthName(m.month)}: ${formatPrice(totals[i])} total`}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-48 border-2 border-ink bg-panel p-3 text-sm shadow-[4px_4px_0_0_var(--color-ink)]"
              style={{ left: `clamp(0px, calc(${((left + band * hover + band / 2) / W) * 100}% - 6rem), calc(100% - 12rem))` }}
            >
              <p className="font-bold">{monthName(months[hover].month)} {months[hover].month.slice(0, 4)}</p>
              {ORDER.map((c) => (
                <p key={c} className="num mt-1 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: CHANNEL_COLOR[c] }} />{CHANNEL_LABEL[c]}</span>
                  <span>{formatPrice(months[hover].values[c])}</span>
                </p>
              ))}
              <p className="num mt-2 flex justify-between border-t border-line pt-2 font-bold"><span>Total</span><span>{formatPrice(totals[hover])}</span></p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
