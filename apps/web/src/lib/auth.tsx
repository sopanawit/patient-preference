import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { db, type AuthSnapshot, type StaffProfile } from "@/data";

interface AuthState {
  userId: string | null;
  /** โปรไฟล์ staff ของผู้ใช้ปัจจุบัน (null = ยังไม่มีบัญชี/ยังไม่อนุมัติ) */
  profile: StaffProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<AuthSnapshot>({ userId: null, profile: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    db.auth.getCurrent().then((s) => {
      if (!active) return;
      setSnap(s);
      setLoading(false);
    });
    const unsub = db.auth.onChange((s) => {
      if (active) setSnap(s);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      userId: snap.userId,
      profile: snap.profile,
      loading,
      signOut: () => db.auth.signOut(),
      refreshProfile: async () => setSnap(await db.auth.getCurrent()),
    }),
    [snap, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องอยู่ภายใน <AuthProvider>");
  return ctx;
}
