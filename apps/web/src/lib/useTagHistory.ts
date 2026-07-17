import { useCallback, useState } from "react";

/**
 * เก็บ "คำที่เคยพิมพ์" ไว้ใน localStorage เพื่อใช้เป็น autocomplete ของ TagInput
 * แยก key ตามชนิดช่อง (เช่น like / dislike) — ทำงานได้กับทั้ง backend mock และ supabase
 */
const PREFIX = "pref-tag-history:";
const MAX = 200;

function load(key: string): string[] {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function useTagHistory(key: string) {
  const [history, setHistory] = useState<string[]>(() => load(key));

  const remember = useCallback(
    (tags: string | string[]) => {
      const incoming = (Array.isArray(tags) ? tags : [tags])
        .map((t) => t.trim())
        .filter(Boolean);
      if (!incoming.length) return;
      setHistory((prev) => {
        const seen = new Set(prev.map((t) => t.toLowerCase()));
        const merged = [...prev];
        for (const tag of incoming) {
          if (!seen.has(tag.toLowerCase())) {
            merged.push(tag);
            seen.add(tag.toLowerCase());
          }
        }
        const trimmed = merged.slice(-MAX);
        try {
          localStorage.setItem(PREFIX + key, JSON.stringify(trimmed));
        } catch {
          // เขียนไม่ได้ (เช่น private mode) — ข้าม ไม่ให้ล้ม
        }
        return trimmed;
      });
    },
    [key],
  );

  return { history, remember };
}
