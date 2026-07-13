import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "ไม่พบ VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY — ตั้งค่าใน apps/web/.env (ดู .env.example)",
  );
}

// typed client — generate types ด้วย `bun run gen:types` (ดู CLAUDE.md ข้อ 10)
export const supabase = createClient<Database>(url, anonKey);
