import { useEffect, useState } from "react";
import { Download, QrCode, Copy } from "lucide-react";
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
