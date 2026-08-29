"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  id,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
  className?: string;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        dir="rtl"
        className={cn("field-input rtl-field w-full pe-12", className)}
        type={shown ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="absolute top-1/2 left-1 flex size-10 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
        onClick={() => setShown((current) => !current)}
        aria-label={shown ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
      >
        {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
