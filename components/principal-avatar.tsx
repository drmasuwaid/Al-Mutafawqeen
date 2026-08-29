import { cn } from "@/lib/utils";

export const PRINCIPAL_AVATAR_SRC = "/principal-avatar.png";

export function PrincipalAvatar({
  size = 72,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("relative shrink-0 overflow-hidden rounded-2xl bg-white", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PRINCIPAL_AVATAR_SRC}
        alt="مدير المدرسة"
        width={size}
        height={size}
        className="size-full object-contain"
      />
    </span>
  );
}
