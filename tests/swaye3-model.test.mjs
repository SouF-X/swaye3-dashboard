
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
const source = await readFile(
  new URL("../src/swaye3Model.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  Date,
  Intl,
  Set,
  Object,
  Array,
  String,
  Number,
  JSON,
  localStorage: { getItem: () => null },
});
const model = exports;
test("legacy learners and IDs survive normalization", () => {
  const rows = model.normalizeStudents([
    { name: "Alex", email: "alex@example.test", created: "old" },
  ]);
  assert.equal(rows[0].id, "alex@example.test");
  assert.equal(rows[0].created, "old");
  assert.equal(
    model.normalizeStudents({
      students: [{ id: "stable", name: "Student" }],
    })[0].id,
    "stable",
  );
});
test("calendar renewals clamp month-end rather than skipping a month", () => {
  assert.equal(model.addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(model.addMonths("2028-01-31", 1), "2028-02-29");
});
test("expired and suspended grants never remain in learner enrollment map", () => {
  const map = { s: ["a", "b"] };
  const expired = {
    studentId: "s",
    courseId: "a",
    status: "active",
    expiresAt: "2000-01-01",
  };
  assert.equal(model.accessState(expired), "expired");
  assert.deepEqual(
    JSON.parse(JSON.stringify(model.updatedEnrollment(map, expired))),
    { s: ["b"] },
  );
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        model.updatedEnrollment(map, {
          ...expired,
          status: "suspended",
          expiresAt: undefined,
        }),
      ),
    ),
    { s: ["b"] },
  );
});
test("legacy unlimited grants migrate without inventing dates or duplicates", () => {
  const records = model.accessRecords({}, { s: ["a", "a"] });
  assert.equal(records.length, 1);
  assert.equal(records[0].expiresAt, undefined);
  assert.equal(records[0].status, "active");
});
test("reactivation deduplicates enrollments and preserves other students", () => {
  const next = model.updatedEnrollment(
    { s: ["a"], other: ["b"] },
    { studentId: "s", courseId: "a", status: "active" },
  );
  assert.equal(next.s.length, 1);
  assert.equal(next.other[0], "b");
});
test("explicit access metadata wins over a legacy enrollment entry", () => {
  const records = model.accessRecords(
    { "s::a": { studentId: "s", courseId: "a", status: "suspended" } },
    { s: ["a"] },
  );
  assert.equal(records[0].status, "suspended");
});
test("new app profiles never inherit an active center membership", () => {
  assert.equal(
    model.membershipFor("app", new Set(["old"]), {}).status,
    "unlinked",
  );
  assert.equal(
    model.membershipFor("old", new Set(["old"]), {}).status,
    "active",
  );
  assert.equal(
    model.membershipFor("app", new Set(), { app: { status: "requested" } })
      .status,
    "requested",
  );
});
test("unattached and refused app accounts do not belong to the center roster", () => {
  for (const status of ["unlinked", "rejected"])
    assert.equal(model.belongsToCenter({ status }), false);
  for (const status of ["active", "requested", "suspended"])
    assert.equal(model.belongsToCenter({ status }), true);
});
test("staff lookup only resolves an exact shared student code, never name or email", () => {
  const students = [
      { id: "s", name: "Student", email: "student@example.test" },
    ],
    codes = { s: "UST-ABC123DEF0" };
  assert.equal(
    model.findStudentByCode(students, codes, " ust-abc123def0 ").id,
    "s",
  );
  for (const value of [
    "Student",
    "student@example.test",
    "UST-ABC123",
    "ABC123DEF0",
  ])
    assert.equal(model.findStudentByCode(students, codes, value), undefined);
});

test("unaccepted center profiles redact student-owned contact and school fields", () => {
  const student = {
    id: "s",
    name: "Student",
    email: "private@example.test",
    phone: "0600000000",
    level: "2ème Bac",
    created: "2026-10-25",
  };
  const pending = model.centerProfile(student, { status: "requested" });
  assert.equal(pending.email, "");
  assert.equal(pending.phone, undefined);
  assert.equal(pending.level, undefined);
  assert.equal(pending.name, "Student");
  assert.equal(
    model.centerProfile(student, { status: "active" }).email,
    student.email,
  );
});
