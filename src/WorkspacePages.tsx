import { useState, type FormEvent } from "react";
import {
  Plus,
  BookOpen,
  ArrowRight,
  Eye,
  Save,
  Download,
  Check,
  Wallet,
  Pause,
  Play,
  Mail,
  MapPin,
  ShieldCheck,
  FileDown,
  MessageCircle,
  Send,
} from "lucide-react";
import type { Course } from "./model";
import type { Workspace } from "./useWorkspace";
import {
  keys,
  write,
  read,
  recordActivity,
  accessState,
  dateLabel,
  today,
  downloadCsv,
  type Payment,
  type Teacher,
  type Profile,
  type Question,
} from "./swaye3Model";
import {
  PageTitle,
  Empty,
  Tabs,
  SearchField,
  Badge,
  Drawer,
  Avatar,
} from "./WorkspaceUI";

type Base = {
  data: Workspace;
  courses: Course[];
  navigate: (path: string) => void;
  notify: (message: string) => void;
};
export function CourseCatalog({
  data,
  courses,
  navigate,
}: Pick<Base, "data" | "courses" | "navigate">) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const visible = courses.filter(
    (c) =>
      (filter === "all" ||
        (filter === "published" ? c.published : !c.published)) &&
      `${c.title} ${data.meta[c.id]?.subject || ""} ${data.meta[c.id]?.level || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Cours & contenus"
        description="Votre bibliothèque pédagogique, du premier brouillon au cours publié."
        actions={
          <button
            className="sw-primary"
            onClick={() => navigate("/admin-app/create/courses/step-1")}
          >
            <Plus size={17} />
            Créer un cours
          </button>
        }
      />
      <div className="sw-surface">
        <div className="sw-surface-toolbar">
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { id: "all", label: "Tous les cours", count: courses.length },
              {
                id: "published",
                label: "Publiés",
                count: courses.filter((c) => c.published).length,
              },
              {
                id: "draft",
                label: "Brouillons",
                count: courses.filter((c) => !c.published).length,
              },
            ]}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Rechercher un cours"
          />
        </div>
        {visible.length ? (
          <div className="sw-catalog-list">
            {visible.map((c) => {
              const meta = data.meta[c.id] || {};
              const teacher = data.team.find((t) => t.id === meta.teacherId);
              return (
                <article className="sw-catalog-row" key={c.id}>
                  <button
                    className="sw-course-cover"
                    onClick={() =>
                      navigate(`/admin-app/courses/${c.id}/curriculum`)
                    }
                    aria-label={"Ouvrir " + c.title}
                  >
                    {c.thumbnail ? (
                      <img src={c.thumbnail} alt="" />
                    ) : (
                      <BookOpen size={27} />
                    )}
                  </button>
                  <div className="sw-catalog-info">
                    <div className="sw-course-tags">
                      {meta.subject && <span>{meta.subject}</span>}
                      {meta.level && <span>{meta.level}</span>}
                    </div>
                    <button
                      className="sw-title-link"
                      onClick={() =>
                        navigate(`/admin-app/courses/${c.id}/curriculum`)
                      }
                    >
                      {c.title}
                    </button>
                    <p>
                      {c.sections.length} chapitre
                      {c.sections.length !== 1 ? "s" : ""} ·{" "}
                      {c.sections.reduce((n, s) => n + s.lessons.length, 0)}{" "}
                      leçons{teacher ? " · " + teacher.name : ""}
                    </p>
                  </div>
                  <div className="sw-catalog-state">
                    <Badge status={c.published ? "published" : "draft"} />
                    <small>
                      {
                        data.access.filter(
                          (a) =>
                            a.courseId === c.id && accessState(a) === "active",
                        ).length
                      }{" "}
                      élèves avec accès
                    </small>
                  </div>
                  <button
                    className="sw-secondary"
                    onClick={() =>
                      navigate(`/admin-app/courses/${c.id}/curriculum`)
                    }
                  >
                    Gérer le cours
                    <ArrowRight size={15} />
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <Empty
            title={
              query
                ? "Aucun cours correspondant"
                : "Votre prochain cours commence ici"
            }
            description={
              query
                ? "Essayez un autre titre, une matière ou un niveau."
                : "Créez un cours, organisez ses chapitres et ajoutez vos premières leçons."
            }
            action={
              !query && (
                <button
                  className="sw-primary"
                  onClick={() => navigate("/admin-app/create/courses/step-1")}
                >
                  <Plus size={16} />
                  Créer un cours
                </button>
              )
            }
          />
        )}
        <footer className="sw-table-footer">
          {visible.length} cours affiché{visible.length !== 1 ? "s" : ""}
        </footer>
      </div>
    </>
  );
}
function CourseDetailsForm({
  data,
  course,
  onSave,
}: {
  data: Workspace;
  course?: Course;
  onSave: (
    form: { title: string; description: string },
    meta: { subject: string; level: string; teacherId: string },
  ) => void;
}) {
  const meta = course ? data.meta[course.id] || {} : {};
  const [form, setForm] = useState({
      title: course?.title || "",
      description: course?.description || "",
    }),
    [fields, setFields] = useState({
      subject: meta.subject || "",
      level: meta.level || "",
      teacherId: meta.teacherId || "",
    });
  return (
    <form
      className="sw-form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form, fields);
      }}
    >
      <label>
        Titre du cours
        <input
          required
          minLength={3}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Ex. Mathématiques · Fonctions et limites"
        />
      </label>
      <div className="sw-field-pair">
        <label>
          Matière
          <select
            value={fields.subject}
            onChange={(e) => setFields({ ...fields, subject: e.target.value })}
          >
            <option value="">Choisir une matière</option>
            {[
              "Mathématiques",
              "Physique-chimie",
              "SVT",
              "Français",
              "Anglais",
              "Arabe",
              "Philosophie",
              "Histoire-géographie",
              "Autre",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Niveau
          <select
            value={fields.level}
            onChange={(e) => setFields({ ...fields, level: e.target.value })}
          >
            <option value="">Choisir un niveau</option>
            {[
              "Collège",
              "Tronc commun",
              "1ère Bac",
              "2ème Bac",
              "Bac libre",
              "Autre",
            ].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Enseignant responsable
        <select
          value={fields.teacherId}
          onChange={(e) => setFields({ ...fields, teacherId: e.target.value })}
        >
          <option value="">Non attribué</option>
          {data.team
            .filter(
              (t) => t.status !== "suspended" || t.id === fields.teacherId,
            )
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t.subject || "Enseignant"}
              </option>
            ))}
        </select>
      </label>
      <label>
        Présentation du cours
        <textarea
          rows={5}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Les objectifs et les notions que vos élèves vont travailler."
        />
      </label>
      <div className="sw-form-actions">
        <button className="sw-primary">
          <Save size={16} />
          {course ? "Enregistrer les informations" : "Créer le brouillon"}
        </button>
      </div>
    </form>
  );
}
export function CourseDetails({
  course,
  data,
  onChange,
  navigate,
  notify,
}: { course: Course; onChange: (course: Course) => void } & Pick<
  Base,
  "data" | "navigate" | "notify"
>) {
  const live = course.sections
    .flatMap((s) => s.lessons)
    .filter((l) => l.published).length;
  return (
    <>
      <PageTitle
        title="Informations du cours"
        description="La présentation pédagogique et la publication de votre cours."
      />
      <div className="sw-settings-layout">
        <section className="sw-surface sw-padded">
          <CourseDetailsForm
            key={course.id}
            data={data}
            course={course}
            onSave={(form, meta) => {
              onChange({ ...course, ...form });
              write(keys.meta, { ...data.meta, [course.id]: meta });
              recordActivity(
                "Informations mises à jour · " + form.title,
                "course",
              );
              notify("Informations du cours enregistrées.");
            }}
          />
        </section>
        <aside className="sw-surface sw-padded sw-publication">
          <h2>Publication</h2>
          <Badge status={course.published ? "published" : "draft"} />
          <p>
            {live} leçon{live !== 1 ? "s" : ""} publiée{live !== 1 ? "s" : ""}{" "}
            dans ce cours.
          </p>
          {!live && !course.published && (
            <p className="sw-soft-note">
              Publiez au moins une leçon dans l’éditeur avant de rendre le cours
              visible.
            </p>
          )}
          <button
            className={course.published ? "sw-secondary" : "sw-primary"}
            disabled={!course.published && !live}
            onClick={() => {
              onChange({ ...course, published: !course.published });
              recordActivity(
                `${course.published ? "Cours dépublié" : "Cours publié"} · ${course.title}`,
                "course",
              );
              notify(
                course.published
                  ? "Le cours est en brouillon."
                  : "Le cours est publié.",
              );
            }}
          >
            {course.published ? "Remettre en brouillon" : "Publier le cours"}
          </button>
          <button
            className="sw-text-button"
            onClick={() => navigate("/preview/" + course.id)}
          >
            <Eye size={16} />
            Prévisualiser le cours
          </button>
          <div className="sw-subtle-divider" />
          <h3>Accès des élèves</h3>
          <p className="sw-soft-note">
            La publication rend le contenu disponible aux élèves disposant d’un
            accès. Gérez leurs droits depuis leur dossier.
          </p>
        </aside>
      </div>
    </>
  );
}
export function PaymentsPage({
  data,
  courses,
  notify,
}: Pick<Base, "data" | "courses" | "notify">) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("recorded"),
    [creating, setCreating] = useState(false);
  const visible = data.payments.filter(
    (p) =>
      (filter === "all" || (filter === "voided" ? p.voided : !p.voided)) &&
      `${data.centerStudents.find((s) => s.id === p.studentId)?.name || ""} ${p.reference}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const total = data.payments
    .filter((p) => !p.voided)
    .reduce((n, p) => n + p.amount, 0);
  const exportCsv = () =>
    downloadCsv("encaissements-" + today() + ".csv", [
      ["Élève", "Date", "Montant MAD", "Mode", "Référence", "État"],
      ...visible.map((p) => [
        data.centerStudents.find((s) => s.id === p.studentId)?.name ||
          p.studentId,
        p.date,
        p.amount,
        p.method || "Non renseigné",
        p.reference,
        p.voided ? "Annulé" : "Consigné",
      ]),
    ]);
  return (
    <>
      <PageTitle
        title="Encaissements"
        description="Le registre des règlements reçus en dehors de la plateforme."
        actions={
          <>
            <button
              className="sw-secondary"
              onClick={exportCsv}
              disabled={!visible.length}
            >
              <Download size={16} />
              Exporter
            </button>
            <button
              className="sw-primary"
              onClick={() => setCreating(true)}
              disabled={!data.centerStudents.length}
            >
              <Plus size={17} />
              Consigner un règlement
            </button>
          </>
        }
      />
      <div className="sw-ledger-summary">
        <Wallet size={22} />
        <div>
          <span>Total consigné</span>
          <strong>
            {total.toLocaleString("fr-MA", { maximumFractionDigits: 2 })}
            <small>MAD</small>
          </strong>
        </div>
        <p>Les règlements ne créent ni ne prolongent les accès aux cours.</p>
      </div>
      <div className="sw-surface">
        <div className="sw-surface-toolbar">
          <Tabs
            value={filter}
            onChange={setFilter}
            items={[
              { id: "recorded", label: "Consignés" },
              { id: "voided", label: "Annulés" },
              { id: "all", label: "Tout le registre" },
            ]}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Élève ou référence"
          />
        </div>
        {visible.length ? (
          <div className="sw-table-scroll">
            <table className="sw-data-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Date & référence</th>
                  <th>Mode</th>
                  <th>Montant</th>
                  <th>État</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>
                        {data.centerStudents.find((s) => s.id === p.studentId)
                          ?.name || "Profil non disponible"}
                      </strong>
                      <small>
                        {courses.find((c) => c.id === p.courseId)?.title}
                      </small>
                    </td>
                    <td>
                      {dateLabel(p.date)}
                      <small>{p.reference || "Sans référence"}</small>
                    </td>
                    <td>{p.method || "Non renseigné"}</td>
                    <td className="sw-money">
                      {p.amount.toLocaleString("fr-MA")} MAD
                    </td>
                    <td>
                      <Badge status={p.voided ? "voided" : "recorded"} />
                    </td>
                    <td>
                      <button
                        className="sw-text-button"
                        onClick={() => {
                          write(
                            keys.payments,
                            data.payments.map((x) =>
                              x.id === p.id ? { ...x, voided: !x.voided } : x,
                            ),
                          );
                          recordActivity(
                            `${p.voided ? "Règlement rétabli" : "Règlement annulé"} · ${data.centerStudents.find((s) => s.id === p.studentId)?.name || "Élève"}`,
                            "payment",
                          );
                          notify(
                            p.voided
                              ? "Règlement rétabli."
                              : "Règlement annulé et conservé dans l’historique.",
                          );
                        }}
                      >
                        {p.voided ? "Rétablir" : "Annuler"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={query ? "Aucun résultat" : "Votre registre est à jour"}
            description={
              data.centerStudents.length
                ? "Les règlements consignés apparaîtront ici."
                : "Retrouvez et rattachez d’abord un élève inscrit dans l’app pour consigner son règlement."
            }
          />
        )}
      </div>
      {creating && (
        <Drawer
          title="Consigner un règlement"
          description="Une note de réception. Aucun débit ni facture n’est généré."
          onClose={() => setCreating(false)}
        >
          <PaymentForm
            data={data}
            courses={courses}
            onSave={(p) => {
              write(keys.payments, [p, ...data.payments]);
              recordActivity(
                `Règlement consigné · ${data.centerStudents.find((s) => s.id === p.studentId)?.name} · ${p.amount} MAD`,
                "payment",
              );
              setCreating(false);
              notify("Règlement consigné. Les accès n’ont pas changé.");
            }}
          />
        </Drawer>
      )}
    </>
  );
}
function PaymentForm({
  data,
  courses,
  onSave,
}: {
  data: Workspace;
  courses: Course[];
  onSave: (p: Payment) => void;
}) {
  const [form, setForm] = useState({
    studentId: "",
    courseId: "",
    amount: "",
    date: today(),
    method: "Espèces",
    reference: "",
  });
  return (
    <form
      className="sw-form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const amount = Number(form.amount);
        if (!Number.isFinite(amount) || amount <= 0) return;
        onSave({ ...form, id: crypto.randomUUID(), amount });
      }}
    >
      <label>
        Élève
        <select
          required
          value={form.studentId}
          onChange={(e) => setForm({ ...form, studentId: e.target.value })}
        >
          <option value="">Choisir un élève</option>
          {data.centerStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="sw-field-pair">
        <label>
          Montant (MAD)
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0,00"
          />
        </label>
        <label>
          Date de réception
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
      </div>
      <label>
        Mode de règlement
        <select
          value={form.method}
          onChange={(e) => setForm({ ...form, method: e.target.value })}
        >
          {["Espèces", "Virement", "Chèque", "Autre"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Cours concerné <small>Facultatif</small>
        <select
          value={form.courseId}
          onChange={(e) => setForm({ ...form, courseId: e.target.value })}
        >
          <option value="">Non précisé</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Référence <small>Facultatif</small>
        <input
          value={form.reference}
          onChange={(e) => setForm({ ...form, reference: e.target.value })}
          placeholder="Ex. reçu papier 024"
        />
      </label>
      <div className="sw-form-actions">
        <button className="sw-primary">
          <Check size={16} />
          Enregistrer le règlement
        </button>
      </div>
    </form>
  );
}
export function TeamPage({
  data,
  notify,
}: {
  data: Workspace;
  notify: (s: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [editing, setEditing] = useState<Teacher | "new" | null>(null);
  const visible = data.team.filter((t) =>
    `${t.name} ${t.subject} ${t.email || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        title="Équipe pédagogique"
        description="Les enseignants et les matières de votre centre."
        actions={
          <button className="sw-primary" onClick={() => setEditing("new")}>
            <Plus size={17} />
            Ajouter un enseignant
          </button>
        }
      />
      <div className="sw-surface">
        <div className="sw-surface-toolbar">
          <span className="sw-list-count">
            {data.team.filter((t) => t.status !== "suspended").length}{" "}
            enseignant
            {data.team.filter((t) => t.status !== "suspended").length !== 1
              ? "s"
              : ""}{" "}
            actif
            {data.team.filter((t) => t.status !== "suspended").length !== 1
              ? "s"
              : ""}
          </span>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Nom ou matière"
          />
        </div>
        {visible.length ? (
          <div className="sw-table-scroll">
            <table className="sw-data-table">
              <thead>
                <tr>
                  <th>Enseignant</th>
                  <th>Matière</th>
                  <th>Cours attribués</th>
                  <th>État</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <button
                        className="sw-person-link"
                        onClick={() => setEditing(t)}
                      >
                        <Avatar name={t.name} />
                        <span>
                          <strong>{t.name}</strong>
                          <small>{t.email || "Email non renseigné"}</small>
                        </span>
                      </button>
                    </td>
                    <td>{t.subject || "Non renseignée"}</td>
                    <td>
                      {
                        Object.values(data.meta).filter(
                          (m) => m.teacherId === t.id,
                        ).length
                      }
                    </td>
                    <td>
                      <Badge status={t.status || "active"} />
                    </td>
                    <td>
                      <div className="sw-inline-actions">
                        <button
                          className="sw-text-button"
                          onClick={() => setEditing(t)}
                        >
                          Modifier
                        </button>
                        <button
                          className="sw-icon"
                          aria-label={
                            t.status === "suspended"
                              ? "Réactiver " + t.name
                              : "Suspendre " + t.name
                          }
                          onClick={() => {
                            write(
                              keys.team,
                              data.team.map((x) =>
                                x.id === t.id
                                  ? {
                                      ...x,
                                      status:
                                        t.status === "suspended"
                                          ? "active"
                                          : "suspended",
                                    }
                                  : x,
                              ),
                            );
                            recordActivity(
                              "Équipe mise à jour · " + t.name,
                              "settings",
                            );
                            notify(
                              "Répertoire mis à jour. Les accès existants aux cours sont conservés.",
                            );
                          }}
                        >
                          {t.status === "suspended" ? (
                            <Play size={15} />
                          ) : (
                            <Pause size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Construisez votre équipe"
            description="Ajoutez un enseignant pour lui attribuer des cours. Aucun compte ni invitation email n’est créé automatiquement."
          />
        )}
      </div>
      {editing && (
        <Drawer
          title={
            editing === "new"
              ? "Ajouter un enseignant"
              : "Modifier l’enseignant"
          }
          description="Ce répertoire organise votre centre. Il ne crée pas de compte de connexion."
          onClose={() => setEditing(null)}
        >
          <TeacherForm
            teacher={editing === "new" ? undefined : editing}
            onSave={(t) => {
              write(
                keys.team,
                editing === "new"
                  ? [...data.team, t]
                  : data.team.map((x) => (x.id === t.id ? t : x)),
              );
              setEditing(null);
              notify("Enseignant enregistré.");
            }}
          />
        </Drawer>
      )}
    </>
  );
}
function TeacherForm({
  teacher,
  onSave,
}: {
  teacher?: Teacher;
  onSave: (t: Teacher) => void;
}) {
  const [form, setForm] = useState({
    name: teacher?.name || "",
    subject: teacher?.subject || "",
    email: teacher?.email || "",
  });
  return (
    <form
      className="sw-form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          ...form,
          id: teacher?.id || crypto.randomUUID(),
          status: teacher?.status || "active",
        });
      }}
    >
      <label>
        Nom complet
        <input
          required
          minLength={2}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label>
        Matière
        <input
          required
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder="Ex. Mathématiques"
        />
      </label>
      <label>
        Email <small>Facultatif</small>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </label>
      <button className="sw-primary">
        <Save size={16} />
        Enregistrer l’enseignant
      </button>
    </form>
  );
}
export function ReportsPage({
  data,
  courses,
  courseId,
}: {
  data: Workspace;
  courses: Course[];
  courseId?: string;
}) {
  const [query, setQuery] = useState(""),
    [selectedCourse, setSelectedCourse] = useState(courseId || "all");
  const progress = read<Record<string, Record<string, string[]>>>(
    "teachable-progress-v2",
    {},
  );
  const ids = new Set([
    ...data.centerStudents.map((s) => s.id),
    ...Object.keys(data.enrollments).filter(
      (id) => id === "demo" || data.centerStudents.some((s) => s.id === id),
    ),
  ]);
  const rows = Array.from(ids)
    .map((id) => {
      const liveCourses = courses.filter(
        (c) =>
          c.published &&
          (selectedCourse === "all" || c.id === selectedCourse) &&
          data.access.some(
            (a) =>
              a.studentId === id &&
              a.courseId === c.id &&
              accessState(a) === "active",
          ),
      );
      let total = 0,
        done = 0;
      liveCourses.forEach((c) => {
        const lessons = c.sections
          .flatMap((s) => s.lessons)
          .filter((l) => l.published);
        total += lessons.length;
        done += new Set(
          (progress[id]?.[c.id] || []).filter((lid) =>
            lessons.some((l) => l.id === lid),
          ),
        ).size;
      });
      return {
        id,
        name:
          data.students.find((s) => s.id === id)?.name ||
          (id === "demo" ? "Élève de démonstration" : "Profil non disponible"),
        courses: liveCourses.length,
        total,
        done,
        rate: total ? Math.round((done / total) * 100) : 0,
      };
    })
    .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
  const tracked = rows.filter((r) => r.total > 0);
  return (
    <>
      <PageTitle
        title="Suivi pédagogique"
        description="La progression réelle sur les leçons publiées des cours accessibles."
        actions={
          <button
            className="sw-secondary"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv("suivi-" + today() + ".csv", [
                [
                  "Élève",
                  "Cours accessibles",
                  "Leçons terminées",
                  "Total leçons",
                  "Progression %",
                ],
                ...rows.map((r) => [
                  r.name,
                  r.courses,
                  r.done,
                  r.total,
                  r.rate,
                ]),
              ])
            }
          >
            <Download size={16} />
            Exporter le suivi
          </button>
        }
      />
      <div className="sw-metric-strip">
        <div>
          <span>Élèves suivis</span>
          <strong>{tracked.length}</strong>
        </div>
        <div>
          <span>Progression moyenne</span>
          <strong>
            {tracked.length
              ? Math.round(
                  tracked.reduce((n, r) => n + r.rate, 0) / tracked.length,
                )
              : 0}
            <small>%</small>
          </strong>
        </div>
        <div>
          <span>Leçons terminées</span>
          <strong>{rows.reduce((n, r) => n + r.done, 0)}</strong>
        </div>
      </div>
      <div className="sw-surface">
        <div className="sw-surface-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Rechercher un élève"
          />
          <select
            aria-label="Filtrer le suivi par cours"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="all">Tous les cours</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        {rows.length ? (
          <div className="sw-table-scroll">
            <table className="sw-data-table">
              <thead>
                <tr>
                  <th>Élève</th>
                  <th>Cours accessibles</th>
                  <th>Leçons terminées</th>
                  <th>Progression</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.name}</strong>
                    </td>
                    <td>{r.courses}</td>
                    <td>
                      {r.done} / {r.total}
                    </td>
                    <td>
                      {r.total ? (
                        <div className="sw-progress-cell">
                          <div
                            role="progressbar"
                            aria-label={"Progression de " + r.name}
                            aria-valuenow={r.rate}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <i style={{ width: r.rate + "%" }} />
                          </div>
                          <span>{r.rate}%</span>
                        </div>
                      ) : (
                        <span className="sw-soft-note">
                          Aucune leçon disponible
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="Le suivi commence avec les élèves"
            description="La progression apparaîtra après l’attribution d’un cours publié et les premières leçons terminées."
          />
        )}
      </div>
    </>
  );
}
export function QuestionsPage({
  data,
  courses,
  notify,
  courseId,
}: {
  data: Workspace;
  courses: Course[];
  notify: (s: string) => void;
  courseId?: string;
}) {
  const [filter, setFilter] = useState("unanswered"),
    [course, setCourse] = useState(courseId || "all"),
    [selected, setSelected] = useState(""),
    [draft, setDraft] = useState("");
  const questions = data.questions
    .filter(
      (q) =>
        (course === "all" || q.courseId === course) &&
        (filter === "all" || !q.replies.length),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const current = questions.find((q) => q.id === selected) || questions[0];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!current || !draft.trim()) return;
    write(
      keys.questions,
      data.questions.map((q) =>
        q.id === current.id
          ? {
              ...q,
              replies: [
                ...q.replies,
                {
                  id: crypto.randomUUID(),
                  body: draft.trim(),
                  createdAt: new Date().toISOString(),
                  author: data.profile.contact || "Équipe pédagogique",
                },
              ],
            }
          : q,
      ),
    );
    recordActivity(
      "Réponse publiée · " +
        (courses.find((c) => c.id === current.courseId)?.title || "Cours"),
      "question",
    );
    setDraft("");
    setFilter("all");
    notify("Réponse publiée dans le fil du cours.");
  };
  return (
    <>
      <PageTitle
        title="Questions & réponses"
        description="Un espace pédagogique partagé dans chaque cours, sans messagerie privée."
      />
      <div className="sw-surface-toolbar sw-questions-toolbar">
        <Tabs
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setDraft("");
          }}
          items={[
            {
              id: "unanswered",
              label: "Sans réponse",
              count: data.questions.filter((q) => !q.replies.length).length,
            },
            {
              id: "all",
              label: "Toutes les questions",
              count: data.questions.length,
            },
          ]}
        />
        <select
          aria-label="Filtrer les questions par cours"
          value={course}
          onChange={(e) => {
            setCourse(e.target.value);
            setDraft("");
          }}
        >
          <option value="all">Tous les cours</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      {questions.length ? (
        <div className="sw-inbox sw-surface">
          <div className="sw-inbox-list">
            {questions.map((q) => (
              <button
                className={q.id === current?.id ? "active" : ""}
                key={q.id}
                onClick={() => {
                  setSelected(q.id);
                  setDraft("");
                }}
              >
                <small>
                  {courses.find((c) => c.id === q.courseId)?.title || "Cours"}
                </small>
                <strong>{q.body}</strong>
                <span>
                  {data.students.find((s) => s.id === q.studentId)?.name ||
                    "Élève de démonstration"}{" "}
                  · {dateLabel(q.createdAt)}
                </span>
                <Badge status={q.replies.length ? "answered" : "unanswered"} />
              </button>
            ))}
          </div>
          {current && (
            <section className="sw-inbox-thread">
              <header>
                <BookOpen size={18} />
                <div>
                  <strong>
                    {courses.find((c) => c.id === current.courseId)?.title ||
                      "Cours"}
                  </strong>
                  <small>
                    Visible aux élèves disposant d’un accès au cours
                  </small>
                </div>
              </header>
              <article className="sw-question-message">
                <Avatar
                  name={
                    data.students.find((s) => s.id === current.studentId)
                      ?.name || "Élève"
                  }
                />
                <div>
                  <strong>
                    {data.students.find((s) => s.id === current.studentId)
                      ?.name || "Élève de démonstration"}
                  </strong>
                  <p>{current.body}</p>
                  <small>{dateLabel(current.createdAt)}</small>
                </div>
              </article>
              {current.replies.map((r) => (
                <article className="sw-question-message is-reply" key={r.id}>
                  <Avatar name={r.author} />
                  <div>
                    <strong>{r.author}</strong>
                    <p>{r.body}</p>
                    <small>{dateLabel(r.createdAt)}</small>
                  </div>
                </article>
              ))}
              <form className="sw-form-stack" onSubmit={submit}>
                <label>
                  Votre réponse
                  <textarea
                    required
                    rows={4}
                    placeholder="Aidez l’élève à comprendre…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                </label>
                <button className="sw-primary" disabled={!draft.trim()}>
                  <Send size={16} />
                  Publier la réponse
                </button>
              </form>
            </section>
          )}
        </div>
      ) : (
        <div className="sw-surface">
          <Empty
            title={
              filter === "unanswered"
                ? "Vous êtes à jour"
                : "Les échanges commencent dans les cours"
            }
            description={
              filter === "unanswered"
                ? "Toutes les questions ont reçu une réponse."
                : "Les questions posées par les élèves apparaîtront ici avec le cours et leur auteur."
            }
          />
        </div>
      )}
    </>
  );
}
export function SettingsPage({ data, notify }: Pick<Base, "data" | "notify">) {
  const [tab, setTab] = useState("profile"),
    [form, setForm] = useState<Profile>(data.profile),
    [saved, setSaved] = useState(false);
  const exportData = () => {
    const centerIds = new Set(data.centerStudents.map((s) => s.id));
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      state: Object.fromEntries(
        Object.values(keys)
          .filter((key) => key !== keys.registry)
          .map((key) => {
            let value: unknown = read(key, null);
            if (key === keys.students) value = data.centerStudents;
            if ([keys.codes, keys.memberships, keys.enrollments].includes(key))
              value = Object.fromEntries(
                Object.entries((value || {}) as Record<string, unknown>).filter(
                  ([id]) => centerIds.has(id),
                ),
              );
            if (key === keys.access)
              value = Object.fromEntries(
                Object.entries(
                  (value || {}) as Record<string, { studentId: string }>,
                ).filter(([, item]) => centerIds.has(item.studentId)),
              );
            if ([keys.payments, keys.questions].includes(key))
              value = (Array.isArray(value) ? value : []).filter(
                (item: { studentId: string }) => centerIds.has(item.studentId),
              );
            return [key, value];
          }),
      ),
      courses: read("teachable-recreation-v1", {}),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "oustadi-plus-" + today() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(data.profile);
  return (
    <>
      <PageTitle
        title="Paramètres"
        description="L’identité du centre, les préférences et vos données."
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "profile", label: "Profil du centre" },
          { id: "access", label: "Politique d’accès" },
          { id: "data", label: "Données & rôles" },
        ]}
      />
      {tab === "profile" ? (
        <div className="sw-settings-layout">
          <section className="sw-surface sw-padded">
            <div className="sw-section-heading">
              <h2>Votre centre</h2>
              <p>Les informations utilisées dans cet espace pédagogique.</p>
            </div>
            <form
              className="sw-form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                write(keys.profile, form);
                recordActivity("Profil du centre mis à jour", "settings");
                setSaved(true);
                notify("Profil du centre enregistré.");
              }}
            >
              <label>
                Nom du centre
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => {
                    setSaved(false);
                    setForm({ ...form, name: e.target.value });
                  }}
                />
              </label>
              <div className="sw-field-pair">
                <label>
                  Responsable
                  <input
                    value={form.contact}
                    onChange={(e) =>
                      setForm({ ...form, contact: e.target.value })
                    }
                    placeholder="Nom du responsable"
                  />
                </label>
                <label>
                  Ville
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="Votre ville"
                  />
                </label>
              </div>
              <div className="sw-field-pair">
                <label>
                  Email de contact
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  Téléphone
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Adresse
                <input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </label>
              <label>
                Présentation
                <textarea
                  rows={3}
                  maxLength={500}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  placeholder="Quelques mots sur votre centre."
                />
              </label>
              <div className="sw-form-actions">
                <button
                  type="button"
                  className="sw-secondary"
                  disabled={!dirty}
                  onClick={() => {
                    setForm(data.profile);
                    setSaved(false);
                  }}
                >
                  Annuler les modifications
                </button>
                <button className="sw-primary" disabled={!dirty}>
                  <Save size={16} />
                  {saved ? "Enregistré" : "Enregistrer"}
                </button>
              </div>
            </form>
          </section>
          <aside className="sw-surface sw-padded sw-center-preview">
            <img src="/swaye3/logo-fr.svg" alt="Oustadi Plus" />
            <h2>{form.name || "Votre centre"}</h2>
            {form.city && (
              <p>
                <MapPin size={15} />
                {form.city}
              </p>
            )}
            {form.email && (
              <p>
                <Mail size={15} />
                {form.email}
              </p>
            )}
            <p>{form.bio || "Votre espace de soutien, entre les séances."}</p>
            <span className="sw-preview-label">
              Aperçu de l’identité du centre
            </span>
          </aside>
        </div>
      ) : tab === "access" ? (
        <div className="sw-settings-layout">
          <section className="sw-surface sw-padded">
            <div className="sw-section-heading">
              <h2>Règles de référence</h2>
              <p>
                Les accès pédagogiques sont gérés depuis le dossier de chaque
                élève.
              </p>
            </div>
            <div className="sw-policy-reference">
              <div>
                <strong>1</strong>
                <span>appareil enregistré par élève</span>
              </div>
              <div>
                <strong>1</strong>
                <span>centre actif par élève</span>
              </div>
              <div>
                <strong>7 jours</strong>
                <span>
                  de grâce après l’expiration de l’abonnement du centre
                </span>
              </div>
              <div className="sw-inline-note">
                <ShieldCheck size={18} />
                <p>
                  Politique cible du prototype. Le contrôle des appareils, le
                  registre partagé et l’abonnement du centre nécessitent les
                  services de production.
                </p>
              </div>
            </div>
          </section>
          <aside className="sw-surface sw-padded">
            <h2>Les droits restent distincts</h2>
            <ul className="sw-principles">
              <li>
                Un règlement ne donne pas automatiquement accès à un cours.
              </li>
              <li>Les échéances des cours sont enregistrées par élève.</li>
              <li>
                Le départ d’un enseignant ne supprime pas les accès existants.
              </li>
              <li>
                Le non-paiement du centre ne modifie pas les dates déjà
                accordées.
              </li>
            </ul>
          </aside>
        </div>
      ) : (
        <div className="sw-surface sw-padded">
          <h2>Vos données</h2>
          <p className="sw-soft-note">
            Les modifications sont conservées dans le navigateur et
            synchronisées avec le serveur local. L’export contient les dossiers,
            les accès, les cours et les règlements. Les fichiers de cours
            nécessitent une sauvegarde séparée du dossier .data.
          </p>
          <button className="sw-secondary" onClick={exportData}>
            <FileDown size={17} />
            Exporter les données en JSON
          </button>
          <div className="sw-subtle-divider" />
          <h2>Les espaces de travail</h2>
          <p className="sw-soft-note">
            Le sélecteur d’espace sert à prévisualiser les parcours. Il ne
            remplace pas l’authentification et les permissions d’un service de
            production.
          </p>
          <div className="sw-table-scroll">
            <table className="sw-data-table">
              <thead>
                <tr>
                  <th>Espace</th>
                  <th>Parcours disponible</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Centre de soutien</td>
                  <td>
                    Cours, élèves, inscriptions, équipe, encaissements et suivi
                  </td>
                </tr>
                <tr>
                  <td>Enseignant</td>
                  <td>Contenus pédagogiques, élèves, questions et suivi</td>
                </tr>
                <tr>
                  <td>Accueil</td>
                  <td>Dossiers élèves, rattachements et encaissements</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
export function LearnerQuestions({
  studentId,
  course,
  data,
}: {
  studentId: string;
  course: Course;
  data: Workspace;
}) {
  const [body, setBody] = useState(""),
    [sent, setSent] = useState(false);
  const questions = data.questions.filter((q) => q.courseId === course.id);
  return (
    <section className="sw-learner-questions">
      <h2>Questions & réponses</h2>
      <p>Un espace commun aux élèves du cours et à l’équipe pédagogique.</p>
      {questions.map((q) => (
        <article key={q.id}>
          <strong>
            {data.students.find((s) => s.id === q.studentId)?.name || "Élève"}
          </strong>
          <p>{q.body}</p>
          {q.replies.map((r) => (
            <blockquote key={r.id}>
              <strong>{r.author}</strong>
              <p>{r.body}</p>
            </blockquote>
          ))}
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim()) return;
          const q: Question = {
            id: crypto.randomUUID(),
            studentId,
            courseId: course.id,
            body: body.trim(),
            createdAt: new Date().toISOString(),
            replies: [],
          };
          write(keys.questions, [...data.questions, q]);
          setBody("");
          setSent(true);
        }}
      >
        <label>
          Poser une question
          <textarea
            required
            rows={3}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setSent(false);
            }}
            placeholder="Qu’aimeriez-vous mieux comprendre ?"
          />
        </label>
        <button className="sw-primary" disabled={!body.trim()}>
          <MessageCircle size={16} />
          Publier la question
        </button>
        {sent && <p role="status">Votre question a été publiée.</p>}
      </form>
    </section>
  );
}
