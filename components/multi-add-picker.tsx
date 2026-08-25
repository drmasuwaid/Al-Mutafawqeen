"use client";

import { NativeSelect } from "@/components/native-select";
import { toast } from "sonner";

export type PickerOption = { id: string; nameAr: string };

export function MultiAddPicker({
  label,
  placeholder,
  options,
  selected,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: PickerOption[];
  selected: PickerOption[];
  onChange: (next: PickerOption[]) => void;
}) {
  const available = options.filter((item) => !selected.some((row) => row.id === item.id));

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const select = form.elements.namedItem("picker") as HTMLSelectElement | null;
    const id = select?.value ?? "";
    if (!id) {
      toast.error("اختر عنصراً من القائمة أولاً.");
      return;
    }
    const option = options.find((item) => item.id === id);
    if (!option) return;
    if (selected.some((item) => item.id === option.id)) {
      toast.error("هذا العنصر مضاف مسبقاً.");
      return;
    }
    onChange([...selected, option]);
    if (select) select.value = "";
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <form className="flex items-stretch gap-2" onSubmit={add}>
        <div className="min-w-0 flex-1">
          <NativeSelect name="picker" defaultValue="" key={selected.map((item) => item.id).join("|")}>
            <option value="">{placeholder}</option>
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nameAr}
              </option>
            ))}
          </NativeSelect>
        </div>
        <button
          type="submit"
          className="h-12 shrink-0 rounded-xl bg-[#3b82f6] px-4 text-sm font-bold text-white hover:bg-[#2563eb]"
        >
          إضافة
        </button>
      </form>
      <div className="min-h-[3.5rem] rounded-xl border border-slate-200 bg-slate-50 p-2">
        {selected.length === 0 ? (
          <p className="px-2 py-2 text-sm text-slate-400">لم يُضف شيء بعد. اختر من القائمة ثم اضغط «إضافة».</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-800 ring-1 ring-blue-200"
              >
                {item.nameAr}
                <button
                  type="button"
                  className="flex size-5 items-center justify-center rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-800"
                  aria-label={`حذف ${item.nameAr}`}
                  onClick={() => onChange(selected.filter((row) => row.id !== item.id))}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
