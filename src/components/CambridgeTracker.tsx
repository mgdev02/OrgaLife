/**
 * CambridgeTracker — English proficiency tracker for Cambridge Institute.
 *
 * CURRENT STATE: Placeholder mode — waiting for placement test results.
 *
 * REACTIVATION GUIDE (for Cursor / future self):
 * Once the placement interview is complete and a level is assigned,
 * restore the full tracker by:
 *
 * 1. Set `PLACEMENT_DONE` to `true`.
 * 2. Update `INITIAL_CAMBRIDGE_GOALS` in `src/data/state.ts` with real
 *    targets calibrated to the assigned level. The goal structure is:
 *
 *    - id: "c1"  | Vocab técnico dominado     | target: words mastered
 *    - id: "c2"  | Speaking practice           | target: total sessions planned
 *    - id: "c3"  | Writing assignments         | target: total submissions expected
 *    - id: "c4"  | Mock exams completados      | target: practice exams before cert
 *
 * 3. The component reads persisted state from localStorage key
 *    `facu_dashboard_cambridge_goals`. If stale data exists from a
 *    previous config, clear it once:
 *      localStorage.removeItem("facu_dashboard_cambridge_goals")
 *
 * 4. Each goal renders as a progress bar (pink-500/70) with +/- buttons.
 *    The `adjust` function clamps between 0 and `goal.target`.
 *
 * 5. All progress is auto-persisted via `usePersistedState`.
 */

import { Languages, Plus, Minus } from "lucide-react";
import type { CambridgeGoal } from "../data/state";
import usePersistedState from "../hooks/usePersistedState";
import { whenLocked } from "../lib/whenLocked";

const PLACEMENT_DONE = false;

interface Props {
  initialGoals: CambridgeGoal[];
  locked?: boolean;
}

export default function CambridgeTracker({ initialGoals, locked = false }: Props) {
  const [goals, setGoals] = usePersistedState<CambridgeGoal[]>(
    "cambridge_goals",
    initialGoals,
  );

  const adjust = (id: string, delta: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, current: Math.max(0, Math.min(g.target, g.current + delta)) }
          : g,
      ),
    );
  };

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <Languages className="h-4 w-4 text-neutral-500" />
        <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
          Cambridge — Inglés
        </h2>
      </div>

      {!PLACEMENT_DONE ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-500/10">
            <Languages className="h-5 w-5 text-pink-400/70" />
          </div>
          <p
            className={`text-sm font-medium text-neutral-300 ${whenLocked(locked)}`}
          >
            Nivelación Pendiente
          </p>
          <p
            className={`max-w-xs text-center text-xs leading-relaxed text-neutral-600 ${whenLocked(locked)}`}
          >
            Entrevista de nivelación en Cambridge programada para mañana.
            Los objetivos de progreso se activarán una vez confirmado el nivel.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((g) => {
            const pct = (g.current / g.target) * 100;
            return (
              <div key={g.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span
                    className={`text-sm text-neutral-300 ${whenLocked(locked)}`}
                  >
                    {g.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => adjust(g.id, -1)}
                        className="rounded p-0.5 text-neutral-600 transition-colors hover:bg-white/[0.06] hover:text-neutral-400"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                    )}
                    <span
                      className={`min-w-[4.5rem] text-center font-mono text-xs text-neutral-500 ${whenLocked(locked)}`}
                    >
                      {g.current} / {g.target} {g.unit}
                    </span>
                    {!locked && (
                      <button
                        type="button"
                        onClick={() => adjust(g.id, 1)}
                        className="rounded p-0.5 text-neutral-600 transition-colors hover:bg-white/[0.06] hover:text-neutral-400"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-pink-500/70 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
