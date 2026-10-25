import { useEffect, useState } from "react";
import {
  accessRecords,
  keys,
  normalizeStudents,
  read,
  write,
  type Membership,
  type Access,
  type Payment,
  type Teacher,
  type Profile,
  type Question,
  type Activity,
} from "./swaye3Model";
export function useWorkspace() {
  const [, refresh] = useState(0);
  useEffect(() => {
    const onChange = () => refresh((x) => x + 1);
    window.addEventListener("swaye3-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("swaye3-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  const students = normalizeStudents(read(keys.students, []));
  const codes = read<Record<string, string>>(keys.codes, {});
  useEffect(() => {
    const next = { ...read<Record<string, string>>(keys.codes, {}) };
    let dirty = false;
    students.forEach((s) => {
      if (!next[s.id]) {
        let code;
        do {
          code =
            "UST-" +
            crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
        } while (Object.values(next).includes(code));
        next[s.id] = code;
        dirty = true;
      }
    });
    if (dirty) write(keys.codes, next);
  }, [students.map((s) => s.id).join("|")]);
  const memberships = read<Record<string, Membership>>(keys.memberships, {});
  const enrollments = read<Record<string, string[]>>(keys.enrollments, {});
  const access = accessRecords(
    read<Record<string, Access>>(keys.access, {}),
    enrollments,
  );
  const legacy = read<{ school?: string }>(
    "teachable-recreation-settings-v1",
    {},
  );
  const profile = read<Profile>(keys.profile, {
    name: legacy.school || "Oustadi Plus",
    city: "",
    address: "",
    email: "",
    phone: "",
    contact: "",
    bio: "",
  });
  return {
    students,
    codes,
    memberships,
    member: (id: string): Membership => memberships[id] || { status: "active" },
    access,
    enrollments,
    profile,
    payments: read<Payment[]>(keys.payments, []),
    team: read<Teacher[]>(keys.team, []),
    questions: read<Question[]>(keys.questions, []),
    activity: read<Activity[]>(keys.activity, []),
    meta: read<
      Record<string, { subject?: string; level?: string; teacherId?: string }>
    >(keys.meta, {}),
  };
}
export type Workspace = ReturnType<typeof useWorkspace>;
