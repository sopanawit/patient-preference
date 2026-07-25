import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

/**
 * ช่องกรอกแบบ tag — พิมพ์แล้วกด Enter (หรือ ",") เพื่อเพิ่มเป็น tag
 * มี autocomplete จากคำที่เคยพิมพ์ (suggestions) ; ลบ tag ด้วยปุ่ม × หรือ Backspace
 *
 * ค่าเก็บเป็น string เดียว คั่นด้วย "\n" เพื่อให้เข้ากันได้กับ likes_text/dislikes_text เดิม
 * (data layer แยกรายการด้วย /[\n,]/ อยู่แล้ว)
 *
 * หมายเหตุมือถือ/Android: soft keyboard หลายตัว (Samsung, Gboard) ระหว่าง compose คำ
 * จะยิง keydown ด้วย key "Unidentified"/keyCode 229 ไม่ใช่ "Enter" ทำให้ดักด้วย e.key
 * อย่างเดียวไม่พอ — จึงดักเจตนาขึ้นบรรทัดใหม่ผ่าน native `beforeinput`
 * (inputType === "insertLineBreak") และดักตัวคั่นคอมมาใน onChange เพิ่ม
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

  // เพิ่มหลาย tag พร้อมกัน (กันซ้ำ case-insensitive) — ไม่ยุ่งกับ draft/open
  function commitTags(raws: string[]) {
    const existing = new Set(tags.map((t) => t.toLowerCase()));
    const fresh: string[] = [];
    for (const raw of raws) {
      const tag = raw.trim();
      if (!tag || existing.has(tag.toLowerCase())) continue;
      existing.add(tag.toLowerCase());
      fresh.push(tag);
    }
    if (!fresh.length) return;
    onChange(tagsToText([...tags, ...fresh]));
    fresh.forEach((t) => onAddTag?.(t));
  }

  function addTag(raw: string) {
    commitTags([raw]);
    setDraft("");
    setOpen(false);
  }

  // ยืนยัน draft ปัจจุบันเป็น tag ; preferMatch = true จะเลือกตัวเลือกใน dropdown ที่ active อยู่
  function commitDraft(preferMatch: boolean) {
    if (!draft.trim()) return;
    if (preferMatch && open && matches[activeIdx]) addTag(matches[activeIdx]);
    else addTag(draft);
  }

  function removeAt(idx: number) {
    onChange(tagsToText(tags.filter((_, i) => i !== idx)));
  }

  // ดัก Enter จาก soft keyboard (Android) ที่ไม่ยิง keydown key === "Enter"
  // ผ่าน native beforeinput ; ใช้ ref ชี้ closure ล่าสุดเพื่อผูก listener ครั้งเดียว
  const commitRef = useRef<() => void>(() => {});
  commitRef.current = () => commitDraft(true);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const inputType = (e as InputEvent).inputType;
      if (inputType === "insertLineBreak" || inputType === "insertParagraph") {
        e.preventDefault();
        commitRef.current();
      }
    };
    el.addEventListener("beforeinput", handler);
    return () => el.removeEventListener("beforeinput", handler);
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // ระหว่าง IME compose (มือถือ/ภาษาที่ต้อง compose) key อาจเป็น "Unidentified"/keyCode 229
    // → ปล่อยให้ beforeinput (Enter) และ onChange (คอมมา) เป็นตัวจัดการแทน
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;

    if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
      e.preventDefault();
      commitDraft(e.key === "Enter");
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
          enterKeyHint="done"
          onChange={(e) => {
            const val = e.target.value;
            // ถ้ามีตัวคั่น (คอมมา/ขึ้นบรรทัด) โผล่ในค่า → ตัดเป็น tag ทันที
            // รองรับ IME/มือถือที่ไม่ยิง keydown "Enter" และการวางข้อความหลายรายการ
            if (/[\n,]/.test(val)) {
              const parts = val.split(/[\n,]/);
              const last = parts.pop() ?? "";
              commitTags(parts);
              setDraft(last);
              setOpen(true);
              return;
            }
            setDraft(val);
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
