import assert from "node:assert/strict";
import test from "node:test";
import { parseTeacherWrite } from "./teacher-records";

const base = {
  displayNameAr: "أ. سارة",
  username: "sara",
  password: "secret1",
};

test("parse keeps a different subject on each grade container", () => {
  const parsed = parseTeacherWrite(
    {
      ...base,
      gradeSections: [
        { gradeId: "m1", sectionIds: ["a", "b"], subjectIds: ["math"] },
        { gradeId: "s4", sectionIds: ["c"], subjectIds: ["phy"] },
      ],
    },
    { passwordRequired: true }
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.value.gradeSections, [
    { gradeId: "m1", sectionIds: ["a", "b"], subjectIds: ["math"] },
    { gradeId: "s4", sectionIds: ["c"], subjectIds: ["phy"] },
  ]);
});

test("parse rejects a repeated grade instead of merging subjects", () => {
  const parsed = parseTeacherWrite(
    {
      ...base,
      gradeSections: [
        { gradeId: "m1", sectionIds: ["a"], subjectIds: ["math"] },
        { gradeId: "m1", sectionIds: ["b"], subjectIds: ["phy"] },
      ],
    },
    { passwordRequired: true }
  );
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.error, "لا يمكن تكرار المرحلة.");
});

test("parse requires a subject inside every grade container", () => {
  const parsed = parseTeacherWrite(
    {
      ...base,
      gradeSections: [{ gradeId: "m1", sectionIds: ["a"], subjectIds: [] }],
    },
    { passwordRequired: true }
  );
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.error, "أضف مادة واحدة على الأقل لكل مرحلة.");
});

test("legacy global subjectIds still apply to every grade", () => {
  const parsed = parseTeacherWrite(
    {
      ...base,
      gradeIds: ["m1", "m2"],
      sectionIds: ["a"],
      subjectIds: ["math"],
    },
    { passwordRequired: true }
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.value.gradeSections, [
    { gradeId: "m1", sectionIds: ["a"], subjectIds: ["math"] },
    { gradeId: "m2", sectionIds: ["a"], subjectIds: ["math"] },
  ]);
});
