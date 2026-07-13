// ============================================================================
// เลือก data backend ตาม env — frontend-first ใช้ 'mock' เป็นค่าเริ่มต้น
//   VITE_DATA_BACKEND=supabase  → ต่อ Supabase จริง (เมื่อทำ backend แล้ว)
//   ไม่ตั้งค่า / อื่น ๆ           → mock in-memory (คลิกได้/เดโมได้โดยไม่ต้องมี backend)
// ============================================================================
import type { DataClient } from "./api";
import { mockClient } from "./mock";
import { supabaseClient } from "./supabase";

const backend = import.meta.env.VITE_DATA_BACKEND;

export const db: DataClient =
  backend === "supabase" ? supabaseClient : mockClient;

export const DATA_BACKEND: string = backend === "supabase" ? "supabase" : "mock";

export * from "./model";
export type { OverviewCounts, DataClient } from "./api";
