import { useState, useEffect } from "react";
import {
  ChevronDown,
  GripVertical,
  HelpCircle,
  MoreVertical,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import type { Course, Section, Lesson } from "./model";
const id = () => crypto.randomUUID();
export function Curriculum({
  course,
  onChange,
  onOpenLesson,
  onNotice: _onNotice,
}: {
  course: Course;
  onChange: (c: Course) => void;
  onOpenLesson: (id: string) => void;
  onNotice: (s: string) => void;
}) {
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ section: string; lesson?: string } | null>(
    null,
  );
  const [panel, setPanel] = useState<{ section: string; type: string } | null>(
    null,
  );
  const [days, setDays] = useState("");
  const [summary, setSummary] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!panel && !confirmDelete) return;
    const before = document.activeElement as HTMLElement | null;
    const get = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="dialog"] button:not([disabled]),[role="dialog"] input,[role="dialog"] select,[role="dialog"] textarea',
        ),
      );
    get()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setConfirmDelete(false);
      }
      if (e.key === "Tab") {
        const list = get(),
          first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [panel, confirmDelete]);
  const updateSection = (sid: string, fn: (s: Section) => Section) =>
    onChange({
      ...course,
      sections: course.sections.map((s) => (s.id === sid ? fn(s) : s)),
    });
  const clone = (s: Section): Section => ({
    ...s,
    id: id(),
    lessons: s.lessons.map((l) => ({
      ...l,
      id: id(),
      blocks: l.blocks.map((b) => ({ ...b, id: id() })),
    })),
  });
  const move = (sid: string, delta: number) => {
    const sections = [...course.sections],
      i = sections.findIndex((s) => s.id === sid),
      j = i + delta;
    if (j < 0 || j >= sections.length) return;
    [sections[i], sections[j]] = [sections[j], sections[i]];
    onChange({ ...course, sections });
    setMenu(null);
  };
  const apply = (fn: (l: Lesson) => Lesson) => {
    onChange({
      ...course,
      sections: course.sections.map((s) => ({
        ...s,
        lessons: s.lessons.map((l) => (selected.includes(l.id) ? fn(l) : l)),
      })),
    });
    setSelected([]);
  };
  const addLesson = (sid: string) => {
    const lid = id();
    updateSection(sid, (s) => ({
      ...s,
      lessons: [
        ...s.lessons,
        {
          id: lid,
          title: "Nouvelle leçon",
          published: false,
          blocks: [],
          comments: false,
          publicPreview: false,
        },
      ],
    }));
    setEditingLesson(lid);
    setTitle("Nouvelle leçon");
  };
  const insertSection = (after?: string) => {
    const sections = [...course.sections],
      section = { id: id(), title: "Nouveau chapitre", lessons: [] };
    sections.splice(
      after ? sections.findIndex((s) => s.id === after) + 1 : sections.length,
      0,
      section,
    );
    onChange({ ...course, sections });
  };
  const drop = (target: string, targetLesson?: string) => {
    if (!drag) return;
    const sections = course.sections.map((s) => ({
      ...s,
      lessons: [...s.lessons],
    }));
    if (drag.lesson) {
      const from = sections.find((s) => s.id === drag.section),
        to = sections.find((s) => s.id === target);
      if (from && to) {
        const index = from.lessons.findIndex((l) => l.id === drag.lesson);
        const [moved] = from.lessons.splice(index, 1);
        if (moved)
          to.lessons.splice(
            targetLesson
              ? Math.max(
                  0,
                  to.lessons.findIndex((l) => l.id === targetLesson),
                )
              : to.lessons.length,
            0,
            moved,
          );
      }
    } else {
      const from = sections.findIndex((s) => s.id === drag.section),
        to = sections.findIndex((s) => s.id === target);
      const [moved] = sections.splice(from, 1);
      sections.splice(to, 0, moved);
    }
    onChange({ ...course, sections });
    setDrag(null);
  };
  return (
    <>
      <div className="curriculum-actions">
        {!bulk ? (
          <button className="btn" onClick={() => setBulk(true)}>
            Modifier en lot
          </button>
        ) : (
          <div className="bulk-actions">
            {selected.length ? (
              <>
                <button
                  className="btn"
                  onClick={() => apply((l) => ({ ...l, published: true }))}
                >
                  Publish selection
                </button>
                <button
                  className="btn"
                  onClick={() => apply((l) => ({ ...l, publicPreview: true }))}
                >
                  Set selection as public preview
                </button>
                <button className="btn" onClick={() => setConfirmDelete(true)}>
                  Delete selection
                </button>
                <button className="btn" onClick={() => setSelected([])}>
                  Clear selection
                </button>
              </>
            ) : (
              <span>Sélectionner sections and lessons</span>
            )}
            <button
              className="btn"
              onClick={() => {
                setBulk(false);
                setSelected([]);
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>
      <div className="sections">
        {course.sections.map((section) => (
          <div key={section.id}>
            <section
              className="section-card"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.stopPropagation();
                drop(section.id);
              }}
            >
              <div className="section-head">
                <button
                  className="icon-button grabber"
                  aria-label={`Réorganiser ${section.title}`}
                  draggable
                  onDragStart={() => setDrag({ section: section.id })}
                >
                  <GripVertical size={18} />
                </button>
                {bulk && (
                  <input
                    type="checkbox"
                    aria-label={`Sélectionner section ${section.title}`}
                    checked={
                      section.lessons.length > 0 &&
                      section.lessons.every((l) => selected.includes(l.id))
                    }
                    onChange={(e) =>
                      setSelected((ids) =>
                        e.target.checked
                          ? [
                              ...new Set([
                                ...ids,
                                ...section.lessons.map((l) => l.id),
                              ]),
                            ]
                          : ids.filter(
                              (id) => !section.lessons.some((l) => l.id === id),
                            ),
                      )
                    }
                  />
                )}
                {renaming === section.id ? (
                  <div className="inline-title">
                    <input
                      aria-label="Titre du chapitre"
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <button className="btn" onClick={() => setRenaming(null)}>
                      Annuler
                    </button>
                    <button
                      className="btn primary"
                      disabled={!title.trim()}
                      onClick={() => {
                        updateSection(section.id, (s) => ({
                          ...s,
                          title: title.trim(),
                        }));
                        setRenaming(null);
                      }}
                    >
                      Enregistrer
                    </button>
                  </div>
                ) : (
                  <h2>{section.title}</h2>
                )}
                <div className="section-spacer" />
                <div className="dropdown-wrap">
                  <button
                    className="btn"
                    disabled={!section.lessons.length}
                    onClick={() =>
                      setMenu(
                        menu === `quick:${section.id}`
                          ? null
                          : `quick:${section.id}`,
                      )
                    }
                  >
                    Actions rapides
                    <ChevronDown size={16} />
                  </button>
                  {menu === `quick:${section.id}` && (
                    <div className="dropdown right">
                      <button
                        onClick={() => {
                          updateSection(section.id, (s) => ({
                            ...s,
                            lessons: s.lessons.map((l) => ({
                              ...l,
                              published: true,
                            })),
                          }));
                          setMenu(null);
                        }}
                      >
                        Publish all lessons
                      </button>
                      <button
                        onClick={() => {
                          updateSection(section.id, (s) => ({
                            ...s,
                            lessons: s.lessons.map((l) => ({
                              ...l,
                              published: false,
                            })),
                          }));
                          setMenu(null);
                        }}
                      >
                        Unpublish all lessons
                      </button>
                    </div>
                  )}
                </div>
                <div className="dropdown-wrap">
                  <button
                    className="icon-button"
                    aria-label={`Actions du chapitre ${section.title}`}
                    onClick={() =>
                      setMenu(menu === section.id ? null : section.id)
                    }
                  >
                    <MoreVertical size={19} />
                  </button>
                  {menu === section.id && (
                    <div className="dropdown right">
                      <button
                        onClick={() => {
                          setRenaming(section.id);
                          setTitle(section.title);
                          setMenu(null);
                        }}
                      >
                        Rename
                      </button>
                      <button onClick={() => move(section.id, -1)}>
                        Monter
                      </button>
                      <button onClick={() => move(section.id, 1)}>
                        Descendre
                      </button>
                      <button
                        onClick={() => {
                          onChange({
                            ...course,
                            sections: [...course.sections, clone(section)],
                          });
                          setMenu(null);
                        }}
                      >
                        Dupliquer le chapitre
                      </button>
                      <button
                        onClick={() => {
                          setPanel({ section: section.id, type: "delete" });
                          setMenu(null);
                        }}
                      >
                        Supprimer le chapitre
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {section.lessons.map((l) => (
                <div
                  className="lesson-row faithful-lesson"
                  key={l.id}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDrag({ section: section.id, lesson: l.id });
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.stopPropagation();
                    drop(section.id, l.id);
                  }}
                >
                  {bulk && (
                    <input
                      type="checkbox"
                      aria-label={`Sélectionner ${l.title}`}
                      checked={selected.includes(l.id)}
                      onChange={(e) =>
                        setSelected((ids) =>
                          e.target.checked
                            ? [...ids, l.id]
                            : ids.filter((x) => x !== l.id),
                        )
                      }
                    />
                  )}
                  <GripVertical size={17} />
                  {editingLesson === l.id ? (
                    <div className="inline-title">
                      <input
                        aria-label="Titre de la leçon"
                        autoFocus
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                      <button
                        className="btn"
                        onClick={() => {
                          updateSection(section.id, (s) => ({
                            ...s,
                            lessons: s.lessons.filter((x) => x.id !== l.id),
                          }));
                          setEditingLesson(null);
                        }}
                      >
                        Annuler
                      </button>
                      <button
                        className="btn primary"
                        disabled={!title.trim()}
                        onClick={() => {
                          updateSection(section.id, (s) => ({
                            ...s,
                            lessons: s.lessons.map((x) =>
                              x.id === l.id ? { ...x, title: title.trim() } : x,
                            ),
                          }));
                          setEditingLesson(null);
                        }}
                      >
                        Enregistrer
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="lesson-label">
                        <button
                          className="lesson-title"
                          onClick={() => onOpenLesson(l.id)}
                        >
                          {l.title}
                        </button>
                        <small>
                          {l.blocks.length
                            ? Object.entries(
                                l.blocks.reduce<Record<string, number>>(
                                  (r, b) => ({
                                    ...r,
                                    [b.type]: (r[b.type] || 0) + 1,
                                  }),
                                  {},
                                ),
                              )
                                .map(([type, n]) => `${n} ${type}`)
                                .join(", ")
                            : "Aucun contenu"}
                        </small>
                      </div>
                      <button
                        className="btn lesson-publish"
                        onClick={() =>
                          updateSection(section.id, (s) => ({
                            ...s,
                            lessons: s.lessons.map((x) =>
                              x.id === l.id
                                ? { ...x, published: !x.published }
                                : x,
                            ),
                          }))
                        }
                      >
                        {l.published ? "Dépublier" : "Publier"}
                      </button>
                      <div className="dropdown-wrap">
                        <button
                          className="icon-button"
                          aria-label={`Actions de ${l.title}`}
                          onClick={() => setMenu(menu === l.id ? null : l.id)}
                        >
                          <MoreVertical size={18} />
                        </button>
                        {menu === l.id && (
                          <div className="dropdown right">
                            <button onClick={() => onOpenLesson(l.id)}>
                              Modifier la leçon
                            </button>
                            <button
                              onClick={() => {
                                updateSection(section.id, (s) => ({
                                  ...s,
                                  lessons: [
                                    ...s.lessons,
                                    {
                                      ...l,
                                      id: id(),
                                      blocks: l.blocks.map((b) => ({
                                        ...b,
                                        id: id(),
                                      })),
                                    },
                                  ],
                                }));
                                setMenu(null);
                              }}
                            >
                              Dupliquer la leçon
                            </button>
                            <button
                              onClick={() => {
                                setPanel({
                                  section: l.id,
                                  type: "delete-lesson",
                                });
                                setMenu(null);
                              }}
                            >
                              Supprimer la leçon
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div className="section-links">
                <button onClick={() => addLesson(section.id)}>
                  <Plus size={18} />
                  Nouvelle leçon
                </button>
                <button
                  onClick={() => {
                    setSummary(section.summary || "");
                    setPanel({ section: section.id, type: "summary" });
                  }}
                >
                  <Sparkles size={18} />
                  Résumé du chapitre
                </button>
              </div>
            </section>
            <button
              className="between-section"
              onClick={() => insertSection(section.id)}
            >
              <Plus size={19} />
              Nouveau chapitre
            </button>
          </div>
        ))}
        {!course.sections.length && (
          <button className="new-section" onClick={() => insertSection()}>
            <Plus size={18} />
            Nouveau chapitre
          </button>
        )}
      </div>
      <div className="help-bar">
        <HelpCircle size={18} />
        Learn more about creating your curriculum in the{" "}
        <a
          href="https://support.teachable.com/en/articles/11682453-sections-and-lessons"
          target="_blank"
          rel="noreferrer"
        >
          Teachable Knowledge Base
        </a>
      </div>
      {panel && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setPanel(null)}
        >
          <section
            className={`modal ${panel.type === "drip" ? "drip-panel" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              panel.type === "drip"
                ? "Diffusion programmée"
                : panel.type === "summary"
                  ? "Résumé du chapitre"
                  : "Supprimer le contenu"
            }
          >
            <header className="modal-head">
              <h2>
                {panel.type === "drip"
                  ? "Diffusion programmée"
                  : panel.type === "summary"
                    ? "Résumé du chapitre"
                    : "Supprimer ce contenu ?"}
              </h2>
              <button
                className="icon-button"
                aria-label="Fermer"
                onClick={() => setPanel(null)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="modal-body">
              {panel.type === "drip" ? (
                <>
                  <p>Choisissez le délai prévu après l’inscription.</p>
                  <label>
                    Diffusion du chapitre
                    <select>
                      <option>Jours après l’inscription</option>
                    </select>
                  </label>
                  <label>
                    Jours après l’inscription
                    <input
                      type="number"
                      min="0"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </label>
                  <p>Le délai est enregistré avec ce chapitre.</p>
                </>
              ) : panel.type === "summary" ? (
                <label>
                  Résumé du chapitre
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                  />
                </label>
              ) : (
                <p>
                  Ce contenu sera retiré du cours. Vérifiez votre sélection
                  avant de confirmer.
                </p>
              )}
            </div>
            <footer className="modal-actions">
              <button className="btn" onClick={() => setPanel(null)}>
                Annuler
              </button>
              <button
                className={`btn ${panel.type.startsWith("delete") ? "danger" : "primary"}`}
                disabled={
                  panel.type === "drip" && (days === "" || Number(days) < 0)
                }
                onClick={() => {
                  if (panel.type === "delete")
                    onChange({
                      ...course,
                      sections: course.sections.filter(
                        (s) => s.id !== panel.section,
                      ),
                    });
                  else if (panel.type === "delete-lesson")
                    onChange({
                      ...course,
                      sections: course.sections.map((s) => ({
                        ...s,
                        lessons: s.lessons.filter(
                          (l) => l.id !== panel.section,
                        ),
                      })),
                    });
                  else
                    updateSection(panel.section, (s) =>
                      panel.type === "drip"
                        ? { ...s, drip: Number(days) }
                        : { ...s, summary },
                    );
                  setPanel(null);
                }}
              >
                {panel.type.startsWith("delete") ? "Supprimer" : "Enregistrer"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {confirmDelete && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Supprimer les leçons sélectionnées"
          >
            <div className="modal-body">
              <h2>Supprimer les leçons sélectionnées ?</h2>
              <p>
                {selected.length} lessons will be removed from this local
                course.
              </p>
            </div>
            <footer className="modal-actions">
              <button className="btn" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  onChange({
                    ...course,
                    sections: course.sections.map((s) => ({
                      ...s,
                      lessons: s.lessons.filter(
                        (l) => !selected.includes(l.id),
                      ),
                    })),
                  });
                  setSelected([]);
                  setConfirmDelete(false);
                }}
              >
                Supprimer
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
