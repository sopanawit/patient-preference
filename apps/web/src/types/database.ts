// ============================================================================
// Supabase database types
//
// หมายเหตุ: ปกติไฟล์นี้ generate ด้วย `bun run gen:types` (ต้องมี Supabase CLI +
// รัน local DB) แต่ระหว่างที่สภาพแวดล้อมนี้ยังไม่มี CLI จึงเขียนด้วยมือให้ตรงกับ
// migrations 0001–0004 เมื่อมี CLI แล้วให้ generate ทับเพื่อความแม่นยำ
// ============================================================================

type Timestamptz = string;

export type StaffRole = "cs" | "nurse" | "cx_manager" | "admin";
export type AdmissionStatus = "active" | "discharged";
export type AnalysisStatus = "pending_review" | "confirmed";
export type RequestStatus = "pending" | "approved" | "rejected";

export type Database = {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string;
          full_name: string;
          role: StaffRole;
          is_active: boolean;
          line_user_id: string | null;
          department_id: string | null;
        };
        Insert: {
          id: string;
          full_name: string;
          role: StaffRole;
          is_active?: boolean;
          line_user_id?: string | null;
          department_id?: string | null;
        };
        Update: {
          full_name?: string;
          role?: StaffRole;
          is_active?: boolean;
          line_user_id?: string | null;
          department_id?: string | null;
        };
        Relationships: [];
      };
      patients: {
        Row: {
          hn: string;
          full_name: string;
          likes_text: string | null;
          dislikes_text: string | null;
          updated_by: string | null;
          updated_at: Timestamptz;
          created_at: Timestamptz;
        };
        Insert: {
          hn: string;
          full_name: string;
          likes_text?: string | null;
          dislikes_text?: string | null;
          updated_by?: string | null;
        };
        Update: {
          full_name?: string;
          likes_text?: string | null;
          dislikes_text?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      admissions: {
        Row: {
          id: string;
          hn: string;
          room: string;
          admit_date: string;
          status: AdmissionStatus;
          created_by: string | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: string;
          hn: string;
          room: string;
          admit_date?: string;
          status?: AdmissionStatus;
          created_by?: string | null;
        };
        Update: {
          room?: string;
          status?: AdmissionStatus;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          code: string;
          name_th: string;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          code: string;
          name_th: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          code?: string;
          name_th?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      preference_analysis: {
        Row: {
          id: string;
          hn: string;
          status: AnalysisStatus;
          model: string;
          source_hash: string | null;
          generated_at: Timestamptz;
          reviewed_by: string | null;
          reviewed_at: Timestamptz | null;
          is_current: boolean;
        };
        Insert: {
          id?: string;
          hn: string;
          status?: AnalysisStatus;
          model?: string;
          source_hash?: string | null;
          is_current?: boolean;
        };
        Update: {
          status?: AnalysisStatus;
          reviewed_by?: string | null;
          reviewed_at?: Timestamptz | null;
          is_current?: boolean;
        };
        Relationships: [];
      };
      analysis_items: {
        Row: {
          id: string;
          analysis_id: string;
          source: "like" | "dislike";
          original_text: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          source: "like" | "dislike";
          original_text: string;
        };
        Update: {
          original_text?: string;
        };
        Relationships: [];
      };
      analysis_assignments: {
        Row: {
          id: string;
          item_id: string;
          department_id: string;
          action_text: string;
          edited_by_reviewer: boolean;
        };
        Insert: {
          id?: string;
          item_id: string;
          department_id: string;
          action_text: string;
          edited_by_reviewer?: boolean;
        };
        Update: {
          department_id?: string;
          action_text?: string;
          edited_by_reviewer?: boolean;
        };
        Relationships: [];
      };
      access_requests: {
        Row: {
          id: string;
          line_user_id: string | null;
          full_name: string;
          department_id: string | null;
          note: string | null;
          status: RequestStatus;
          approved_role: StaffRole | null;
          reviewed_by: string | null;
          reviewed_at: Timestamptz | null;
          created_at: Timestamptz;
        };
        Insert: {
          id?: string;
          line_user_id?: string | null;
          full_name: string;
          department_id?: string | null;
          note?: string | null;
          status?: RequestStatus;
          approved_role?: StaffRole | null;
        };
        Update: {
          status?: RequestStatus;
          approved_role?: StaffRole | null;
          reviewed_by?: string | null;
          reviewed_at?: Timestamptz | null;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: string;
          updated_by: string | null;
          updated_at: Timestamptz;
        };
        Insert: {
          key: string;
          value?: string;
          updated_by?: string | null;
        };
        Update: {
          value?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: number;
          actor: string | null;
          action: string;
          entity: string;
          entity_id: string;
          detail: Record<string, unknown> | null;
          at: Timestamptz;
        };
        Insert: {
          actor?: string | null;
          action: string;
          entity: string;
          entity_id: string;
          detail?: Record<string, unknown> | null;
        };
        Update: {
          detail?: Record<string, unknown> | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      staff_role: StaffRole;
      admission_status: AdmissionStatus;
      analysis_status: AnalysisStatus;
      request_status: RequestStatus;
    };
  };
};
