"use client";

import { teacherAvatarSrc, isFemaleTeacherName } from "@/lib/teacher-gender";
import { cn } from "@/lib/utils";

export function TeacherAvatar({
  nameAr,
  gender,
  size = 54,
  className,
}: {
  nameAr: string;
  gender?: string | null;
  size?: number;
  className?: string;
}) {
  const female = isFemaleTeacherName(nameAr, gender);
  return (
    <span
      className={cn("relative shrink-0 overflow-hidden rounded-full", className)}
      style={{ width: size, height: size, background: "#fff" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={teacherAvatarSrc(nameAr, gender)}
        alt={female ? "المدرسة" : "المدرس"}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "contain",
          background: "#fff",
        }}
      />
    </span>
  );
}
