import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Plus,
  ScanLine,
  ArrowRight,
  Check,
  Download,
  Upload,
  UserPlus,
  QrCode,
  Clock3,
  Pause,
  RotateCcw,
  ChevronRight,
  Copy,
} from "lucide-react";
import type { Course } from "./model";
import {
  keys,
  read,
  write,
  recordActivity,
  saveAccess,
  accessState,
  dateLabel,
  today,
  addMonths,
  type Student,
  type Access,
  type Membership,
} from "./swaye3Model";
import type { Workspace } from "./useWorkspace";
import {
  PageTitle,
  SearchField,
  Tabs,
  Badge,
  Drawer,
  Avatar,
  Empty,
} from "./WorkspaceUI";

type Shared = {
  data: Workspace;
  courses: Course[];
  navigate: (path: string) => void;
  notify: (message: string) => void;
  readOnly?: boolean;
};
export function StudentPages({
  data,
  courses,
  navigate,
  notify,
  readOnly = false,
  courseId,
}: { courseId?: string } & Shared) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [creating, setCreating] = useState(false);
  const people = data.students.filter(
    (s) =>
      (!courseId ||
        data.access.some(
          (a) => a.studentId === s.id && a.courseId === courseId,
        )) &&
      `${s.name} ${s.email} ${data.codes[s.id] || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || data.member(s.id).status === filter),
  );
  const found = data.students.find((s) => s.id === selected);
  return (
    <>
      <PageTitle
        title={courseId ? "Élèves du cours" : "Élèves"}
        description={
          courseId
            ? "Les élèves inscrits et leurs droits d’accès."
            : "Un dossier par élève, ses cours et son rattachement au centre."
        }
        actions={
          !readOnly && (
            <>
              <button
                className="sw-secondary"
                onClick={() => navigate("/swaye3/enrollments")}
              >
                <ScanLine size={16} />
                Inscrire par ID / QR
              </button>
              <button className="sw-primary" onClick={() => setCreating(true)}>
                <Plus size={17} />
                Ajouter un élève
              </button>
            </>
          )
        }
      />
      <div className="sw-surface">
        <div className="sw-surface-toolbar">
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { id: "all", label: "Tous", count: data.students.length },
              { id: "active", label: "Actifs" },
              { id: "requested", label: "En attente" },
              { id: "suspended", label: "Suspendus" },
            ]}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Nom, email ou identifiant"
          />
        </div>
        {people.length ? (
          <div className="sw-table-scroll">
            <table className="sw-data-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Identifiant</th>
                  <th>Rattachement</th>
                  <th>Cours accessibles</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {people.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button
                        className="sw-person-link"
                        onClick={() => setSelected(s.id)}
                      >
                        <Avatar name={s.name} />
                        <span>
                          <strong>{s.name}</strong>
                          <small>{s.email || s.level || "Profil élève"}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <code>{data.codes[s.id] || "—"}</code>
                    </td>
                    <td>
                      <Badge status={data.member(s.id).status} />
                    </td>
                    <td>
                      {
                        data.access.filter(
                          (a) =>
                            a.studentId === s.id && accessState(a) === "active",
                        ).length
                      }
                    </td>
                    <td>
                      <button
                        className="sw-text-button"
                        onClick={() => setSelected(s.id)}
                      >
                        Voir le dossier
                        <ChevronRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              query || filter !== "all"
                ? "Aucun élève correspondant"
                : "Votre liste d’élèves commence ici"
            }
            description={
              query
                ? "Essayez un autre nom ou identifiant."
                : "Ajoutez un profil, puis préparez son rattachement au centre."
            }
            action={
              !readOnly &&
              !query && (
                <button
                  className="sw-primary"
                  onClick={() => setCreating(true)}
                >
                  <UserPlus size={16} />
                  Ajouter un élève
                </button>
              )
            }
          />
        )}
        <footer className="sw-table-footer">
          {people.length} élève{people.length !== 1 ? "s" : ""} affiché
          {people.length !== 1 ? "s" : ""}
        </footer>
      </div>
      {creating && (
        <Drawer
          title="Ajouter un élève"
          description="Créez son profil. Son accès aux cours se gère ensuite, séparément."
          onClose={() => setCreating(false)}
        >
          <StudentForm
            data={data}
            onSave={(s) => {
              setCreating(false);
              setSelected(s.id);
              notify("Profil élève créé.");
            }}
          />
        </Drawer>
      )}
      {found && (
        <StudentDrawer
          student={found}
          data={data}
          courses={courses}
          navigate={navigate}
          notify={notify}
          readOnly={readOnly}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function StudentForm({
  data,
  student,
  onSave,
}: {
  data: Workspace;
  student?: Student;
  onSave: (s: Student) => void;
}) {
  const [form, setForm] = useState({
      name: student?.name || "",
      email: student?.email || "",
      phone: student?.phone || "",
      level: student?.level || "",
    }),
    [error, setError] = useState("");
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (
      data.students.some(
        (s) =>
          s.id !== student?.id &&
          form.email &&
          s.email.toLowerCase() === form.email.trim().toLowerCase(),
      )
    ) {
      setError(
        "Un profil utilise déjà cet email. Retrouvez-le dans la liste des élèves.",
      );
      return;
    }
    try {
      const s: Student = {
        ...student,
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        id: student?.id || crypto.randomUUID(),
        created: student?.created || new Date().toISOString(),
      };
      write(
        keys.students,
        student
          ? data.students.map((x) => (x.id === s.id ? s : x))
          : [...data.students, s],
      );
      if (!student)
        write(keys.memberships, {
          ...data.memberships,
          [s.id]: { status: "unlinked" },
        });
      recordActivity(
        `${student ? "Profil mis à jour" : "Profil créé"} · ${s.name}`,
        "student",
      );
      onSave(s);
    } catch {
      setError(
        "Le profil n’a pas pu être enregistré. Vérifiez l’espace disponible.",
      );
    }
  };
  return (
    <form className="sw-form-stack" onSubmit={save}>
      <label>
        Nom complet
        <input
          required
          minLength={2}
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nom et prénom"
        />
      </label>
      <label>
        Adresse email <small>Facultatif</small>
        <input
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="eleve@exemple.ma"
        />
      </label>
      <div className="sw-field-pair">
        <label>
          Téléphone <small>Facultatif</small>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="06…"
          />
        </label>
        <label>
          Niveau scolaire
          <select
            value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
          >
            <option value="">Non renseigné</option>
            {[
              "Collège",
              "Tronc commun",
              "1ère Bac",
              "2ème Bac",
              "Bac libre",
              "Autre",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="sw-inline-note">
        <UserPlus size={17} />
        <p>
          L’identifiant unique est créé automatiquement. Un nouveau profil doit
          accepter le rattachement avant l’attribution de cours.
        </p>
      </div>
      {error && (
        <p role="alert" className="sw-error">
          {error}
        </p>
      )}
      <div className="sw-form-actions">
        <button className="sw-primary">
          {student ? "Enregistrer les modifications" : "Créer le profil"}
        </button>
      </div>
    </form>
  );
}
export function StudentDrawer({
  student,
  data,
  courses,
  navigate,
  notify,
  onClose,
  readOnly = false,
}: { student: Student; onClose: () => void } & Shared) {
  const [tab, setTab] = useState("access"),
    [edit, setEdit] = useState(false),
    [card, setCard] = useState(false);
  return (
    <Drawer title="Dossier élève" onClose={onClose} wide>
      <div className="sw-profile-summary">
        <Avatar name={student.name} />
        <div>
          <h3>{student.name}</h3>
          <p>{data.codes[student.id] || "Identifiant en préparation"}</p>
        </div>
        <Badge status={data.member(student.id).status} />
      </div>
      <div className="sw-profile-tools">
        <button className="sw-secondary" onClick={() => setCard(!card)}>
          <QrCode size={16} />
          Carte élève
        </button>
        <button
          className="sw-text-button"
          onClick={() =>
            navigate("/school?student=" + encodeURIComponent(student.id))
          }
        >
          Aperçu élève
          <ArrowRight size={15} />
        </button>
      </div>
      {card && (
        <StudentCard
          name={student.name}
          code={data.codes[student.id]}
          center={data.profile.name}
        />
      )}
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setEdit(false);
        }}
        items={[
          { id: "access", label: "Cours et accès" },
          { id: "profile", label: "Profil" },
          { id: "history", label: "Historique" },
        ]}
      />
      {tab === "access" ? (
        <>
          <MembershipPanel
            student={student}
            data={data}
            notify={notify}
            navigate={navigate}
            readOnly={readOnly}
          />
          <AccessManager
            student={student}
            data={data}
            courses={courses}
            notify={notify}
            readOnly={readOnly}
          />
        </>
      ) : tab === "profile" ? (
        edit ? (
          <StudentForm
            data={data}
            student={student}
            onSave={() => {
              setEdit(false);
              notify("Profil mis à jour.");
            }}
          />
        ) : (
          <div className="sw-detail-list">
            <dl>
              <dt>Email</dt>
              <dd>{student.email || "Non renseigné"}</dd>
              <dt>Téléphone</dt>
              <dd>{student.phone || "Non renseigné"}</dd>
              <dt>Niveau</dt>
              <dd>{student.level || "Non renseigné"}</dd>
              <dt>Profil créé</dt>
              <dd>
                {student.created
                  ? dateLabel(student.created)
                  : "Date non disponible"}
              </dd>
            </dl>
            {!readOnly && (
              <button className="sw-secondary" onClick={() => setEdit(true)}>
                Modifier le profil
              </button>
            )}
          </div>
        )
      ) : (
        <div className="sw-activity-list">
          {data.activity.filter((a) => a.label.includes(student.name))
            .length ? (
            data.activity
              .filter((a) => a.label.includes(student.name))
              .map((a) => (
                <div key={a.id}>
                  <span className="sw-activity-dot" />
                  <div>
                    <p>{a.label}</p>
                    <small>{dateLabel(a.at)}</small>
                  </div>
                </div>
              ))
          ) : (
            <Empty
              title="Aucune action récente"
              description="Les nouvelles actions sur ce dossier apparaîtront ici."
            />
          )}
        </div>
      )}
    </Drawer>
  );
}
function MembershipPanel({
  student,
  data,
  notify,
  navigate,
  readOnly = false,
}: { student: Student } & Pick<
  Shared,
  "data" | "notify" | "navigate" | "readOnly"
>) {
  const member = data.member(student.id);
  const request = () => {
    write(keys.memberships, {
      ...data.memberships,
      [student.id]: {
        status: "requested",
        requestedAt: new Date().toISOString(),
      },
    });
    recordActivity(`Rattachement demandé · ${student.name}`, "student");
    notify(
      "Demande préparée dans l’aperçu élève local. Aucune notification externe envoyée.",
    );
  };
  if (member.status === "active")
    return (
      <div className="sw-membership-ok">
        <Check size={16} />
        <span>Rattaché à {data.profile.name}</span>
      </div>
    );
  return (
    <div className="sw-membership-box">
      <div>
        <Clock3 size={18} />
        <strong>
          {member.status === "requested"
            ? "En attente de l’accord de l’élève"
            : member.status === "suspended"
              ? "Rattachement suspendu"
              : member.status === "rejected"
                ? "Rattachement refusé"
                : "Élève à rattacher"}
        </strong>
      </div>
      <p>
        {member.status === "requested"
          ? "L’élève doit accepter dans son aperçu avant de recevoir de nouveaux accès aux cours."
          : "Préparez une demande de rattachement pour permettre l’attribution de cours."}
      </p>
      {!readOnly && (
        <div className="sw-inline-actions">
          {member.status !== "requested" && (
            <button className="sw-primary" onClick={request}>
              Demander le rattachement
            </button>
          )}
          {member.status === "requested" && (
            <button
              className="sw-secondary"
              onClick={() =>
                navigate("/school?student=" + encodeURIComponent(student.id))
              }
            >
              Ouvrir l’aperçu élève
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
export function AccessManager({
  student,
  data,
  courses,
  notify,
  readOnly = false,
}: { student: Student } & Pick<
  Shared,
  "data" | "courses" | "notify" | "readOnly"
>) {
  const [course, setCourse] = useState(""),
    [end, setEnd] = useState(addMonths(today(), 6)),
    [error, setError] = useState("");
  const records = data.access.filter((a) => a.studentId === student.id);
  const allowed = data.member(student.id).status === "active";
  const change = (a: Access, status: Access["status"]) => {
    saveAccess({ ...a, status });
    recordActivity(
      `${status === "suspended" ? "Accès suspendu" : "Accès activé"} · ${student.name} · ${courses.find((c) => c.id === a.courseId)?.title || "Cours"}`,
      "access",
    );
    notify(status === "suspended" ? "Accès suspendu." : "Accès activé.");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!course || !allowed) return;
    try {
      saveAccess({
        studentId: student.id,
        courseId: course,
        status: "active",
        authorizedAt: new Date().toISOString(),
        expiresAt: end || undefined,
      });
      recordActivity(
        `Accès attribué · ${student.name} · ${courses.find((c) => c.id === course)?.title || "Cours"}`,
        "access",
      );
      setCourse("");
      setError("");
      notify("Accès enregistré. Aucun règlement créé.");
    } catch {
      setError("Impossible d’enregistrer cet accès.");
    }
  };
  return (
    <section className="sw-access-manager">
      <div className="sw-section-title">
        <h3>Accès aux cours</h3>
        <span>{records.length}</span>
      </div>
      {records.length ? (
        <div className="sw-access-list">
          {records.map((a) => {
            const state = accessState(a);
            return (
              <article key={a.courseId}>
                <div>
                  <strong>
                    {courses.find((c) => c.id === a.courseId)?.title ||
                      "Cours archivé"}
                  </strong>
                  <small>
                    {a.expiresAt
                      ? "Jusqu’au " + dateLabel(a.expiresAt)
                      : "Sans date de fin"}
                  </small>
                </div>
                <Badge status={state} />
                {!readOnly && (
                  <div className="sw-access-actions">
                    {state === "active" ? (
                      <button
                        className="sw-icon"
                        aria-label={
                          "Suspendre " +
                          (courses.find((c) => c.id === a.courseId)?.title ||
                            "ce cours")
                        }
                        onClick={() => change(a, "suspended")}
                      >
                        <Pause size={16} />
                      </button>
                    ) : state === "suspended" && allowed ? (
                      <button
                        className="sw-icon"
                        aria-label="Réactiver cet accès"
                        onClick={() => change(a, "active")}
                      >
                        <ArrowRight size={16} />
                      </button>
                    ) : null}
                    {allowed && (
                      <button
                        className="sw-text-button"
                        onClick={() => {
                          setCourse(a.courseId);
                          setEnd(
                            addMonths(
                              a.expiresAt && a.expiresAt > today()
                                ? a.expiresAt
                                : today(),
                              6,
                            ),
                          );
                        }}
                      >
                        <RotateCcw size={14} />
                        {state === "active" || state === "expired"
                          ? "Renouveler"
                          : "Configurer l’accès"}
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="sw-soft-note">Aucun cours attribué à cet élève.</p>
      )}
      {!readOnly && allowed && (
        <form className="sw-form-stack sw-access-form" onSubmit={submit}>
          <h4>Attribuer ou renouveler un cours</h4>
          <label>
            Cours
            <select
              required
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="">Choisir un cours</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                  {c.published ? "" : " · Brouillon"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date de fin <small>Vide pour un accès sans échéance</small>
            <input
              aria-label="Date de fin d’accès"
              type="date"
              min={today()}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <p className="sw-soft-note">
            Les brouillons restent invisibles aux élèves jusqu’à leur
            publication.
          </p>
          {error && <p role="alert">{error}</p>}
          <button className="sw-primary" disabled={!course}>
            <Check size={16} />
            Enregistrer l’accès
          </button>
        </form>
      )}
    </section>
  );
}
export function StudentCard({
  name,
  code,
  center,
}: {
  name: string;
  code?: string;
  center: string;
}) {
  const [image, setImage] = useState(""),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    if (code)
      import("qrcode")
        .then((q) =>
          q.toDataURL(code, {
            width: 480,
            margin: 3,
            color: { dark: "#291E2B", light: "#FFFFFF" },
          }),
        )
        .then((url) => {
          if (live) setImage(url);
        })
        .catch(() => {
          if (live) setImage("");
        });
    return () => {
      live = false;
    };
  }, [code]);
  return (
    <div className="sw-student-card">
      {image ? (
        <img src={image} alt={"Code QR de " + name} />
      ) : (
        <QrCode size={60} />
      )}
      <div>
        <span>{center}</span>
        <h3>{name}</h3>
        <code>{code}</code>
        <div className="sw-inline-actions">
          {image && (
            <a
              className="sw-text-button"
              href={image}
              download={"carte-" + code + ".png"}
            >
              <Download size={14} />
              Télécharger le QR
            </a>
          )}
          <button
            className="sw-text-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code || "");
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Copy size={14} />
            {copied ? "Copié" : "Copier l’ID"}
          </button>
        </div>
      </div>
    </div>
  );
}
export function ReceptionPage({
  data,
  courses,
  navigate,
  notify,
  readOnly = false,
}: Shared) {
  const [method, setMethod] = useState("id"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState(""),
    [reading, setReading] = useState(false),
    [filter, setFilter] = useState("requested");
  const fileRef = useRef<HTMLInputElement>(null);
  const student = data.students.find((s) => s.id === selected);
  const lookup = (value: string) => {
    const code = value.trim().toUpperCase();
    setQuery(code);
    setSelected(null);
    if (!code) {
      setError("Saisissez l’identifiant de l’élève.");
      return;
    }
    const found = data.students.find((s) => data.codes[s.id] === code);
    if (!found) {
      setError("Aucun profil ne correspond à cet identifiant dans cet espace.");
      return;
    }
    setError("");
    setSelected(found.id);
  };
  const scan = async (file?: File) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setError("Choisissez une image de moins de 12 Mo.");
      return;
    }
    setReading(true);
    setError("");
    setSelected(null);
    try {
      const bitmap = await createImageBitmap(file);
      try {
        const factor = Math.min(
          1,
          1600 / Math.max(bitmap.width, bitmap.height),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * factor);
        canvas.height = Math.round(bitmap.height * factor);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error();
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const { default: decode } = await import("jsqr");
        const result = decode(pixels.data, pixels.width, pixels.height);
        if (!result) throw Error();
        lookup(result.data);
      } finally {
        bitmap.close();
      }
    } catch {
      setError(
        "QR illisible. Choisissez une image plus nette ou utilisez l’identifiant.",
      );
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const pending = data.students.filter(
    (s) => data.member(s.id).status === "requested",
  );
  const expired = data.access.filter((a) => accessState(a) === "expired");
  const pendingAccess = data.access.filter((a) => a.status === "pending");
  return (
    <>
      <PageTitle
        title="Accueil & inscriptions"
        description="Retrouvez l’élève, vérifiez son rattachement, puis gérez ses accès."
        actions={
          <button
            className="sw-secondary"
            onClick={() => navigate("/admin-app/users")}
          >
            <UserPlus size={16} />
            Liste des élèves
          </button>
        }
      />
      <div className="sw-reception-layout">
        <section className="sw-surface sw-reception-search">
          <div className="sw-section-heading">
            <h2>Retrouver un élève</h2>
            <p>Demandez-lui l’identifiant ou le QR de sa carte.</p>
          </div>
          <Tabs
            value={method}
            onChange={(v) => {
              setMethod(v);
              setError("");
            }}
            items={[
              { id: "id", label: "Identifiant unique" },
              { id: "qr", label: "Image QR" },
            ]}
          />
          {method === "id" ? (
            <form
              className="sw-form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                lookup(query);
              }}
            >
              <label>
                Identifiant de l’élève
                <input
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="characters"
                  placeholder="UST-XXXXXXXXXX"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                    setError("");
                  }}
                />
              </label>
              <button className="sw-primary">
                <ScanLine size={17} />
                Retrouver l’élève
              </button>
            </form>
          ) : (
            <div className="sw-qr-drop">
              <QrCode size={35} />
              <h3>Lire la carte de l’élève</h3>
              <p>Choisissez une photo ou une capture contenant son QR.</p>
              <label className="sw-secondary sw-upload-label">
                <Upload size={16} />
                {reading ? "Lecture en cours…" : "Choisir une image QR"}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  aria-label="Importer une image QR"
                  disabled={reading}
                  onChange={(e) => scan(e.target.files?.[0])}
                />
              </label>
            </div>
          )}
          {error && (
            <p className="sw-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="sw-subtle-divider" />
          <h3 className="sw-small-heading">Un parcours en deux temps</h3>
          <p className="sw-soft-note">
            L’élève accepte le rattachement au centre. Vous lui attribuez
            ensuite les cours et leur date de fin.
          </p>
          <p className="sw-soft-note">
            Le règlement se consigne dans Encaissements, sans modifier ses
            accès.
          </p>
        </section>
        <section className="sw-surface sw-reception-result">
          {student ? (
            <>
              <div className="sw-profile-summary">
                <Avatar name={student.name} />
                <div>
                  <h2>{student.name}</h2>
                  <code>{data.codes[student.id]}</code>
                </div>
                <Badge status={data.member(student.id).status} />
              </div>
              <MembershipPanel
                student={student}
                data={data}
                navigate={navigate}
                notify={notify}
                readOnly={readOnly}
              />
              <AccessManager
                student={student}
                data={data}
                courses={courses}
                notify={notify}
                readOnly={readOnly}
              />
            </>
          ) : (
            <div className="sw-reception-placeholder">
              <span>
                <ScanLine size={31} />
              </span>
              <h2>Le bon élève. Les bons accès.</h2>
              <p>
                Son dossier apparaît ici après la recherche. Vous pourrez
                vérifier ses cours, activer ou renouveler son accès.
              </p>
              <div>
                <Check size={15} />
                Identification par code unique
              </div>
              <div>
                <Check size={15} />
                Rattachement avant activation
              </div>
              <div>
                <Check size={15} />
                Dates d’accès indépendantes des règlements
              </div>
            </div>
          )}
        </section>
      </div>
      <section className="sw-surface sw-reception-queue">
        <div className="sw-section-heading">
          <h2>À suivre à l’accueil</h2>
          <p>Les demandes de rattachement et les accès arrivés à échéance.</p>
        </div>
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            {
              id: "requested",
              label: "Rattachements en attente",
              count: pending.length,
            },
            {
              id: "pending",
              label: "Accès à activer",
              count: pendingAccess.length,
            },
            { id: "expired", label: "Accès expirés", count: expired.length },
          ]}
        />
        {filter === "requested" ? (
          pending.length ? (
            <div className="sw-compact-list">
              {pending.map((s) => (
                <button
                  key={s.id}
                  onClick={() => lookup(data.codes[s.id] || "")}
                >
                  <Avatar name={s.name} />
                  <span>
                    <strong>{s.name}</strong>
                    <small>{data.codes[s.id]}</small>
                  </span>
                  <Badge status="requested" />
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Aucun rattachement en attente"
              description="Les nouvelles demandes apparaîtront ici."
            />
          )
        ) : (filter === "pending" ? pendingAccess : expired).length ? (
          <div className="sw-compact-list">
            {(filter === "pending" ? pendingAccess : expired).map((a) => (
              <button
                key={a.studentId + a.courseId}
                onClick={() => lookup(data.codes[a.studentId] || "")}
              >
                <Clock3 size={20} />
                <span>
                  <strong>
                    {data.students.find((s) => s.id === a.studentId)?.name ||
                      "Élève"}
                  </strong>
                  <small>
                    {courses.find((c) => c.id === a.courseId)?.title} ·{" "}
                    {dateLabel(a.expiresAt)}
                  </small>
                </span>
                <Badge status={filter === "pending" ? "pending" : "expired"} />
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        ) : (
          <Empty
            title={
              filter === "pending"
                ? "Aucun accès à activer"
                : "Aucun accès expiré"
            }
            description={
              filter === "pending"
                ? "Les demandes d’accès des élèves apparaîtront ici."
                : "Les échéances dépassées seront regroupées ici."
            }
          />
        )}
      </section>
    </>
  );
}
export function respondMembership(
  studentId: string,
  status: Membership["status"],
) {
  const all = read<Record<string, Membership>>(keys.memberships, {});
  write(keys.memberships, {
    ...all,
    [studentId]: {
      ...all[studentId],
      status,
      respondedAt: new Date().toISOString(),
    },
  });
}
