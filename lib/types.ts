export type Role = "admin" | "teacher" | "student";

export type HomeworkStatus = "draft" | "published";

export type CompletionStatus = "pending" | "done";

export type DueBucket = "overdue" | "today" | "soon" | "upcoming";

export type SubjectGrade = {
  id: string;
  gradeId: string;
  sectionId: string;
  subjectId: string;
  subjectNameAr: string;
};

export type Profile = {
  uid: string;
  teacherId?: string;
  email: string;
  username?: string;
  displayName: string;
  displayNameAr: string;
  role: Role;
  classId?: string;
  classIds?: string[];
  subjectIds?: string[];
  subjectsGrades?: SubjectGrade[];
};

export type SchoolClass = {
  id: string;
  name: string;
  nameAr: string;
  grade: number;
  section: string;
};

export type Subject = {
  id: string;
  name: string;
  nameAr: string;
  color: string;
};

export type Completion = {
  studentId: string;
  studentName: string;
  studentNameAr: string;
  status: CompletionStatus;
  completedAt: string | null;
  note: string;
};

export type Attachment = {
  name: string;
  type: string;
  size: number;
  storagePath?: string;
  dataUrl?: string;
};

export type Homework = {
  id: string;
  title: string;
  titleAr: string;
  details: string;
  detailsAr: string;
  subjectId: string;
  classId: string;
  classIds: string[];
  createdBy: string;
  teacherId: string;
  teacherName: string;
  teacherNameAr: string;
  dueAt: string | null;
  status: HomeworkStatus;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  completions: Completion[];
};

export type LiveSnapshot = {
  homework: Homework[];
  classes: SchoolClass[];
  subjects: Subject[];
  students: Profile[];
  serverTime: string;
};
