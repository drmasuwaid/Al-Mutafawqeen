import assert from "node:assert/strict";
import test from "node:test";
import { inferTeacherGender, teacherAvatarSrc, teacherGreetingAr } from "./teacher-gender";

test("Nour is treated as a female teacher", () => {
  for (const name of ["نور", "نور خالد", "أ. نور", "نورة عبد القادر", "نورا"]) {
    assert.equal(inferTeacherGender(name), "female", name);
    assert.equal(teacherGreetingAr(name), "أهلاً بكِ، أستاذة", name);
    assert.equal(teacherAvatarSrc(name), "/teacher-avatar-female.png", name);
  }
});

test("a typical male name still uses the male greeting and photo", () => {
  assert.equal(inferTeacherGender("أحمد العراقي"), "male");
  assert.equal(teacherGreetingAr("أحمد العراقي"), "أهلاً بك، أستاذ");
  assert.equal(teacherAvatarSrc("أحمد العراقي"), "/teacher-avatar.png");
});
