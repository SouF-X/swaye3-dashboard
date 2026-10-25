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
