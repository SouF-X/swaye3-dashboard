import { useState } from "react";
import {
  BookOpen,
  Check,
  ChevronRight,
  Search,
  UserRound,
  ArrowRight,
} from "lucide-react";
import type { Course } from "./model";
import { useWorkspace } from "./useWorkspace";
import {
  keys,
  write,
  read,
  hasAccess,
  saveAccess,
  recordActivity,
  dateLabel,
  type Membership,
} from "./swaye3Model";
import { Badge } from "./WorkspaceUI";
import "./learner.css";
import { StudentRegistration } from "./StudentRegistration";
import { StudentCard } from "./StudentIdentityCard";
export function LearnerPortal({
  courses,
  onOpenCourse,
  onAdmin,
  studentId = "demo",
  onStudentChange,
}: {
  courses: Course[];
  onOpenCourse: (id: string) => void;
  onAdmin: () => void;
  studentId?: string;
  onStudentChange?: (id: string) => void;
}) {
  const data = useWorkspace();
  const [registering, setRegistering] = useState(false),
    [showCard, setShowCard] = useState(false);
  const [search, setSearch] = useState(""),
    [notice, setNotice] = useState("");
  const published = courses.filter((c) => c.published),
    student = data.students.find((s) => s.id === studentId),
    member = data.member(studentId),
    mine = published.filter((c) => hasAccess(studentId, c.id));
  const progress = read<Record<string, Record<string, string[]>>>(
    "teachable-progress-v2",
    {},
  );
  const respond = (status: Membership["status"]) => {
    write(keys.memberships, {
      ...data.memberships,
      [studentId]: {
        ...data.memberships[studentId],
        status,
        respondedAt: new Date().toISOString(),
      },
    });
    recordActivity(
      `${status === "active" ? "Rattachement accepté" : "Rattachement refusé"} · ${student?.name || "Élève"}`,
      "student",
    );
    setNotice(
      status === "active"
        ? "Vous avez rejoint le centre."
        : "La demande de rattachement a été refusée.",
    );
  };
  const cover = (c: Course) => (
    <div className="learner-course-icon">
      {c.thumbnail ? <img src={c.thumbnail} alt="" /> : <BookOpen size={22} />}
    </div>
  );
  if (registering)
    return (
      <StudentRegistration
        onClose={() => setRegistering(false)}
        onComplete={(id) => {
          onStudentChange?.(id);
          setRegistering(false);
          setShowCard(true);
        }}
      />
    );
  return (
    <div className="learner-portal sw-learner-portal">
      <header className="learner-portal-head">
        <div>
          <img
            className="sw-learner-logo"
            src="/swaye3/logo-fr.svg"
            alt="Oustadi Plus"
          />
          <h1>Mon espace de cours</h1>
          <p>Bienvenue, {student?.name || "Élève de démonstration"}</p>
        </div>
        <div className="learner-account">
          <button className="btn" onClick={() => setRegistering(true)}>
            Créer mon profil élève
          </button>
          {student && (
            <button className="btn" onClick={() => setShowCard(!showCard)}>
              Ma carte élève
            </button>
          )}
          <UserRound size={18} />
          <label>
            Aperçu élève
            <select
              aria-label="Aperçu élève"
              value={studentId}
              onChange={(e) => onStudentChange?.(e.target.value)}
            >
              <option value="demo">Élève de démonstration</option>
              {data.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" onClick={onAdmin}>
            Espace du centre
          </button>
        </div>
      </header>
      <main>
        {student && showCard && (
          <StudentCard
            name={student.name}
            code={data.codes[student.id]}
            center="Oustadi Plus"
          />
        )}
        {notice && (
          <p role="status" className="sw-learner-notice">
            {notice}
          </p>
        )}
        {member.status === "requested" && (
          <section className="sw-learner-invitation">
            <div>
              <span>Demande de rattachement</span>
              <h2>{data.profile.name} vous invite à rejoindre son espace</h2>
              <p>
                Votre accord permet au centre de vous attribuer ses cours. Cet
                aperçu utilise les profils locaux.
              </p>
            </div>
            <div>
              <button
                className="sw-secondary"
                onClick={() => respond("rejected")}
              >
                Refuser
              </button>
              <button className="sw-primary" onClick={() => respond("active")}>
                <Check size={16} />
                Accepter le rattachement
              </button>
            </div>
          </section>
        )}
        {student && (
          <div className="sw-learner-id">
            <UserRound size={16} />
            <span>Mon identifiant</span>
            <code>{data.codes[studentId]}</code>
            <small>À présenter à l’accueil de votre centre</small>
          </div>
        )}
        <section>
          <div className="learner-section-title">
            <h2>Mes cours</h2>
            <span>{mine.length} cours</span>
          </div>
          {mine.length ? (
            <div className="learner-course-list">
              {mine.map((c) => {
                const lessons = c.sections
                  .flatMap((s) => s.lessons)
                  .filter((l) => l.published);
                const done = new Set(
                  (progress[studentId]?.[c.id] || []).filter((id) =>
                    lessons.some((l) => l.id === id),
                  ),
                );
                const pct = lessons.length
                  ? Math.round((done.size / lessons.length) * 100)
                  : 0;
                const access = data.access.find(
                  (a) => a.studentId === studentId && a.courseId === c.id,
                );
                return (
                  <article className="learner-course-row" key={c.id}>
                    {cover(c)}
                    <div className="learner-course-info">
                      <h3>{c.title}</h3>
                      <p>
                        {c.description ||
                          "Retrouvez vos leçons et vos supports de cours."}
                      </p>
                      <div className="learner-course-progress">
                        <div
                          className="progress"
                          role="progressbar"
                          aria-label={"Progression de " + c.title}
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <i style={{ width: pct + "%" }} />
                        </div>
                        <span>{pct}% terminé</span>
                      </div>
                      {access?.expiresAt && (
                        <small>
                          Accès jusqu’au {dateLabel(access.expiresAt)}
                        </small>
                      )}
                    </div>
                    <button
                      className="btn primary"
                      onClick={() => onOpenCourse(c.id)}
                    >
                      {pct ? "Reprendre" : "Commencer"}
                      <ChevronRight size={17} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="learner-empty">
              <h3>Vos cours vous attendent</h3>
              <p>
                Présentez votre identifiant à l’accueil. Le centre pourra vous
                attribuer un cours après votre rattachement.
              </p>
            </div>
          )}
        </section>
        <section className="learner-catalog">
          <div className="learner-section-title">
            <div>
              <h2>Les cours du centre</h2>
              <p>Les contenus publiés dans votre espace pédagogique.</p>
            </div>
            <label className="learner-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un cours"
                aria-label="Rechercher un cours"
              />
            </label>
          </div>
          <div className="learner-catalog-list">
            {published
              .filter((c) =>
                c.title.toLowerCase().includes(search.toLowerCase()),
              )
              .map((c) => {
                const granted = hasAccess(studentId, c.id);
                const pending = data.access.some(
                  (a) =>
                    a.studentId === studentId &&
                    a.courseId === c.id &&
                    a.status === "pending",
                );
                return (
                  <article className="learner-catalog-row" key={c.id}>
                    {cover(c)}
                    <div className="learner-course-info">
                      <h3>{c.title}</h3>
                      <p>
                        {c.description ||
                          "Découvrez ce cours avec votre centre."}
                      </p>
                      <span>
                        {c.sections.reduce(
                          (n, s) =>
                            n + s.lessons.filter((l) => l.published).length,
                          0,
                        )}{" "}
                        leçons
                      </span>
                    </div>
                    {granted ? (
                      <button
                        className="btn"
                        onClick={() => onOpenCourse(c.id)}
                      >
                        Ouvrir le cours
                        <ArrowRight size={15} />
                      </button>
                    ) : pending ? (
                      <Badge status="pending" />
                    ) : (
                      <button
                        className="btn"
                        disabled={member.status !== "active"}
                        onClick={() => {
                          saveAccess({
                            studentId,
                            courseId: c.id,
                            status: "pending",
                          });
                          setNotice(
                            "Votre demande d’accès est disponible à l’accueil du centre.",
                          );
                        }}
                      >
                        Demander l’accès
                      </button>
                    )}
                  </article>
                );
              })}
          </div>
          {!published.length && (
            <div className="learner-empty">
              <h3>Les cours sont en préparation</h3>
              <p>Les contenus publiés apparaîtront ici.</p>
            </div>
          )}
        </section>
        <p className="learner-local-note">
          Espace de démonstration local. Le sélecteur de profil ne constitue pas
          une authentification.
        </p>
      </main>
    </div>
  );
}
