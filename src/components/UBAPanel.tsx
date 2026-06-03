import { useState } from "react";
import { GraduationCap, Check, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { StudySection, StudyItem } from "../data/state";
import usePersistedState from "../hooks/usePersistedState";
import { whenLocked } from "../lib/whenLocked";

interface Props {
  initialSections: StudySection[];
  locked?: boolean;
}

function countDone(section: StudySection): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const item of section.items) {
    if (item.subtasks?.length) {
      total += item.subtasks.length;
      done += item.subtasks.filter((s) => s.done).length;
    } else {
      total += 1;
      done += item.done ? 1 : 0;
    }
  }
  return { done, total };
}

function isItemFullyDone(item: StudyItem): boolean {
  if (item.subtasks?.length) return item.subtasks.every((s) => s.done);
  return item.done;
}

export default function UBAPanel({ initialSections, locked = false }: Props) {
  const [sections, setSections] = usePersistedState<StudySection[]>(
    "uba_sections",
    initialSections,
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const toggleExpand = (itemId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, title } : s)),
    );
  };

  const addSection = () => {
    const title = newSectionTitle.trim();
    if (!title || locked) return;

    setSections((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title,
        items: [],
      },
    ]);
    setNewSectionTitle("");
  };

  const removeSection = (sectionId: string) => {
    if (locked) return;
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
  };

  const updateItemTitle = (sectionId: string, itemId: string, title: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, title } : it)) }
          : s,
      ),
    );
  };

  const removeItem = (sectionId: string, itemId: string) => {
    if (locked) return;
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section,
      ),
    );
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const addSubtask = (sectionId: string, itemId: string, itemTitle: string) => {
    if (locked) return;

    const label = window.prompt(`Nuevo ejercicio para \"${itemTitle}\"`);
    const trimmed = label?.trim();
    if (!trimmed) return;

    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          items: section.items.map((item) => {
            if (item.id !== itemId) return item;

            const nextSubtasks = [
              ...(item.subtasks ?? []),
              {
                id: crypto.randomUUID(),
                label: trimmed,
                done: false,
              },
            ];

            return {
              ...item,
              subtasks: nextSubtasks,
              done: nextSubtasks.every((subtask) => subtask.done),
            };
          }),
        };
      }),
    );

    setExpanded((prev) => new Set(prev).add(itemId));
  };

  const toggleSimpleItem = (sectionId: string, itemId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((it) =>
                it.id === itemId ? { ...it, done: !it.done } : it,
              ),
            }
          : s,
      ),
    );
  };

  const toggleSubtask = (sectionId: string, itemId: string, subtaskId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              items: s.items.map((it) => {
                if (it.id !== itemId || !it.subtasks) return it;
                const updatedSubs = it.subtasks.map((sub) =>
                  sub.id === subtaskId ? { ...sub, done: !sub.done } : sub,
                );
                return {
                  ...it,
                  subtasks: updatedSubs,
                  done: updatedSubs.every((sub) => sub.done),
                };
              }),
            }
          : s,
      ),
    );
  };

  const removeSubtask = (sectionId: string, itemId: string, subtaskId: string) => {
    if (locked) return;

    setSections((prev) =>
      prev.map((section) => {
        if (section.id !== sectionId) return section;

        return {
          ...section,
          items: section.items.map((item) => {
            if (item.id !== itemId || !item.subtasks) return item;

            const nextSubtasks = item.subtasks.filter((subtask) => subtask.id !== subtaskId);
            if (nextSubtasks.length === 0) {
              return { ...item, subtasks: undefined, done: false };
            }

            return {
              ...item,
              subtasks: nextSubtasks,
              done: nextSubtasks.every((subtask) => subtask.done),
            };
          }),
        };
      }),
    );
  };

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <GraduationCap className="h-4 w-4 text-neutral-500" />
        <h2 className="text-sm font-medium tracking-wide text-neutral-400 uppercase">
          UBA — Segundo cuatrimestre 2026
        </h2>
      </div>

      {!locked && (
        <form
          className="mb-5 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            addSection();
          }}
        >
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Agregar nueva materia..."
            className="no-drag cursor-text min-w-0 flex-1 bg-transparent text-sm text-neutral-300 outline-none placeholder:text-neutral-700"
          />
          <button
            type="submit"
            className="no-drag cursor-pointer rounded-md p-1.5 text-neutral-600 transition-colors hover:bg-white/[0.06] hover:text-neutral-300"
            title="Agregar materia"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </form>
      )}

      <div className="space-y-6">
        {sections.map((section) => {
          const { done, total } = countDone(section);
          const pct = total > 0 ? (done / total) * 100 : 0;

          return (
            <div key={section.id}>
              <div className="mb-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  {locked ? (
                    <h3
                      className={`truncate text-sm font-medium text-neutral-200 ${whenLocked(locked)}`}
                    >
                      {section.title}
                    </h3>
                  ) : (
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                      className="no-drag cursor-text min-w-0 w-full truncate bg-transparent text-sm font-medium text-neutral-200 outline-none border-b border-transparent transition-colors focus:border-white/[0.12] hover:border-white/[0.06]"
                    />
                  )}
                </div>

                <span
                  className={`shrink-0 font-mono text-xs text-neutral-500 ${whenLocked(locked)}`}
                >
                  {done}/{total}
                </span>

                {!locked && (
                  <button
                    type="button"
                    onClick={() => removeSection(section.id)}
                    className="no-drag cursor-pointer shrink-0 rounded p-1 text-neutral-700 transition-colors hover:bg-white/[0.06] hover:text-red-400"
                    title="Eliminar materia"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-amber-500/80 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const fullyDone = isItemFullyDone(item);
                  const isExpanded = expanded.has(item.id);
                  const isAccordion = !!item.subtasks?.length;

                  return (
                    <li key={item.id}>
                      <div className="group/item flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.04]">
                        {isAccordion ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(item.id)}
                            className="no-drag shrink-0 cursor-pointer"
                          >
                            <ChevronRight
                              className={`h-3.5 w-3.5 text-neutral-600 transition-transform duration-200 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toggleSimpleItem(section.id, item.id)}
                            className={`no-drag shrink-0 cursor-pointer flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                              fullyDone
                                ? "border-amber-500/60 bg-amber-500/20"
                                : "border-white/10 bg-transparent group-hover/item:border-white/20"
                            }`}
                          >
                            {fullyDone && (
                              <Check className="h-2.5 w-2.5 text-amber-400" />
                            )}
                          </button>
                        )}

                        <div className="min-w-0 flex-1">
                          {locked ? (
                            <span
                              className={`enable-selection block truncate text-sm ${
                                fullyDone
                                  ? "text-neutral-600 line-through"
                                  : "text-neutral-300"
                              }`}
                            >
                              {item.title}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) =>
                                updateItemTitle(section.id, item.id, e.target.value)
                              }
                              className={`no-drag cursor-text min-w-0 w-full truncate bg-transparent text-sm outline-none border-b border-transparent transition-colors focus:border-white/[0.12] hover:border-white/[0.06] ${
                                fullyDone
                                  ? "text-neutral-600 line-through"
                                  : "text-neutral-300"
                              }`}
                            />
                          )}
                        </div>

                        {isAccordion && (
                          <span
                            className={`shrink-0 font-mono text-[10px] text-neutral-600 ${whenLocked(locked)}`}
                          >
                            {item.subtasks!.filter((s) => s.done).length}/
                            {item.subtasks!.length}
                          </span>
                        )}

                        {!locked && (
                          <div className="ml-1 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/item:opacity-100">
                            <button
                              type="button"
                              onClick={() => addSubtask(section.id, item.id, item.title)}
                              className="no-drag cursor-pointer rounded p-1 text-neutral-700 transition-colors hover:bg-white/[0.06] hover:text-neutral-300"
                              title="Agregar ejercicio"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(section.id, item.id)}
                              className="no-drag cursor-pointer rounded p-1 text-neutral-700 transition-colors hover:bg-white/[0.06] hover:text-red-400"
                              title="Eliminar guía"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isAccordion && (
                        <div
                          className="grid transition-[grid-template-rows] duration-200"
                          style={{
                            gridTemplateRows: isExpanded ? "1fr" : "0fr",
                          }}
                        >
                          <div className="overflow-hidden">
                            <ul className="ml-5 space-y-0.5 border-l border-white/[0.06] py-1 pl-3">
                              {item.subtasks!.map((sub) => (
                                <li key={sub.id} className="group/subtask">
                                  <div className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-white/[0.04]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleSubtask(section.id, item.id, sub.id)
                                      }
                                      className="no-drag cursor-pointer flex min-w-0 flex-1 items-center gap-2 text-left"
                                    >
                                      <span
                                        className={`pointer-events-none flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
                                          sub.done
                                            ? "border-amber-500/60 bg-amber-500/20"
                                            : "border-white/10 bg-transparent group-hover/subtask:border-white/20"
                                        }`}
                                      >
                                        {sub.done && (
                                          <Check className="h-2 w-2 text-amber-400" />
                                        )}
                                      </span>
                                      <span
                                        className={`min-w-0 flex-1 truncate text-xs transition-colors ${
                                          locked ? "enable-selection" : ""
                                        } ${
                                          sub.done
                                            ? "text-neutral-600 line-through"
                                            : "text-neutral-400"
                                        }`}
                                      >
                                        {sub.label}
                                      </span>
                                    </button>

                                    {!locked && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeSubtask(section.id, item.id, sub.id)
                                        }
                                        className="no-drag cursor-pointer rounded p-1 text-neutral-700 opacity-0 transition-colors group-hover/subtask:opacity-100 hover:bg-white/[0.06] hover:text-red-400"
                                        title="Eliminar ejercicio"
                                      >
                                        <Trash2 className="h-2.5 w-2.5" />
                                      </button>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
