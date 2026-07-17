import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

/**
 * ช่องกรอกแบบ tag — พิมพ์แล้วกด Enter (หรือ ",") เพื่อเพิ่มเป็น tag
 * มี autocomplete จากคำที่เคยพิมพ์ (suggestions) ; ลบ tag ด้วยปุ่ม × หรือ Backspace
 *
 * ค่าเก็บเป็น string เดียว คั่นด้วย "\n" เพื่อให้เข้ากันได้กับ likes_text/dislikes_text เดิม
 * (data layer แยกรายการด้วย /[\n,]/ อยู่แล้ว)
 */

export function textToTags(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function tagsToText(tags: string[]): string {
  return tags.join("\n");
}

export function TagInput({
  value,
  onChange,
  suggestions = [],
  onAddTag,
  placeholder,
  className = "",
}: {
  /** ค่าปัจจุบัน (string คั่นด้วย \n) */
  value: string;
  /** คืนค่าใหม่ (string คั่นด้วย \n) */
  onChange: (next: string) => void;
  /** คลังคำสำหรับ autocomplete (คำที่เคยพิมพ์) */
  suggestions?: string[];
  /** เรียกเมื่อมี tag ถูกเพิ่ม — ใช้บันทึกเข้าคลังคำ */
  onAddTag?: (tag: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const tags = useMemo(() => textToTags(value), [value]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // คำแนะนำ: จับคู่ substring (case-insensitive) ตัดคำที่เป็น tag แล้วออก
  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase();
    const chosen = new Set(tags.map((t) => t.toLowerCase()));
    return suggestions
      .filter((s) => !chosen.has(s.toLowerCase()))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [draft, suggestions, tags]);

  useEffect(() => setActiveIdx(0), [draft, open]);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange(tagsToText([...tags, tag]));
    onAddTag?.(tag);
    setDraft("");
    setOpen(false);
  }

  function removeAt(idx: number) {
    onChange(tagsToText(tags.filter((_, i) => i !== idx)));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
      e.preventDefault();
      if (open && matches[activeIdx] && e.key === "Enter") {
        addTag(matches[activeIdx]);
      } else {
        addTag(draft);
      }
      return;
    }
    if (e.key === "Backspace" && !draft && tags.length) {
      e.preventDefault();
      removeAt(tags.length - 1);
      return;
    }
    if (open && matches.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % matches.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + matches.length) % matches.length);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className="mt-1 flex min-h-[2.5rem] flex-wrap items-center gap-1.5 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-brand-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-brand-800"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeAt(i);
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full text-brand-600 hover:bg-brand-200 hover:text-brand-900"
              aria-label={`ลบ ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 outline-none placeholder:text-slate-400"
        />
      </div>

      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {matches.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                // ใช้ onMouseDown กันไม่ให้ blur ปิด dropdown ก่อนคลิกทำงาน
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(s);
                }}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  i === activeIdx
                    ? "bg-brand-50 text-brand-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
