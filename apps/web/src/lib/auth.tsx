import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { StaffRole } from "@/types/database";

export interface StaffProfile {
  id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  department_id: string | null;
}

interface AuthState {
  session: Session | null;
  /** โปรไฟล์ staff ของผู้ใช้ปัจจุบัน (null = ยังไม่มีบัญชี/ยังไม่อนุมัติ) */
  profile: StaffProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function fetchProfile(userId: string): Promise<StaffProfile | null> {
  const { data } = await supabase
    .from("staff")
    .select("id, full_name, role, is_active, department_id")
    .eq("id", userId)
    .maybeSingle();
  return data ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load(nextSession: Session | null) {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        setProfile(await fetchProfile(nextSession.user.id));
      } else {
        setProfile(null);
      }
      if (active) setLoading(false);
    }

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      void load(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        if (session?.user) setProfile(await fetchProfile(session.user.id));
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องอยู่ภายใน <AuthProvider>");
  return ctx;
}
