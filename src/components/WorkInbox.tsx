import { useState } from "react";
import { Inbox, Check, Plus, Trash2 } from "lucide-react";
import type { InboxItem } from "../data/state";
import usePersistedState from "../hooks/usePersistedState";
import { whenLocked } from "../lib/whenLocked";

interface Props {
  initialItems: InboxItem[];
  locked?: boolean;
  /** En vista Todo: ocupa el alto restante de la columna (alineado con UBA). */
  fillHeight?: boolean;
}

const PRIORITY_CYCLE: InboxItem["priority"][] = ["low", "medium", "high"];

const PRIORITY_CHIP: Record<InboxItem["priority"], string> = {
  high: "bg-red-500/20 text-red-400",
  medium: "bg-amber-500/20 text-amber-400",
  low: "bg-blue-500/20 text-blue-400",
};

const PRIORITY_BUTTON_STYLES: Record<InboxItem["priority"], string> = {
  high: `${PRIORITY_CHIP.high} hover:bg-red-500/30`,
  medium: `${PRIORITY_CHIP.medium} hover:bg-amber-500/30`,
  low: `${PRIORITY_CHIP.low} hover:bg-blue-500/30`,
};

function parsePriority(raw: string): { text: string; priority: InboxItem["priority"] } {
  if (raw.startsWith("!h ")) return { text: raw.slice(3), priority: "high" };
  if (raw.startsWith("!m ")) return { text: raw.slice(3), priority: "medium" };
  return { text: raw, priority: "low" };
}

function nextPriority(current: InboxItem["priority"]): InboxItem["priority"] {
  const idx = PRIORITY_CYCLE.indexOf(current);
  return PRIORITY_CYCLE[(idx + 1) % PRIORITY_CYCLE.length];
}

export default function WorkInbox({
  initialItems,
  locked = false,
  fillHeight = false,
}: Props) {
  const [items, setItems] = usePersistedState<InboxItem[]>("inbox_items", initialItems);
  const [draft, setDraft] = useState("");

  const toggleDone = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    );
  };

  const cyclePriority = (id: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, priority: nextPriority(it.priority) } : it,
      ),
    );
  };

  const remove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const { text, priority } = parsePriority(trimmed);
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, priority, done: false },
    ]);
    setDraft("");
  };

  return (
    <section
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 ${
        fillHeight ? "flex min-h-0 flex-1 flex-col" : ""
      }`}
    >
      <div className="mb-5 flex shrink-0 items-center gap-2.5">
        <Inbox className="h-4 w-4 text-neutral-500" />
        <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
          Tareas pendientes
        </h2>
      </div>

      <div
        className={
          fillHeight ? "flex min-h-0 flex-1 flex-col" : "flex flex-col"
        }
      >
        {items.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-600 italic">
            Sin pendientes — enfocate en el estudio.
          </p>
        )}

        <ul
          className={`space-y-1 ${fillHeight && items.length > 0 ? "min-h-0 flex-1 overflow-y-auto" : ""}`}
        >
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]"
          >
            <button
              type="button"
              onClick={() => toggleDone(item.id)}
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                item.done
                  ? "border-indigo-500/60 bg-indigo-500/20"
                  : "border-white/10 bg-transparent hover:border-white/20"
              }`}
            >
              {item.done && <Check className="h-2.5 w-2.5 text-indigo-400" />}
            </button>

            <span
              className={`flex-1 text-sm transition-colors ${whenLocked(locked)} ${
                item.done ? "text-neutral-600 line-through" : "text-neutral-300"
              }`}
            >
              {item.text}
            </span>

            <button
              type="button"
              onClick={() => cyclePriority(item.id)}
              className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-medium uppercase transition-colors ${PRIORITY_BUTTON_STYLES[item.priority]}`}
            >
              {item.priority}
            </button>

            {!locked && (
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="cursor-pointer text-neutral-700 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
        </ul>

        <div className="mt-3 flex shrink-0 gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="!h urgente · !m normal · sin prefijo = low"
            className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-sm text-neutral-300 placeholder:text-neutral-700 outline-none transition-colors focus:border-white/[0.12]"
          />
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-white/[0.06] bg-white/[0.05] px-2.5 py-1.5 text-neutral-500 transition-colors hover:bg-white/[0.08] hover:text-neutral-300"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
