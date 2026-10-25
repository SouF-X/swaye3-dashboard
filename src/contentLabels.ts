export const contentLabels: Record<string, string> = {
  "Text & Images": "Texte et images",
  Video: "Vidéo",
  "PDF Viewer": "Document PDF",
  Audio: "Audio",
  "Banner image": "Image",
  Resource: "Ressource",
  "Code example": "Exemple de code",
  "Embed media": "Média intégré",
  Quiz: "Quiz",
  "Open-ended": "Réponse libre",
};
export const contentLabel = (type: string) => contentLabels[type] || type;
