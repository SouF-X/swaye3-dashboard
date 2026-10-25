import { useEffect, useState } from "react";
import {
  accessRecords,
  keys,
  normalizeStudents,
  membershipFor,
  belongsToCenter,
  centerProfile,
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
  const legacyStudents = normalizeStudents(read(keys.students, []));
  const legacyIds = new Set(legacyStudents.map((s) => s.id));
  const registry = normalizeStudents(read(keys.registry, []));
  const students = [
    ...legacyStudents,
    ...registry.filter((s) => !legacyIds.has(s.id)),
  ];
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
    centerStudents: students
      .filter((s) =>
        belongsToCenter(membershipFor(s.id, legacyIds, memberships)),
      )
      .map((s) =>
        centerProfile(s, membershipFor(s.id, legacyIds, memberships)),
      ),
    codes,
    memberships,
    member: (id: string): Membership =>
      membershipFor(id, legacyIds, memberships),
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
