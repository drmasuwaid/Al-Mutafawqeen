import assert from "node:assert/strict";
import test from "node:test";
import {
  assignmentsFromGradeSections,
  assignmentsFromSelections,
  pickerGradeSectionsFromAssignments,
  teacherCanPublishAssignment,
  teacherMatchesStaffFilters,
} from "./teachers";

const math = { id: "math", nameAr: "الرياضيات" };
const physics = { id: "phy", nameAr: "الفيزياء" };
const arabic = { id: "ar", nameAr: "اللغة العربية" };

test("per-grade subjects stay inside their own grade loop", () => {
  const rows = assignmentsFromGradeSections(
    [
      { gradeId: "m1", sectionIds: ["a", "b"], subjectIds: ["math"] },
      { gradeId: "s4", sectionIds: ["c"], subjectIds: ["phy"] },
    ],
    [math, physics, arabic]
  );

  assert.deepEqual(
    rows.map((row) => `${row.gradeId}-${row.sectionId}-${row.subjectId}`).sort(),
    ["m1-a-math", "m1-b-math", "s4-c-phy"]
  );
  assert.equal(
    rows.some((row) => row.gradeId === "m1" && row.subjectId === "phy"),
    false
  );
  assert.equal(
    rows.some((row) => row.gradeId === "s4" && row.subjectId === "math"),
    false
  );
});

test("legacy global subjects still cartesian across selected grades", () => {
  const rows = assignmentsFromSelections(["m1", "m2"], ["a"], [math, arabic]);
  assert.deepEqual(
    rows.map((row) => `${row.gradeId}-${row.sectionId}-${row.subjectId}`).sort(),
    ["m1-a-ar", "m1-a-math", "m2-a-ar", "m2-a-math"]
  );
});

test("duplicate grade-section-subject rows collapse instead of conflicting", () => {
  const rows = assignmentsFromGradeSections(
    [
      { gradeId: "m1", sectionIds: ["a", "a"], subjectIds: ["math", "math"] },
      { gradeId: "m1", sectionIds: ["a"], subjectIds: ["math"] },
    ],
    [math]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "m1-a-math");
});

test("hydration round-trips sections and subjects per grade", () => {
  const saved = assignmentsFromGradeSections(
    [
      { gradeId: "m1", sectionIds: ["a", "b"], subjectIds: ["math"] },
      { gradeId: "s5", sectionIds: ["d"], subjectIds: ["phy", "ar"] },
    ],
    [math, physics, arabic]
  );
  const picked = pickerGradeSectionsFromAssignments(saved);
  assert.deepEqual(
    picked.grades.map((grade) => ({
      id: grade.id,
      sections: grade.sections.map((item) => item.id),
      subjects: grade.subjects.map((item) => item.id),
    })),
    [
      { id: "m1", sections: ["a", "b"], subjects: ["math"] },
      { id: "s5", sections: ["d"], subjects: ["phy", "ar"] },
    ]
  );

  const again = assignmentsFromGradeSections(
    picked.grades.map((grade) => ({
      gradeId: grade.id,
      sectionIds: grade.sections.map((item) => item.id),
      subjectIds: grade.subjects.map((item) => item.id),
    })),
    [math, physics, arabic]
  );
  assert.deepEqual(
    again.map((row) => row.id).sort(),
    saved.map((row) => row.id).sort()
  );
});

test("teacher cannot publish a subject into another grade's sections", () => {
  const user = {
    role: "teacher" as const,
    subjectsGrades: assignmentsFromGradeSections(
      [
        { gradeId: "m1", sectionIds: ["a"], subjectIds: ["math"] },
        { gradeId: "s4", sectionIds: ["b"], subjectIds: ["phy"] },
      ],
      [math, physics]
    ),
  };
  assert.equal(teacherCanPublishAssignment(user, ["m1-a"], "math"), true);
  assert.equal(teacherCanPublishAssignment(user, ["m1-a"], "phy"), false);
  assert.equal(teacherCanPublishAssignment(user, ["s4-b"], "math"), false);
  assert.equal(teacherCanPublishAssignment({ role: "admin" }, ["m1-a"], "phy"), true);
});

test("staff filters match grade and subject on the same assignment", () => {
  const teacher = {
    subjectsGrades: assignmentsFromGradeSections(
      [
        { gradeId: "m1", sectionIds: ["e"], subjectIds: ["ar"] },
        { gradeId: "m2", sectionIds: ["a"], subjectIds: ["math"] },
      ],
      [math, arabic]
    ),
  };
  assert.equal(teacherMatchesStaffFilters(teacher, {}), true);
  assert.equal(teacherMatchesStaffFilters(teacher, { gradeId: "m1" }), true);
  assert.equal(teacherMatchesStaffFilters(teacher, { gradeId: "s4" }), false);
  assert.equal(teacherMatchesStaffFilters(teacher, { subjectId: "math" }), true);
  assert.equal(teacherMatchesStaffFilters(teacher, { subjectId: "phy" }), false);
  assert.equal(teacherMatchesStaffFilters(teacher, { gradeId: "m1", subjectId: "ar" }), true);
  assert.equal(teacherMatchesStaffFilters(teacher, { gradeId: "m1", subjectId: "math" }), false);
});
