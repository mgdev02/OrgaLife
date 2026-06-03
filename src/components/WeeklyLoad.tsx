import { useState } from "react";
import { Clock, Settings } from "lucide-react";
import type { WeeklyBlock } from "../data/state";
import usePersistedState from "../hooks/usePersistedState";
import { whenLocked } from "../lib/whenLocked";

interface Props {
  blocks: WeeklyBlock[];
  locked?: boolean;
}

export default function WeeklyLoad({ blocks: defaultBlocks, locked = false }: Props) {
  const [blocks, setBlocks] = usePersistedState<WeeklyBlock[]>(
    "weekly_blocks",
    defaultBlocks,
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showSliders, setShowSliders] = useState(false);

  const totalHours = blocks.reduce((s, b) => s + b.hours, 0);
  const freeHours = 168 - totalHours;

  const updateHours = (idx: number, hours: number) => {
    setBlocks((prev) =>
      prev.map((b, i) => (i === idx ? { ...b, hours } : b)),
    );
  };

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <Clock className="h-4 w-4 text-neutral-500" />
        <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
          Carga semanal
        </h2>
        <span
          className={`ml-auto font-mono text-xs text-neutral-600 ${whenLocked(locked)}`}
        >
          {totalHours}h comprometidas · {freeHours}h libres
        </span>
        {!locked && (
          <button
            type="button"
            onClick={() => setShowSliders((v) => !v)}
            className={`ml-2 rounded-md p-1 transition-colors ${
              showSliders
                ? "bg-white/[0.08] text-neutral-300"
                : "text-neutral-600 hover:bg-white/[0.06] hover:text-neutral-400"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Stacked bar */}
      <div className="mb-4 flex h-10 overflow-hidden rounded-lg">
        {blocks.map((b, i) => {
          const pct = totalHours > 0 ? (b.hours / totalHours) * 100 : 0;
          const isHovered = hoveredIdx === i;
          return (
            <div
              key={b.label}
              className="relative flex items-center justify-center transition-all duration-200"
              style={{
                width: `${pct}%`,
                backgroundColor: b.color,
                opacity: hoveredIdx !== null && !isHovered ? 0.35 : 1,
              }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span
                className={`text-xs font-semibold text-white mix-blend-difference ${whenLocked(locked)}`}
              >
                {b.hours}h
              </span>
              {isHovered && (
                <div
                  className={`pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-neutral-200 shadow-lg ring-1 ring-white/10 ${whenLocked(locked)}`}
                >
                  {b.description}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {blocks.map((b) => (
          <div
            key={b.label}
            className={`flex items-center gap-1.5 text-xs text-neutral-400 ${whenLocked(locked)}`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: b.color }}
            />
            {b.label}
          </div>
        ))}
      </div>

      {/* Sliders panel */}
      <div
        className="grid transition-[grid-template-rows] duration-200"
        style={{ gridTemplateRows: showSliders && !locked ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-5">
            {blocks.map((b, i) => (
              <div key={b.label} className="flex items-center gap-3">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                <span className="w-20 shrink-0 text-xs text-neutral-400">
                  {b.label}
                </span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={b.hours}
                  onChange={(e) => updateHours(i, Number(e.target.value))}
                  className="range-slider flex-1"
                  style={
                    { "--range-color": b.color } as React.CSSProperties
                  }
                />
                <span className="w-10 text-right font-mono text-xs text-neutral-500">
                  {b.hours}h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
