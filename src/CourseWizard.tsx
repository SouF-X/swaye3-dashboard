import { useState } from "react";
import {
  Check,
  Upload,
  X,
  BookOpen,
  ChevronLeft,
  FileText,
} from "lucide-react";
import type { Section, Lesson, Block } from "./model";
import "./media-content.css";
import "./course-setup.css";
export type CourseDraft = {
  title: string;
  description: string;
  method: string;
  thumbnail?: string;
  sections?: Section[];
};
export function CourseWizard({
  step,
  draft,
  onChange,
  onStep,
  onClose,
  onFinish,
}: {
  step: number;
  draft: CourseDraft;
  onChange: (d: CourseDraft) => void;
  onStep: (n: number) => void;
  onClose: () => void;
  onFinish: () => void;
}) {
  const [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [uploadProgress, setUploadProgress] = useState("");
  const thumbnail = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
      setError("Choisissez une image de moins de 3 Mo.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw Error();
      const result = await response.json();
      if (!result.url?.startsWith("/uploads/")) throw Error();
      onChange({ ...draft, thumbnail: result.url });
    } catch {
      setError("L’image n’a pas pu être importée. Réessayez.");
    } finally {
      setUploading(false);
    }
  };
  const importFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setError("");
    const lessons: Lesson[] = [...(draft.sections?.[0]?.lessons || [])];
    const failures: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(
        `Import de ${i + 1} sur ${files.length} : ${file.name}`,
      );
      const type = file.type;
      const kind =
        type === "application/pdf"
          ? "PDF Viewer"
          : type.startsWith("video/")
            ? "Video"
            : type.startsWith("audio/")
              ? "Audio"
              : null;
      if (!kind || file.size > 50 * 1024 * 1024) {
        failures.push(file.name);
        continue;
      }
      try {
        const response = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": type },
          body: file,
        });
        if (!response.ok) throw Error();
        const result = await response.json();
        if (!result.url?.startsWith("/uploads/")) throw Error();
        const block: Block = {
          id: crypto.randomUUID(),
          type: kind,
          mediaUrl: result.url,
          fileName: file.name,
          mimeType: result.type || type,
        };
        lessons.push({
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^.]+$/, ""),
          published: false,
          comments: false,
          publicPreview: false,
          blocks: [block],
        });
      } catch {
        failures.push(file.name);
      }
    }
    onChange({
      ...draft,
      sections: [
        {
          id: draft.sections?.[0]?.id || crypto.randomUUID(),
          title: "Chapitre 1",
          lessons,
        },
      ],
    });
    setUploading(false);
    setUploadProgress("");
    if (failures.length)
      setError(
        `Fichiers non importés : ${failures.join(", ")}. Utilisez un PDF, une vidéo ou un audio pris en charge, de moins de 50 Mo.`,
      );
  };
  const bulk = draft.method === "Bulk upload",
    lessons = draft.sections?.flatMap((s) => s.lessons) || [];
  const next = () => {
    if (uploading || !draft.title.trim()) return;
    setError("");
    step === 3 ? onFinish() : onStep(step + 1);
  };
  return (
    <div className="wizard teachable-course-setup">
      <header className="wizard-top">
        <div className="course-setup-identity">
          <img src="/swaye3/logo-fr.svg" alt="Oustadi Plus" />
          <span>Créer un cours</span>
        </div>
        <div className="course-setup-top-actions">
          <span>Étape {step} sur 3</span>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            aria-label="Fermer la création du cours"
          >
            <X size={20} />
          </button>
        </div>
      </header>
      <form
        id="course-setup-form"
        className="wizard-body"
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        <div
          className="course-setup-progress"
          aria-label={`Étape ${step} sur 3`}
        >
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= step ? "complete" : ""} />
          ))}
        </div>
        {step === 1 ? (
          <>
            <h1>Présentez votre cours</h1>
            <p>
              Donnez-lui un titre et décrivez ce que vos élèves vont apprendre.
              Vous pourrez modifier ces informations à tout moment.
            </p>
            <label>
              Titre du cours
              <input
                autoFocus
                required
                maxLength={180}
                placeholder="Ex. Mathématiques · Fonctions et limites"
                value={draft.title}
                onChange={(e) => onChange({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              Présentation du cours{" "}
              <span className="course-setup-optional">Facultatif</span>
              <textarea
                rows={5}
                placeholder="Les objectifs, les notions abordées et les élèves auxquels ce cours s’adresse."
                value={draft.description}
                onChange={(e) =>
                  onChange({ ...draft, description: e.target.value })
                }
              />
            </label>
          </>
        ) : step === 2 ? (
          <>
            <h1>Ajoutez une image de couverture</h1>
            <p>
              Elle permettra aux élèves de reconnaître votre cours dans leur
              espace. Vous pouvez aussi l’ajouter plus tard.
            </p>
            <div className="thumbnail-choices">
              <div
                className={
                  "thumbnail-choice " + (draft.thumbnail ? "selected" : "")
                }
              >
                {draft.thumbnail ? (
                  <img src={draft.thumbnail} alt="Couverture sélectionnée" />
                ) : (
                  <>
                    <Upload size={28} />
                    <h2>Importer une image</h2>
                    <small>
                      Format 16:9 · 1024 × 576 recommandé
                      <br />
                      JPG, PNG ou WebP · 3 Mo maximum
                    </small>
                  </>
                )}
                <label className="file-control">
                  {uploading
                    ? "Import en cours…"
                    : draft.thumbnail
                      ? "Remplacer l’image"
                      : "Choisir une image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Importer une couverture"
                    disabled={uploading}
                    onChange={(e) => thumbnail(e.target.files?.[0])}
                  />
                </label>
              </div>
              <button
                type="button"
                className={
                  "thumbnail-choice " + (!draft.thumbnail ? "selected" : "")
                }
                disabled={uploading}
                onClick={() => onChange({ ...draft, thumbnail: undefined })}
              >
                {!draft.thumbnail && (
                  <Check className="course-setup-selected" size={19} />
                )}
                <BookOpen size={28} />
                <h2>Je l’ajouterai plus tard</h2>
                <p>Continuez avec une couverture simple.</p>
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>Préparez le contenu du cours</h1>
            <p>
              Choisissez votre point de départ. Les chapitres, les leçons et les
              contenus se gèrent ensuite dans l’éditeur.
            </p>
            <div className="course-setup-methods">
              <button
                type="button"
                className={"method " + (!bulk ? "selected" : "")}
                disabled={uploading}
                aria-pressed={!bulk}
                onClick={() =>
                  onChange({ ...draft, method: "Start from scratch" })
                }
              >
                <span className="course-setup-method-icon">
                  <BookOpen size={23} />
                </span>
                <div>
                  <h2>Commencer de zéro</h2>
                  <p>
                    Créez vos chapitres et ajoutez vos leçons à votre rythme.
                  </p>
                </div>
                {!bulk && <Check size={18} />}
              </button>
              <button
                type="button"
                className={"method " + (bulk ? "selected" : "")}
                disabled={uploading}
                aria-pressed={bulk}
                onClick={() => onChange({ ...draft, method: "Bulk upload" })}
              >
                <span className="course-setup-method-icon">
                  <Upload size={23} />
                </span>
                <div>
                  <h2>Importer mes fichiers</h2>
                  <p>Transformez vos vidéos, PDF et audios en leçons.</p>
                </div>
                {bulk && <Check size={18} />}
              </button>
            </div>
            {bulk && (
              <div className="course-setup-import">
                <label className="file-control">
                  <Upload size={16} />
                  {uploading ? "Import en cours…" : "Choisir les fichiers"}
                  <input
                    aria-label="Importer les fichiers du cours"
                    type="file"
                    multiple
                    accept="application/pdf,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/ogg,audio/wav"
                    disabled={uploading}
                    onChange={(e) =>
                      importFiles(Array.from(e.target.files || []))
                    }
                  />
                </label>
                <p>
                  Chaque fichier crée une leçon en brouillon. Aucun contenu
                  n’est publié automatiquement.
                </p>
                {uploadProgress && <p role="status">{uploadProgress}</p>}
                {lessons.length > 0 && (
                  <ul>
                    {lessons.map((l) => (
                      <li key={l.id}>
                        <FileText size={15} />
                        <span>{l.title}</span>
                        <Check size={14} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="course-setup-error">
            {error}
          </p>
        )}
      </form>
      <footer className="wizard-actions">
        {step > 1 && (
          <button
            className="btn"
            type="button"
            disabled={uploading}
            onClick={() => {
              setError("");
              onStep(step - 1);
            }}
          >
            <ChevronLeft size={16} />
            Retour
          </button>
        )}
        <div />
        <button
          className="btn"
          type="button"
          disabled={uploading}
          onClick={onClose}
        >
          Annuler
        </button>
        <button
          form="course-setup-form"
          type="submit"
          className="btn primary"
          disabled={
            !draft.title.trim() ||
            uploading ||
            (step === 3 && bulk && !lessons.length)
          }
        >
          {uploading
            ? "Import en cours…"
            : step === 3
              ? "Créer le cours"
              : "Continuer"}
        </button>
      </footer>
    </div>
  );
}
