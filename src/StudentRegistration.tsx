import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, UserRound } from "lucide-react";
import {
  registerStudentProfile,
  keys,
  read,
  type Student,
} from "./swaye3Model";
import { StudentCard } from "./StudentIdentityCard";
import "./student-registration.css";
export function StudentRegistration({
  onComplete,
  onClose,
}: {
  onComplete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
      name: "",
      email: "",
      phone: "",
      level: "",
    }),
    [student, setStudent] = useState<Student | null>(null),
    [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      setStudent(registerStudentProfile(form));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Votre profil n’a pas pu être enregistré. Réessayez.",
      );
    }
  };
  return (
    <div className="student-registration">
      <header>
        <img src="/swaye3/logo-fr.svg" alt="Oustadi Plus" />
        <button type="button" className="sw-text-button" onClick={onClose}>
          <ArrowLeft size={15} />
          Retour à l’app
        </button>
      </header>
      <main>
        {student ? (
          <>
            <span className="student-registration-icon">
              <Check size={26} />
            </span>
            <h1>Votre carte élève est prête</h1>
            <p>
              Présentez cet identifiant ou ce QR à l’accueil de votre centre. Il
              lui permettra de préparer votre rattachement.
            </p>
            <StudentCard
              name={student.name}
              code={read<Record<string, string>>(keys.codes, {})[student.id]}
              center="Oustadi Plus"
            />
            <div className="student-registration-note">
              Le centre ne crée pas votre profil. Vous accepterez sa demande de
              rattachement dans votre espace avant de recevoir un accès à ses
              cours.
            </div>
            <button
              className="sw-primary"
              onClick={() => onComplete(student.id)}
            >
              Accéder à mon espace
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <span className="student-registration-icon">
              <UserRound size={26} />
            </span>
            <h1>Créer mon profil élève</h1>
            <p>
              Inscrivez-vous dans l’app, puis partagez votre carte avec le
              centre de votre choix.
            </p>
            <form className="sw-form-stack" onSubmit={submit}>
              <label>
                Mon nom complet
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nom et prénom"
                />
              </label>
              <label>
                Mon adresse email
                <input
                  required
                  type="email"
                  maxLength={180}
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="monadresse@exemple.ma"
                />
              </label>
              <div className="sw-field-pair">
                <label>
                  Mon téléphone <small>Facultatif</small>
                  <input
                    type="tel"
                    maxLength={30}
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  Mon niveau scolaire
                  <select
                    value={form.level}
                    onChange={(e) =>
                      setForm({ ...form, level: e.target.value })
                    }
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
              {error && (
                <p role="alert" className="sw-form-error">
                  {error}
                </p>
              )}
              <button className="sw-primary">
                Créer mon profil et ma carte
                <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}
        <footer>
          App de démonstration locale. La connexion sécurisée et la vérification
          des comptes nécessitent le service de production.
        </footer>
      </main>
    </div>
  );
}
