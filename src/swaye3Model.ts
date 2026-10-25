export type MemberStatus =
  | "unlinked"
  | "active"
  | "requested"
  | "rejected"
  | "suspended";
export type Student = {
  id: string;
  name: string;
  email: string;
  created: string;
  phone?: string;
  level?: string;
  course?: string;
  courseId?: string;
};
export type Membership = {
  status: MemberStatus;
  requestedAt?: string;
  respondedAt?: string;
};
export type Access = {
  studentId: string;
  courseId: string;
  status: "active" | "pending" | "suspended" | "cancelled";
  authorizedAt?: string;
  expiresAt?: string;
};
export type Payment = {
  id: string;
  studentId: string;
  amount: number;
  date: string;
  reference: string;
  method?: string;
  courseId?: string;
  voided?: boolean;
};
export type Teacher = {
  id: string;
  name: string;
  subject: string;
  email?: string;
  status?: "active" | "suspended";
};
export type Question = {
  id: string;
  studentId: string;
  courseId: string;
  lessonId?: string;
  body: string;
  createdAt: string;
  replies: { id: string; body: string; createdAt: string; author: string }[];
};
export type Activity = {
  id: string;
  at: string;
  label: string;
  kind: "student" | "course" | "payment" | "access" | "question" | "settings";
};
export type Profile = {
  name: string;
  city: string;
  address: string;
  email: string;
  phone: string;
  contact: string;
  bio: string;
};
export const keys = {
  students: "teachable-recreation-students-v1",
  registry: "teachable-swaye3-student-registry-v1",
  codes: "teachable-swaye3-student-codes-v1",
  memberships: "teachable-swaye3-memberships-v1",
  access: "teachable-swaye3-access-records-v1",
  enrollments: "teachable-enrollments-v2",
  payments: "teachable-swaye3-payments-v1",
  team: "teachable-swaye3-team-v1",
  profile: "teachable-swaye3-profile-v1",
  activity: "teachable-swaye3-activity-v1",
  questions: "teachable-swaye3-questions-v1",
  meta: "teachable-swaye3-course-meta-v1",
};
export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("swaye3-change"));
}
export function studentId(s: {
  id?: string;
  studentId?: string;
  userId?: string;
  email?: string;
}) {
  return s.id || s.studentId || s.userId || s.email || "";
}
export function normalizeStudents(raw: unknown): Student[] {
  const list = Array.isArray(raw)
    ? raw
    : raw &&
        typeof raw === "object" &&
        Array.isArray((raw as { students?: unknown }).students)
      ? (raw as { students: unknown[] }).students
      : [];
  return list
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      ...x,
      id: studentId(x),
      name: x.name || x.email || "Élève",
      email: x.email || "",
      created: x.created || "",
    }))
    .filter((x) => x.id);
}
export function accessKey(studentId: string, courseId: string) {
  return studentId + "::" + courseId;
}
export function accessState(
  a: Access,
  now = new Date(),
): Access["status"] | "expired" {
  return a.status === "active" &&
    a.expiresAt &&
    new Date(a.expiresAt + "T23:59:59") < now
    ? "expired"
    : a.status;
}
export function accessRecords(
  raw: Record<string, Access>,
  enrollments: Record<string, string[]>,
): Access[] {
  const next = { ...raw };
  for (const [sid, ids] of Object.entries(enrollments)) {
    if (!Array.isArray(ids)) continue;
    for (const cid of ids) {
      const key = accessKey(sid, cid);
      if (!next[key])
        next[key] = { studentId: sid, courseId: cid, status: "active" };
    }
  }
  return Object.values(next);
}
export function updatedEnrollment(
  map: Record<string, string[]>,
  a: Access,
): Record<string, string[]> {
  const ids = Array.isArray(map[a.studentId]) ? map[a.studentId] : [];
  return {
    ...map,
    [a.studentId]:
      accessState(a) === "active"
        ? [...new Set([...ids, a.courseId])]
        : ids.filter((id) => id !== a.courseId),
  };
}
export function addMonths(date: string, months: number) {
  const base = new Date(date + "T12:00:00");
  const day = base.getDate();
  base.setDate(1);
  base.setMonth(base.getMonth() + months);
  const last = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  base.setDate(Math.min(day, last));
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function dateLabel(value?: string) {
  if (!value) return "Sans échéance";
  const date = new Date(value.length === 10 ? value + "T12:00:00" : value);
  return Number.isNaN(+date)
    ? value
    : new Intl.DateTimeFormat("fr-MA", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Casablanca",
      }).format(date);
}
export function recordActivity(label: string, kind: Activity["kind"]) {
  const activity = read<Activity[]>(keys.activity, []);
  write(
    keys.activity,
    [
      { id: crypto.randomUUID(), at: new Date().toISOString(), label, kind },
      ...activity,
    ].slice(0, 100),
  );
}
export function saveAccess(a: Access) {
  const raw = read<Record<string, Access>>(keys.access, {});
  write(keys.access, { ...raw, [accessKey(a.studentId, a.courseId)]: a });
  write(keys.enrollments, updatedEnrollment(read(keys.enrollments, {}), a));
}
export function hasAccess(studentId: string, courseId: string) {
  const map = read<Record<string, string[]>>(keys.enrollments, {});
  const raw = read<Record<string, Access>>(keys.access, {});
  const a = raw[accessKey(studentId, courseId)];
  return a
    ? accessState(a) === "active"
    : (map[studentId] || []).includes(courseId);
}
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const body =
    "\uFEFF" +
    rows
      .map((row) =>
        row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(";"),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([body], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Old center records retain their prior attachment; new app accounts never inherit one. */
export function membershipFor(
  id: string,
  legacyIds: Set<string>,
  memberships: Record<string, Membership>,
): Membership {
  return (
    memberships[id] || { status: legacyIds.has(id) ? "active" : "unlinked" }
  );
}
export function belongsToCenter(member: Membership) {
  return ["active", "requested", "suspended"].includes(member.status);
}
export function findStudentByCode(
  students: Student[],
  codes: Record<string, string>,
  value: string,
) {
  const code = value.trim().toUpperCase();
  if (!/^UST-[A-Z0-9]{5,10}$/.test(code)) return undefined;
  return students.find((s) => codes[s.id] === code);
}

export function centerProfile(student: Student, member: Membership): Student {
  if (["active", "suspended"].includes(member.status)) return student;
  return {
    id: student.id,
    name: student.name,
    email: "",
    created: student.created,
  };
}
