import { useEffect, useRef, type ReactNode } from "react";
import { X, Search, Inbox } from "lucide-react";
export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="sw-page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="sw-title-actions">{actions}</div>}
    </div>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="sw-empty-state">
      <Inbox size={27} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Rechercher…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="sw-search">
      <Search size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export function Tabs({
  items,
  value,
  onChange,
  label = "Filtrer",
}: {
  items: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="sw-tabs" aria-label={label}>
      {items.map((t) => (
        <button
          type="button"
          aria-pressed={value === t.id}
          className={value === t.id ? "active" : ""}
          key={t.id}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    unlinked: "À rattacher",
    active: "Actif",
    requested: "En attente",
    pending: "À activer",
    suspended: "Suspendu",
    expired: "Expiré",
    rejected: "Refusé",
    cancelled: "Annulé",
    published: "Publié",
    draft: "Brouillon",
    voided: "Annulé",
    recorded: "Consigné",
    answered: "Répondu",
    unanswered: "Sans réponse",
  };
  return (
    <span className={"sw-status is-" + status}>
      <i />
      {labels[status] || status}
    </span>
  );
}
export function Drawer({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const items = () =>
      Array.from(
        root?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ) || [],
      );
    items()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const all = items(),
          first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className={"sw-overlay " + (!wide ? "sw-overlay-centered" : "")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={ref}
        className={"sw-drawer " + (wide ? "wide" : "sw-modal")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="sw-icon" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </header>
        <div className="sw-drawer-body">{children}</div>
      </section>
    </div>
  );
}
export function Avatar({ name }: { name: string }) {
  return (
    <span className="sw-person-avatar" aria-hidden="true">
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
    </span>
  );
}
