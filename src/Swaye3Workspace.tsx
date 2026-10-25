import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ScanLine,
  Wallet,
  ChartNoAxesColumn,
  Settings,
  MessageCircle,
  ChevronRight,
  Plus,
  Menu,
  ArrowUpRight,
  ArrowRight,
  Check,
  Clock3,
  PanelLeftClose,
  GraduationCap,
} from "lucide-react";
import type { Course } from "./model";
import {
  read,
  write,
  accessState,
  dateLabel,
  type Activity,
} from "./swaye3Model";
import { useWorkspace, type Workspace } from "./useWorkspace";
import { PageTitle, Empty, Badge } from "./WorkspaceUI";
import { StudentPages, ReceptionPage } from "./StudentPages";
import {
  CourseCatalog,
  CourseDetails,
  PaymentsPage,
  TeamPage,
  ReportsPage,
  QuestionsPage,
  SettingsPage,
} from "./WorkspacePages";
import {
  getServerStorageStatus,
  subscribeServerStorageStatus,
} from "./serverStorage";
import "./swaye3.css";

type Props = {
  courses: Course[];
  path: string;
  onNavigate: (path: string) => void;
  onCoursesChange: (courses: Course[]) => void;
  children?: ReactNode;
};
type Role = "centre" | "enseignant" | "accueil";
const navigation = [
  {
    path: "/swaye3/overview",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    key: "overview",
    group: "pedagogy",
  },
  {
    path: "/admin-app/courses/index",
    label: "Cours & contenus",
    icon: BookOpen,
    key: "courses",
    group: "pedagogy",
  },
  {
    path: "/admin-app/users",
    label: "Élèves",
    icon: Users,
    key: "students",
    group: "pedagogy",
  },
  {
    path: "/swaye3/questions",
    label: "Questions & réponses",
    icon: MessageCircle,
    key: "questions",
    group: "pedagogy",
  },
  {
    path: "/swaye3/reports",
    label: "Suivi pédagogique",
    icon: ChartNoAxesColumn,
    key: "reports",
    group: "pedagogy",
  },
  {
    path: "/swaye3/enrollments",
    label: "Accueil & inscriptions",
    icon: ScanLine,
    key: "enrollments",
    group: "center",
  },
  {
    path: "/swaye3/team",
    label: "Équipe pédagogique",
    icon: GraduationCap,
    key: "team",
    group: "center",
  },
  {
    path: "/swaye3/payments",
    label: "Encaissements",
    icon: Wallet,
    key: "payments",
    group: "center",
  },
  {
    path: "/admin-app/settings",
    label: "Paramètres",
    icon: Settings,
    key: "settings",
    group: "settings",
  },
];
const allowed = (key: string, role: Role) => {
  if (role === "centre") return true;
  if (role === "enseignant") return !["team", "payments", "enrollments"].includes(key);
  return ["overview", "students", "enrollments", "payments"].includes(key);
};
export function Swaye3Workspace({
  courses,
  path,
  onNavigate,
  onCoursesChange,
  children,
}: Props) {
  const data = useWorkspace();
  const [role, setRole] = useState<Role>(() => {
    const value = read<Role>("teachable-swaye3-role-v1", "centre");
    return ["centre", "enseignant", "accueil"].includes(value)
      ? value
      : "centre";
  });
  const [isNarrow, setIsNarrow] = useState(
    () => window.matchMedia("(max-width:800px)").matches,
  );
  const [mobile, setMobile] = useState(false),
    [toast, setToast] = useState(""),
    [storage, setStorage] = useState(getServerStorageStatus);
  useEffect(() => subscribeServerStorageStatus(setStorage), []);
  useEffect(() => {
    document.documentElement.lang = "fr";
    document.documentElement.dir = "ltr";
  }, []);
  useEffect(() => {
    setMobile(false);
  }, [path]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    const query = window.matchMedia("(max-width:800px)");
    const change = () => setIsNarrow(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!mobile || !isNarrow) return;
    const before = document.activeElement as HTMLElement | null;
    const sidebar = document.querySelector<HTMLElement>(".sw-sidebar");
    const controls = () =>
      Array.from(sidebar?.querySelectorAll<HTMLElement>("button,select") || []);
    controls()[0]?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobile(false);
      if (e.key === "Tab") {
        const items = controls();
        if (e.shiftKey && document.activeElement === items[0]) {
          e.preventDefault();
          items.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === items.at(-1)) {
          e.preventDefault();
          items[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [mobile, isNarrow]);
  const courseMatch = path.match(
    /^\/admin-app\/courses\/([^/]+)(?:\/([^/]+))?/,
  );
  const course = courses.find((c) => c.id === courseMatch?.[1]);
  const courseSection = courseMatch?.[2] || "curriculum";
  const creating = path.includes("/create/courses");
  const current = course
    ? "courses"
    : path.includes("/courses/index") || creating
      ? "courses"
      : path.startsWith("/admin-app/users")
        ? "students"
        : path.startsWith("/admin-app/settings") || path === "/swaye3/access"
          ? "settings"
          : path.split("/").filter(Boolean).at(-1) || "overview";
  const page = navigation.find((n) => n.key === current);
  const notify = (message: string) => setToast(message);
  const navigate = (dest: string) => {
    setMobile(false);
    onNavigate(dest);
  };
  const shared = {
    data,
    courses,
    navigate,
    notify,
    readOnly: role === "enseignant",
  };
  const updateCourse = (updated: Course) =>
    onCoursesChange(courses.map((c) => (c.id === updated.id ? updated : c)));
  const content = () => {
    if (!allowed(current, role))
      return (
        <Empty
          title="Cette section appartient à un autre espace"
          description="Choisissez l’espace Centre de soutien pour gérer cette partie du centre."
          action={
            <button
              className="sw-secondary"
              onClick={() => navigate("/swaye3/overview")}
            >
              Revenir au tableau de bord
            </button>
          }
        />
      );
    if (course) {
      if (courseSection === "information")
        return (
          <CourseDetails
            course={course}
            data={data}
            onChange={updateCourse}
            navigate={navigate}
            notify={notify}
          />
        );
      if (courseSection === "students")
        return (
          <StudentPages key={course.id} {...shared} courseId={course.id} />
        );
      if (courseSection === "reports")
        return (
          <ReportsPage
            key={course.id}
            data={data}
            courses={courses}
            courseId={course.id}
          />
        );
      if (courseSection === "comments")
        return (
          <QuestionsPage
            key={course.id}
            data={data}
            courses={courses}
            courseId={course.id}
            notify={notify}
          />
        );
      return <div className="sw-authoring">{children}</div>;
    }
    switch (current) {
      case "overview":
        return (
          <Overview
            data={data}
            courses={courses}
            navigate={navigate}
            role={role}
          />
        );
      case "courses":
        return (
          <CourseCatalog
            key={creating ? "create" : "list"}
            {...shared}
            onChange={onCoursesChange}
            creatingInitially={creating}
          />
        );
      case "students":
        return <StudentPages {...shared} />;
      case "enrollments":
        return <ReceptionPage {...shared} />;
      case "payments":
        return <PaymentsPage {...shared} />;
      case "team":
        return <TeamPage data={data} notify={notify} />;
      case "reports":
        return <ReportsPage data={data} courses={courses} />;
      case "questions":
        return <QuestionsPage {...shared} />;
      case "settings":
        return <SettingsPage key={path} data={data} notify={notify} />;
      default:
        return (
          <Empty
            title="Retrouvons votre espace"
            description="Cette page n’appartient pas au parcours du centre."
            action={
              <button
                className="sw-primary"
                onClick={() => navigate("/swaye3/overview")}
              >
                Tableau de bord
              </button>
            }
          />
        );
    }
  };
  const unanswered = data.questions.filter((q) => !q.replies.length).length;
  const pending = data.students.filter(
    (s) => data.member(s.id).status === "requested",
  ).length;
  return (
    <div className="sw-app" dir="ltr">
      <a className="sw-skip-link" href="#workspace-main">
        Aller au contenu
      </a>
      {mobile && (
        <button
          className="sw-mobile-scrim"
          aria-label="Fermer la navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={"sw-sidebar " + (mobile ? "open" : "")}
        inert={isNarrow && !mobile}
        aria-hidden={isNarrow && !mobile}
      >
        <button
          className="sw-sidebar-close"
          aria-label="Fermer la navigation"
          onClick={() => setMobile(false)}
        >
          <PanelLeftClose size={20} />
        </button>
        <button
          className="sw-brand"
          onClick={() => navigate("/swaye3/overview")}
        >
          <img src="/swaye3/logo-fr.svg" alt="Oustadi Plus" />
        </button>
        <div className="sw-workspace-picker">
          <span className="sw-workspace-monogram">
            {data.profile.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{data.profile.name}</strong>
            <span>{data.profile.city || "Espace pédagogique"}</span>
          </div>
        </div>
        <label className="sw-role-picker">
          <span>Espace de travail</span>
          <select
            aria-label="Espace de travail"
            value={role}
            onChange={(e) => {
              const next = e.target.value as Role;
              setRole(next);
              write("teachable-swaye3-role-v1", next);
              if (!allowed(current, next)) navigate("/swaye3/overview");
            }}
          >
            <option value="centre">Centre de soutien</option>
            <option value="enseignant">Enseignant</option>
            <option value="accueil">Accueil</option>
          </select>
        </label>
        <nav aria-label="Navigation principale">
          {["pedagogy", "center", "settings"].map((group) => (
            <div className="sw-nav-group" key={group}>
              {group === "center" && role !== "enseignant" && (
                <span className="sw-nav-group-label">Gestion du centre</span>
              )}
              {navigation
                .filter((n) => n.group === group && allowed(n.key, role))
                .map((n) => (
                  <button
                    className={"sw-nav " + (current === n.key ? "active" : "")}
                    aria-current={current === n.key ? "page" : undefined}
                    key={n.key}
                    onClick={() => navigate(n.path)}
                  >
                    <n.icon size={18} />
                    <span>{n.label}</span>
                    {n.key === "questions" && unanswered > 0 && (
                      <b>{unanswered}</b>
                    )}
                    {n.key === "enrollments" && pending > 0 && <b>{pending}</b>}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="sw-sidebar-footer">
          <button
            className="sw-student-view"
            onClick={() => navigate("/school")}
          >
            <GraduationCap size={17} />
            <span>Voir l’espace élève</span>
            <ArrowUpRight size={15} />
          </button>
          <div className="sw-connection">
            <i className={storage.online ? "" : "offline"} />
            {storage.online
              ? "Espace local · Synchronisé"
              : "Enregistré dans le navigateur"}
          </div>
        </div>
      </aside>
      <div className="sw-main" inert={isNarrow && mobile}>
        <header className="sw-header">
          <div className="sw-header-left">
            <button
              className="sw-menu"
              aria-label={mobile ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <PanelLeftClose size={20} /> : <Menu size={20} />}
            </button>
            <div className="sw-breadcrumb">
              <span>Mon espace</span>
              <ChevronRight size={14} />
              <strong>{page?.label || "Tableau de bord"}</strong>
              {course && (
                <>
                  <ChevronRight size={14} />
                  <span className="sw-breadcrumb-course">{course.title}</span>
                </>
              )}
            </div>
          </div>
          <div className="sw-header-right">
            {role !== "accueil" && (
              <button
                className="sw-header-create"
                aria-label="Créer un cours"
                onClick={() => navigate("/admin-app/create/courses/step-1")}
              >
                <Plus size={16} />
                <span>Créer un cours</span>
              </button>
            )}
            <span className="sw-header-divider" />
            <button
              className="sw-account"
              onClick={() =>
                navigate(
                  role === "accueil"
                    ? "/swaye3/overview"
                    : "/admin-app/settings",
                )
              }
              aria-label="Profil du centre"
            >
              {(data.profile.contact || data.profile.name)
                .slice(0, 1)
                .toUpperCase()}
            </button>
          </div>
        </header>
        <main id="workspace-main" className="sw-content" tabIndex={-1}>
          {course && (
            <div className="sw-course-context">
              <button
                className="sw-text-button"
                onClick={() => navigate("/admin-app/courses/index")}
              >
                Tous les cours
              </button>
              <div>
                <h2>{course.title}</h2>
                <Badge status={course.published ? "published" : "draft"} />
              </div>
              <nav aria-label="Navigation du cours">
                {[
                  ["curriculum", "Contenu"],
                  ["information", "Informations"],
                  ["students", "Élèves"],
                  ["comments", "Questions"],
                  ["reports", "Progression"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    aria-current={courseSection === key ? "page" : undefined}
                    className={courseSection === key ? "active" : ""}
                    onClick={() =>
                      navigate(`/admin-app/courses/${course.id}/${key}`)
                    }
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          )}
          {content()}
        </main>
      </div>
      {toast && (
        <div className="sw-toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Overview({
  data,
  courses,
  navigate,
  role,
}: {
  data: Workspace;
  courses: Course[];
  navigate: (path: string) => void;
  role: Role;
}) {
  const published = courses.filter((c) => c.published);
  const active = new Set(
    data.access
      .filter((a) => accessState(a) === "active" && data.students.some((student) => student.id === a.studentId))
      .map((a) => a.studentId),
  );
  const pending = data.students.filter(
    (s) => data.member(s.id).status === "requested",
  );
  const unanswered = data.questions.filter((q) => !q.replies.length);
  const expired = data.access.filter((a) => accessState(a) === "expired");
  const date = new Intl.DateTimeFormat("fr-MA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Casablanca",
  }).format(new Date());
  const draft = courses.filter((c) => !c.published);
  return (
    <>
      <PageTitle
        title={
          role === "enseignant"
            ? "Votre espace pédagogique"
            : role === "accueil"
              ? "Bienvenue à l’accueil"
              : "Tableau de bord"
        }
        description={`${date.charAt(0).toUpperCase() + date.slice(1)} · ${data.profile.name}`}
        actions={
          <button
            className="sw-primary"
            onClick={() =>
              navigate(
                role === "enseignant"
                  ? "/admin-app/courses/index"
                  : "/swaye3/enrollments",
              )
            }
          >
            {role === "enseignant" ? (
              <BookOpen size={17} />
            ) : (
              <ScanLine size={17} />
            )}{" "}
            {role === "enseignant" ? "Gérer mes cours" : "Accueillir un élève"}
          </button>
        }
      />
      <div className="sw-metric-strip">
        <div>
          <span>Cours publiés</span>
          <strong>
            {published.length}
            <small>/ {courses.length}</small>
          </strong>
          <p>
            {draft.length} brouillon{draft.length !== 1 ? "s" : ""} à préparer
          </p>
        </div>
        <div>
          <span>Élèves avec accès</span>
          <strong>{active.size}</strong>
          <p>Sur les cours de cet espace</p>
        </div>
        <div>
          <span>
            {role === "enseignant"
              ? "Questions sans réponse"
              : "Rattachements en attente"}
          </span>
          <strong>
            {role === "enseignant" ? unanswered.length : pending.length}
          </strong>
          <p>
            {role === "enseignant"
              ? "Pour accompagner les élèves"
              : "À valider dans l’espace élève"}
          </p>
        </div>
      </div>
      <div className="sw-overview-grid">
        <section className="sw-surface">
          <div className="sw-section-heading sw-heading-between">
            <div>
              <h2>
                {role === "accueil"
                  ? "Les dernières demandes"
                  : "Vos cours, au quotidien"}
              </h2>
              <p>
                {role === "accueil"
                  ? "Retrouvez les élèves à accompagner."
                  : "Reprenez la préparation de votre contenu."}
              </p>
            </div>
            <button
              className="sw-text-button"
              onClick={() =>
                navigate(
                  role === "accueil"
                    ? "/admin-app/users"
                    : "/admin-app/courses/index",
                )
              }
            >
              Voir tout
              <ArrowRight size={15} />
            </button>
          </div>
          {role === "accueil" ? (
            pending.length ? (
              <div className="sw-compact-list">
                {pending.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => navigate("/swaye3/enrollments")}
                  >
                    <Users size={19} />
                    <span>
                      <strong>{s.name}</strong>
                      <small>{data.codes[s.id]}</small>
                    </span>
                    <Badge status="requested" />
                  </button>
                ))}
              </div>
            ) : (
              <Empty
                title="Aucune demande en attente"
                description="Les nouvelles demandes de rattachement apparaîtront ici."
              />
            )
          ) : courses.length ? (
            <div className="sw-overview-courses">
              {[...draft, ...published].slice(0, 4).map((c) => (
                <button
                  key={c.id}
                  onClick={() =>
                    navigate(`/admin-app/courses/${c.id}/curriculum`)
                  }
                >
                  <span className="sw-overview-cover">
                    {c.thumbnail ? (
                      <img src={c.thumbnail} alt="" />
                    ) : (
                      <BookOpen size={20} />
                    )}
                  </span>
                  <span>
                    <strong>{c.title}</strong>
                    <small>
                      {c.sections.length} chapitres ·{" "}
                      {c.sections.reduce((n, s) => n + s.lessons.length, 0)}{" "}
                      leçons
                    </small>
                  </span>
                  <Badge status={c.published ? "published" : "draft"} />
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="Préparez votre premier cours"
              description="Un titre, des chapitres, puis vos premières leçons."
              action={
                <button
                  className="sw-primary"
                  onClick={() => navigate("/admin-app/create/courses/step-1")}
                >
                  <Plus size={16} />
                  Créer un cours
                </button>
              }
            />
          )}
        </section>
        <aside className="sw-surface sw-priority">
          <div className="sw-section-heading">
            <h2>À suivre</h2>
            <p>Les prochaines actions utiles.</p>
          </div>
          {role !== "enseignant" && (
            <button onClick={() => navigate("/swaye3/enrollments")}>
              <span className="sw-priority-icon peach">
                <ScanLine size={19} />
              </span>
              <span>
                <strong>Rattachements</strong>
                <small>
                  {pending.length
                    ? "Des élèves attendent votre suivi."
                    : "Aucune demande en attente."}
                </small>
              </span>
              <b>{pending.length}</b>
            </button>
          )}
          {role !== "accueil" && (
            <button onClick={() => navigate("/swaye3/questions")}>
              <span className="sw-priority-icon">
                <MessageCircle size={19} />
              </span>
              <span>
                <strong>Questions des élèves</strong>
                <small>
                  {unanswered.length
                    ? "Des questions restent sans réponse."
                    : "Les échanges sont à jour."}
                </small>
              </span>
              <b>{unanswered.length}</b>
            </button>
          )}
          {role !== "enseignant" && (
            <button onClick={() => navigate("/swaye3/enrollments")}>
              <span className="sw-priority-icon warm">
                <Clock3 size={19} />
              </span>
              <span>
                <strong>Accès à renouveler</strong>
                <small>
                  {expired.length
                    ? "Des accès sont arrivés à échéance."
                    : "Aucun accès expiré."}
                </small>
              </span>
              <b>{expired.length}</b>
            </button>
          )}
          <div className="sw-priority-note">
            <Check size={16} />
            <p>Les inscriptions et les règlements sont suivis séparément.</p>
          </div>
        </aside>
      </div>
      <section className="sw-surface sw-recent">
        <div className="sw-section-heading">
          <h2>Activité récente</h2>
          <p>Les dernières actions enregistrées dans votre espace.</p>
        </div>
        {data.activity.length ? (
          <div className="sw-activity-list">
            {data.activity.slice(0, 5).map((a) => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </div>
        ) : (
          <p className="sw-quiet-empty">
            Vos prochaines actions apparaîtront ici : création de cours,
            inscriptions et règlements.
          </p>
        )}
      </section>
    </>
  );
}
function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div>
      <span className="sw-activity-dot" />
      <div>
        <p>{activity.label}</p>
        <small>{dateLabel(activity.at)}</small>
      </div>
    </div>
  );
}
