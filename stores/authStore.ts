import { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/lib/types";

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  updateProfile: (partial: Partial<Profile>) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  session: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
  updateProfile: (partial) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...partial } : state.profile,
    })),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },
}));
