import { useState, useEffect, useRef, useCallback } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import usePersistedState from "../hooks/usePersistedState";

const IDLE_MS = 800;

interface DayEntry {
  text: string;
  lastModified: string;
}

type ScratchpadStore = Record<string, DayEntry>;

function dateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

function dayLabel(offset: number): string {
  if (offset === 0) return "Hoy";
  if (offset === 1) return "Ayer";
  return `Hace ${offset} días`;
}

const DAY_OFFSETS = [0, 1, 2] as const;

export default function Scratchpad() {
  const [store, setStore] = usePersistedState<ScratchpadStore>("scratchpad_v2", {});
  const [activeDay, setActiveDay] = useState(0);
  const [typing, setTyping] = useState(false);
  const [showPurge, setShowPurge] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const purgeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const key = dateKey(activeDay);
  const currentText = store[key]?.text ?? "";

  const handleChange = useCallback(
    (val: string) => {
      setStore((prev) => ({
        ...prev,
        [key]: { text: val, lastModified: new Date().toISOString() },
      }));
      setTyping(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setTyping(false), IDLE_MS);
    },
    [key, setStore],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Close purge menu on outside click
  useEffect(() => {
    if (!showPurge) return;
    const handler = (e: MouseEvent) => {
      if (purgeRef.current && !purgeRef.current.contains(e.target as Node)) {
        setShowPurge(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPurge]);

  const purge = (mode: "1h" | "24h" | "7d" | "all") => {
    const now = Date.now();
    setStore((prev) => {
      if (mode === "all") return {};

      const cutoff =
        mode === "1h"
          ? 60 * 60 * 1000
          : mode === "24h"
            ? 24 * 60 * 60 * 1000
            : 7 * 24 * 60 * 60 * 1000;

      const next: ScratchpadStore = {};
      for (const [k, entry] of Object.entries(prev)) {
        const age = now - new Date(entry.lastModified).getTime();
        if (age > cutoff) next[k] = entry;
      }
      return next;
    });
    setShowPurge(false);
    textareaRef.current?.focus();
  };

  const hasContent = Object.keys(store).length > 0;

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
      {/* Header row */}
      <div className="mb-4 flex items-center gap-2.5">
        <StickyNote className="h-4 w-4 text-neutral-500" />
        <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
          Scratchpad
        </h2>

        {/* Day tabs */}
        <div className="ml-3 flex rounded-md border border-white/[0.06] bg-white/[0.02] p-0.5">
          {DAY_OFFSETS.map((offset) => {
            const dk = dateKey(offset);
            const hasEntry = !!store[dk]?.text;
            return (
              <button
                key={offset}
                type="button"
                onClick={() => setActiveDay(offset)}
                className={`rounded px-2.5 py-0.5 text-[11px] font-medium transition-all ${
                  activeDay === offset
                    ? "bg-white/[0.08] text-neutral-300"
                    : hasEntry
                      ? "text-neutral-500 hover:text-neutral-400"
                      : "text-neutral-700 hover:text-neutral-600"
                }`}
              >
                {dayLabel(offset)}
              </button>
            );
          })}
        </div>

        {/* Right-aligned: save indicator + purge */}
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`text-[10px] transition-all duration-300 ${
              typing
                ? "text-amber-500/70"
                : currentText
                  ? "text-emerald-600"
                  : "text-neutral-800"
            }`}
          >
            {typing ? "· Guardando..." : currentText ? "· Guardado" : ""}
          </span>

          {hasContent && (
            <div className="relative" ref={purgeRef}>
              <button
                type="button"
                onClick={() => setShowPurge((v) => !v)}
                className={`rounded p-1 transition-colors ${
                  showPurge
                    ? "bg-white/[0.08] text-neutral-400"
                    : "text-neutral-700 hover:bg-white/[0.04] hover:text-neutral-500"
                }`}
              >
                <Trash2 className="h-3 w-3" />
              </button>

              {showPurge && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#141417] shadow-2xl shadow-black/50">
                  <div className="px-3 py-2 border-b border-white/[0.06]">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      Borrar historial
                    </p>
                  </div>
                  {(
                    [
                      ["1h", "Última hora"],
                      ["24h", "Últimas 24 horas"],
                      ["7d", "Últimos 7 días"],
                      ["all", "Todo el historial"],
                    ] as const
                  ).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => purge(mode)}
                      className={`flex w-full items-center px-3 py-2 text-left text-xs transition-colors hover:bg-white/[0.04] ${
                        mode === "all"
                          ? "text-red-400/80 hover:text-red-400"
                          : "text-neutral-400 hover:text-neutral-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={currentText}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={
          activeDay === 0
            ? "Ideas, snippets, recordatorios al vuelo..."
            : `Notas de ${dayLabel(activeDay).toLowerCase()}...`
        }
        rows={5}
        spellCheck={false}
        className="enable-selection cursor-text w-full resize-y rounded-lg border border-white/[0.04] bg-white/[0.02] px-4 py-3 font-mono text-sm leading-relaxed text-neutral-400 placeholder:text-neutral-700 outline-none transition-colors focus:border-white/[0.10] focus:text-neutral-300"
      />
    </section>
  );
}
