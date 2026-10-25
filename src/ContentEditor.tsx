import React, { useState, useRef, useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Plus,
  X,
  GripVertical,
} from "lucide-react";
import type { Block } from "./model";
import { contentLabel } from "./contentLabels";
import "./media-content.css";

// Local content is rendered with a small allowlist; event attributes and active embeds never survive.
export function safeHtml(value: string) {
  const doc = new DOMParser().parseFromString(value, "text/html");
  const allowed = new Set([
    "P",
    "BR",
    "DIV",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "UL",
    "OL",
    "LI",
    "H2",
    "H3",
    "BLOCKQUOTE",
    "A",
    "PRE",
    "CODE",
  ]);
  for (const el of Array.from(doc.body.querySelectorAll("*"))) {
    if (!allowed.has(el.tagName)) {
      el.replaceWith(doc.createTextNode(el.textContent || ""));
      continue;
    }
    for (const a of Array.from(el.attributes)) {
      if (
        a.name !== "href" ||
        el.tagName !== "A" ||
        !/^https?:\/\//i.test(a.value)
      )
        el.removeAttribute(a.name);
    }
  }
  return doc.body.innerHTML;
}
function safeMediaUrl(value?: string) {
  if (!value || /^\s*(javascript|data|blob):/i.test(value)) return "";
  try {
    const parsed = new URL(value, window.location.origin);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    if (
      parsed.origin === window.location.origin &&
      (parsed.pathname.startsWith("/uploads/") ||
        parsed.pathname.startsWith("/reference/"))
    )
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (/^https?:\/\//i.test(value)) return parsed.href;
    return "";
  } catch {
    return "";
  }
}
function localResponses(blockId: string, response: string) {
  try {
    const prior = JSON.parse(
      localStorage.getItem("teachable-responses-v1") || "[]",
    );
    localStorage.setItem(
      "teachable-responses-v1",
      JSON.stringify([
        ...prior,
        { blockId, response, createdAt: new Date().toISOString() },
      ]),
    );
    return true;
  } catch {
    return false;
  }
}
export function BlockContent({ block }: { block: Block }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const media = safeMediaUrl(block.mediaUrl || block.content);
  const type = block.type;
  if (type === "Quiz")
    return (
      <div>
        <strong>QUIZ</strong>
        {block.questions?.length ? (
          block.questions.map((q, i) => (
            <fieldset key={i}>
              <legend>{q.title}</legend>
              {q.answers
                .filter((a) => a.trim())
                .map((a, j) => (
                  <label className="quiz-answer" key={j}>
                    <input type="radio" name={`quiz-${block.id}-${i}`} />
                    {a}
                  </label>
                ))}
            </fieldset>
          ))
        ) : (
          <p>Aucune question pour le moment.</p>
        )}
      </div>
    );
  if (type === "Text & Images")
    return block.content?.startsWith("<") ? (
      <div
        className="rendered-content"
        dangerouslySetInnerHTML={{ __html: safeHtml(block.content) }}
      />
    ) : (
      <p className="plain-content">{block.content}</p>
    );
  if (type === "Video")
    return media ? (
      <video
        className="lesson-video"
        controls
        preload="metadata"
        src={media}
        aria-label={block.fileName || "Vidéo de la leçon"}
      />
    ) : (
      <p className="media-empty">La vidéo n’est pas disponible.</p>
    );
  if (type === "Audio")
    return media ? (
      <audio className="lesson-audio" controls preload="metadata" src={media}>
        {block.fileName || "Audio de la leçon"}
      </audio>
    ) : (
      <p className="media-empty">L’audio n’est pas disponible.</p>
    );
  if (type === "PDF Viewer")
    return media ? (
      <div className="pdf-viewer">
        <iframe
          title={block.fileName || "Document PDF"}
          src={media}
          loading="lazy"
          sandbox="allow-scripts"
        />
        <a href={media} target="_blank" rel="noopener noreferrer">
          Ouvrir le PDF dans un nouvel onglet
        </a>
      </div>
    ) : (
      <p className="media-empty">Le PDF n’est pas disponible.</p>
    );
  if (type === "Resource")
    return media ? (
      <a
        className="lesson-resource"
        href={media}
        download={block.fileName || undefined}
        target={/^https?:\/\//i.test(media) ? "_blank" : undefined}
        rel="noopener noreferrer"
      >
        {block.fileName || "Ouvrir la ressource"}
      </a>
    ) : (
      <p className="media-empty">La ressource n’est pas disponible.</p>
    );
  if (type === "Banner image")
    return media ? (
      <img
        className="lesson-banner-image"
        src={media}
        alt={block.fileName || "Image de la leçon"}
      />
    ) : (
      <p className="media-empty">L’image n’est pas disponible.</p>
    );
  if (type === "Code example")
    return (
      <pre className="lesson-code">
        <code>{block.content || ""}</code>
      </pre>
    );
  if (type === "Embed media")
    return media &&
      (/\.(mp4|webm|ogg)(?:$|\?)/i.test(media) ||
        block.mimeType?.startsWith("video/")) ? (
      <video className="lesson-video" controls preload="metadata" src={media} />
    ) : media &&
      (/\.(mp3|wav|oga|m4a)(?:$|\?)/i.test(media) ||
        block.mimeType?.startsWith("audio/")) ? (
      <audio className="lesson-audio" controls preload="metadata" src={media} />
    ) : media ? (
      <a
        className="lesson-resource"
        href={media}
        target="_blank"
        rel="noopener noreferrer"
      >
        Ouvrir le média
      </a>
    ) : (
      <p className="media-empty">Le lien du média n’est pas disponible.</p>
    );
  if (type === "Open-ended")
    return (
      <form
        className="open-ended-response"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const value = new FormData(form).get("response")?.toString() || "";
          if (!value.trim()) {
            setError("Rédigez une réponse avant d’enregistrer.");
            return;
          }
          if (localResponses(block.id, value)) {
            setSaved(true);
            setError("");
          } else setError("Votre réponse n’a pas pu être enregistrée.");
        }}
      >
        <label>
          Votre réponse
          <textarea name="response" rows={5} required />
        </label>
        <button className="btn" type="submit">
          Enregistrer la réponse
        </button>
        {saved && <p role="status">Réponse enregistrée sur cet appareil.</p>}
        {error && <p role="alert">{error}</p>}
      </form>
    );
  if (["Upsell", "Referrals", "Custom code", "Zoom"].includes(type))
    return (
      <div className="integration-unavailable">
        <strong>{type}</strong>
        <p>This integration is unavailable in the local course preview.</p>
      </div>
    );
  return <p>{block.content || block.type}</p>;
}
export function ContentEditor({
  block,
  onSave,
  onCancel,
}: {
  block: Block;
  onSave: (block: Block) => void;
  onCancel: () => void;
}) {
  const rich = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState(block.content || "");
  const [mediaUrl, setMediaUrl] = useState(block.mediaUrl || "");
  const [fileName, setFileName] = useState(block.fileName || "");
  const [mimeType, setMimeType] = useState(block.mimeType || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState(block.questions || []);
  useEffect(() => {
    if (rich.current)
      rich.current.innerHTML = block.content?.startsWith("<")
        ? safeHtml(block.content)
        : "";
    if (rich.current && !block.content?.startsWith("<"))
      rich.current.textContent = block.content || "";
  }, [block.id]);
  const command = (cmd: string, value?: string) => {
    rich.current?.focus();
    document.execCommand(cmd, false, value);
  };
  const qUpdate = (
    i: number,
    fn: (q: (typeof questions)[number]) => (typeof questions)[number],
  ) => setQuestions((qs) => qs.map((q, j) => (i === j ? fn(q) : q)));
  const isImage = block.type === "Banner image";
  const upload = async (file?: File) => {
    if (!file) return;
    const max = isImage ? 3 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > max) {
      setError(`Choose a file smaller than ${isImage ? "3" : "50"} MiB.`);
      return;
    }
    if (isImage && !file.type.startsWith("image/")) {
      setError("Choisissez un fichier image.");
      return;
    }
    if (block.type === "Video" && !file.type.startsWith("video/")) {
      setError("Choisissez un fichier vidéo.");
      return;
    }
    if (block.type === "Audio" && !file.type.startsWith("audio/")) {
      setError("Choisissez un fichier audio.");
      return;
    }
    if (block.type === "PDF Viewer" && file.type !== "application/pdf") {
      setError("Choisissez un document PDF.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const response = await fetch(isImage ? "/api/uploads" : "/api/files", {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) throw new Error("Import impossible");
      const result = (await response.json()) as {
        url?: string;
        bytes?: number;
        type?: string;
      };
      if (
        !result.url ||
        !(isImage
          ? result.url.startsWith("/uploads/")
          : result.url.startsWith("/uploads/"))
      )
        throw new Error("Le lien du fichier importé n’est pas valide.");
      setMediaUrl(result.url);
      setFileName(file.name);
      setMimeType(result.type || file.type);
    } catch {
      setError(
        "L’import a échoué. Vérifiez la connexion au serveur local, puis réessayez.",
      );
    } finally {
      setUploading(false);
    }
  };
  const changeMediaUrl = (value: string) => {
    if (/^\s*(javascript|data|blob):/i.test(value)) {
      setError("Utilisez un lien http/https ou importez un fichier.");
      return;
    }
    setMediaUrl(value);
    setError("");
  };
  const validQuestions = questions.every(
    (q) =>
      q.title.trim() &&
      q.answers.filter((a) => a.trim()).length >= 2 &&
      q.correct >= 0 &&
      q.correct < q.answers.length &&
      !!q.answers[q.correct]?.trim(),
  );
  const save = () => {
    if (block.type === "Quiz" && !validQuestions) {
      setError(
        "Chaque question doit contenir un énoncé, au moins deux choix et une bonne réponse.",
      );
      return;
    }
    const next = {
      ...block,
      content:
        block.type === "Text & Images"
          ? rich.current
            ? safeHtml(rich.current.innerHTML)
            : content
          : content,
      mediaUrl: mediaUrl || undefined,
      fileName: fileName || undefined,
      mimeType: mimeType || undefined,
      questions: block.type === "Quiz" ? questions : block.questions,
    };
    onSave(next);
  };
  return (
    <div className="modal-backdrop">
      <section
        className={`modal content-dialog ${block.type === "Quiz" ? "quiz-dialog" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={contentLabel(block.type)}
      >
        <header className="modal-head">
          <h2>{contentLabel(block.type)}</h2>
          <button
            className="icon-button"
            onClick={onCancel}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">
          {block.type === "Text & Images" ? (
            <>
              <div className="rich-toolbar">
                <select
                  aria-label="Style de texte"
                  onChange={(e) => command("formatBlock", e.target.value)}
                >
                  <option value="p">Paragraphe</option>
                  <option value="h2">Titre 2</option>
                  <option value="h3">Titre 3</option>
                </select>
                {[
                  [Bold, "bold", "Bold"],
                  [Italic, "italic", "Italic"],
                  [List, "insertUnorderedList", "Liste à puces"],
                  [ListOrdered, "insertOrderedList", "Liste numérotée"],
                  [Undo, "undo", "Undo"],
                  [Redo, "redo", "Redo"],
                ].map(([Icon, cmd, label]) => {
                  const I = Icon as React.ElementType;
                  return (
                    <button
                      key={String(cmd)}
                      aria-label={String(label)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => command(String(cmd))}
                    >
                      <I size={16} />
                    </button>
                  );
                })}
              </div>
              <div
                ref={rich}
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-label="Texte de la leçon"
                aria-multiline="true"
                className="rich-canvas"
              />
            </>
          ) : block.type === "Quiz" ? (
            <>
              <p>Rédigez une question et sélectionnez la bonne réponse.</p>
              {questions.map((q, i) => (
                <div className="quiz-question" key={i}>
                  <div className="row-between">
                    <strong>
                      <GripVertical size={15} /> Question {i + 1}
                    </strong>
                    <button
                      className="icon-button"
                      aria-label={`Remove question ${i + 1}`}
                      onClick={() =>
                        setQuestions((qs) => qs.filter((_, j) => j !== i))
                      }
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <label>
                    Question
                    <input
                      value={q.title}
                      onChange={(e) =>
                        qUpdate(i, (x) => ({ ...x, title: e.target.value }))
                      }
                    />
                  </label>
                  {q.answers.map((a, j) => (
                    <label className="quiz-answer" key={j}>
                      <input
                        type="radio"
                        aria-label={`Correct answer ${j + 1}`}
                        name={`correct-${i}`}
                        checked={q.correct === j}
                        onChange={() =>
                          qUpdate(i, (x) => ({ ...x, correct: j }))
                        }
                      />
                      <input
                        aria-label={`Answer ${j + 1}`}
                        placeholder={`Answer ${j + 1}`}
                        value={a}
                        onChange={(e) =>
                          qUpdate(i, (x) => ({
                            ...x,
                            answers: x.answers.map((v, k) =>
                              k === j ? e.target.value : v,
                            ),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <button
                    className="text-link"
                    onClick={() =>
                      qUpdate(i, (x) => ({ ...x, answers: [...x.answers, ""] }))
                    }
                  >
                    + Ajouter une réponse
                  </button>
                  <label>
                    Explication (facultatif)
                    <input
                      value={q.feedback}
                      onChange={(e) =>
                        qUpdate(i, (x) => ({ ...x, feedback: e.target.value }))
                      }
                    />
                  </label>
                </div>
              ))}
              <button
                className="btn"
                onClick={() =>
                  setQuestions((qs) => [
                    ...qs,
                    { title: "", answers: ["", ""], correct: 0, feedback: "" },
                  ])
                }
              >
                <Plus size={16} />
                Nouvelle question
              </button>
              {error && (
                <p role="alert" className="media-error">
                  {error}
                </p>
              )}
            </>
          ) : block.type === "Banner image" ? (
            <>
              <label>
                Lien de l’image
                <input
                  value={mediaUrl}
                  onChange={(e) => changeMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </label>
              <label className="media-file-picker">
                Choisir une image
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => upload(e.target.files?.[0])}
                />
              </label>
              {fileName && <p className="helper">Selected: {fileName}</p>}
            </>
          ) : [
              "Video",
              "Audio",
              "PDF Viewer",
              "Resource",
              "Embed media",
            ].includes(block.type) ? (
            <>
              <label>
                {block.type === "PDF Viewer"
                  ? "Lien du PDF"
                  : block.type === "Resource"
                    ? "Lien de la ressource"
                    : block.type === "Embed media"
                      ? "Lien du média"
                      : `${contentLabel(block.type)} URL`}
                <input
                  value={mediaUrl}
                  onChange={(e) => changeMediaUrl(e.target.value)}
                  placeholder="https://example.com/file"
                />
              </label>
              <label className="media-file-picker">
                {block.type === "Video"
                  ? "Importer une vidéo"
                  : block.type === "Audio"
                    ? "Importer un audio"
                    : block.type === "PDF Viewer"
                      ? "Importer un PDF"
                      : "Importer un fichier"}
                <input
                  type="file"
                  accept={
                    block.type === "Video"
                      ? "video/*"
                      : block.type === "Audio"
                        ? "audio/*"
                        : block.type === "PDF Viewer"
                          ? ".pdf,application/pdf"
                          : "*/*"
                  }
                  disabled={uploading}
                  onChange={(e) => upload(e.target.files?.[0])}
                />
              </label>
              {uploading && <p role="status">Import en cours…</p>}
              {fileName && <p className="helper">Selected: {fileName}</p>}
            </>
          ) : block.type === "Code example" ? (
            <>
              <label>
                Code
                <textarea
                  className="code-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Coller un exemple de code"
                />
              </label>
              <p className="helper">
                Le code est affiché comme du texte et n’est pas exécuté.
              </p>
            </>
          ) : block.type === "Open-ended" ? (
            <>
              <label>
                Consigne ou question
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Sur quoi souhaitez-vous faire réfléchir l’élève ?"
                />
              </label>
              <p className="helper">
                Les réponses des élèves sont conservées dans ce navigateur.
              </p>
            </>
          ) : ["Upsell", "Referrals", "Custom code", "Zoom"].includes(
              block.type,
            ) ? (
            <div className="integration-unavailable">
              <strong>{contentLabel(block.type)}</strong>
              <p>This integration is unavailable in the local recreation.</p>
            </div>
          ) : (
            <>
              <label>
                {contentLabel(block.type)} content
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ajouter du contenu à la leçon"
                />
              </label>
            </>
          )}
          {error && block.type !== "Quiz" && (
            <p role="alert" className="media-error">
              {error}
            </p>
          )}
        </div>
        <footer className="modal-actions">
          <button className="btn" onClick={onCancel}>
            Annuler
          </button>
          <button className="btn primary" disabled={uploading} onClick={save}>
            Enregistrer
          </button>
        </footer>
      </section>
    </div>
  );
}
