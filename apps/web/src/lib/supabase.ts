import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// สร้าง client แบบ lazy — จะสร้างจริงเมื่อถูกใช้งานครั้งแรกเท่านั้น
// (สำคัญ: โหมด mock/frontend-first ที่ไม่มี .env จะ import โมดูลนี้ได้โดยไม่ crash)
let client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "ไม่พบ VITE_SUPABASE_URL หรือ VITE_SUPABASE_ANON_KEY — ตั้งค่าใน apps/web/.env (ดู .env.example) หรือใช้ VITE_DATA_BACKEND=mock",
    );
  }
  client = createClient<Database>(url, anonKey);
  return client;
}

// typed client — proxy ไปยัง client จริงแบบ lazy (generate types ด้วย `bun run gen:types`)
export const supabase: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_target, prop) {
      const real = getClient() as unknown as Record<string | symbol, unknown>;
      const value = real[prop];
      return typeof value === "function" ? value.bind(real) : value;
    },
  },
);
