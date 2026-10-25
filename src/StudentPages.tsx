import { useRef, useState, type FormEvent } from "react";
import {
  ScanLine,
  ArrowRight,
  Check,
  Upload,
  Users,
  QrCode,
  Clock3,
  Pause,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import type { Course } from "./model";
import {
  keys,
  write,
  recordActivity,
  saveAccess,
  accessState,
  dateLabel,
  today,
  addMonths,
  findStudentByCode,
  type Student,
  type Access,
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
    [selected, setSelected] = useState<string | null>(null);
  const people = data.centerStudents.filter(
    (s) =>
      (!courseId ||
        data.access.some(
          (a) => a.studentId === s.id && a.courseId === courseId,
        )) &&
      (
        s.name +
        " " +
        (data.codes[s.id] || "") +
        " " +
        (data.member(s.id).status === "active" ? s.email : "")
      )
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || data.member(s.id).status === filter),
  );
  const found = data.centerStudents.find((s) => s.id === selected);
  return (
    <>
      <PageTitle
        title={courseId ? "Élèves du cours" : "Élèves du centre"}
        description="Les élèves s’inscrivent dans l’app. Retrouvez leur carte, puis préparez le rattachement à votre centre."
        actions={
          !readOnly && (
            <button
              className="sw-primary"
              onClick={() => navigate("/swaye3/enrollments")}
            >
              <ScanLine size={16} />
              Rechercher par ID / QR
            </button>
          )
        }
      />
      <div className="sw-surface">
        <div className="sw-surface-toolbar">
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { id: "all", label: "Tous", count: data.centerStudents.length },
              { id: "active", label: "Rattachés" },
              { id: "requested", label: "En attente" },
              { id: "suspended", label: "Suspendus" },
            ]}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Nom ou identifiant d’un élève du centre"
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
                          <small>
                            {data.member(s.id).status === "active"
                              ? s.email || s.level || "Profil géré par l’élève"
                              : "En attente du rattachement"}
                          </small>
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
                : "Aucun élève rattaché pour le moment"
            }
            description={
              query
                ? "La recherche porte uniquement sur les élèves de ce centre. Utilisez l’ID ou le QR pour retrouver un nouvel élève."
                : "L’élève crée son profil dans l’app et vous présente son QR ou son identifiant. Vous pouvez ensuite lui demander de rejoindre le centre."
            }
            action={
              !readOnly &&
              !query && (
                <button
                  className="sw-primary"
                  onClick={() => navigate("/swaye3/enrollments")}
                >
                  <ScanLine size={16} />
                  Retrouver un élève par sa carte
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
export function StudentDrawer({
  student,
  data,
  courses,
  notify,
  onClose,
  readOnly = false,
}: { student: Student; onClose: () => void } & Shared) {
  const [tab, setTab] = useState("access");
  const consented = ["active", "suspended"].includes(
    data.member(student.id).status,
  );
  return (
    <Drawer title="Dossier élève" onClose={onClose} wide>
      <div className="sw-profile-summary">
        <Avatar name={student.name} />
        <div>
          <h3>{student.name}</h3>
          <p>{data.codes[student.id]}</p>
        </div>
        <Badge status={data.member(student.id).status} />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "access", label: "Cours et accès" },
          { id: "profile", label: "Profil de l’élève" },
          { id: "history", label: "Historique" },
        ]}
      />
      {tab === "access" ? (
        <>
          <MembershipPanel
            student={student}
            data={data}
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
      ) : tab === "profile" ? (
        <div className="sw-detail-list">
          <p className="sw-soft-note">
            Ce profil appartient à l’élève et se modifie dans son app. Le centre
            ne peut ni le créer ni modifier ses informations.
          </p>
          {consented ? (
            <dl>
              <dt>Email</dt>
              <dd>{student.email || "Non renseigné"}</dd>
              <dt>Téléphone</dt>
              <dd>{student.phone || "Non renseigné"}</dd>
              <dt>Niveau</dt>
              <dd>{student.level || "Non renseigné"}</dd>
              <dt>Inscription dans l’app</dt>
              <dd>
                {student.created
                  ? dateLabel(student.created)
                  : "Date non disponible"}
              </dd>
            </dl>
          ) : (
            <p className="sw-soft-note">
              Les informations du profil seront disponibles après l’accord de
              rattachement.
            </p>
          )}
        </div>
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
              description="Les actions du centre sur ce dossier apparaîtront ici."
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
  readOnly = false,
}: { student: Student } & Pick<Shared, "data" | "notify" | "readOnly">) {
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
          ? "L’élève doit accepter dans son app avant de recevoir de nouveaux accès aux cours."
          : "Ce profil existe déjà dans l’app. Préparez une demande de rattachement ; l’élève devra l’accepter avant l’attribution de cours."}
      </p>
      {!readOnly && (
        <div className="sw-inline-actions">
          {member.status !== "requested" && (
            <button className="sw-primary" onClick={request}>
              Demander le rattachement
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
    const found = findStudentByCode(data.students, data.codes, code);
    if (!found) {
      setError(
        "Aucun compte élève ne correspond à ce code. Demandez à l’élève de vérifier la carte de son app.",
      );
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
  const pending = data.centerStudents.filter(
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
            <Users size={16} />
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
