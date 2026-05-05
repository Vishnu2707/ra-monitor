import { create } from 'zustand';

import {
  supabase,
  type AuthSession,
  type AuthUser,
  type Profile,
} from '../lib/supabase';

type AuthState = {
  session: AuthSession | null;
  user: AuthUser | null;
  profile: Profile | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => () => void;
  loadProfile: (userId: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  loading: false,
  error: null,

  initialize: () => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      set({
        session: data.session,
        user: data.session?.user ?? null,
        initialized: true,
      });

      if (data.session?.user) {
        void get().loadProfile(data.session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        user: session?.user ?? null,
        profile: session?.user ? get().profile : null,
        initialized: true,
      });

      if (session?.user) {
        void get().loadProfile(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  },

  loadProfile: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle<Profile>();

    if (error) {
      set({ error: error.message });
      return;
    }

    set({ profile: data ?? null });
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({
      session: data.session,
      user: data.user,
      loading: false,
    });

    if (data.user) {
      await get().loadProfile(data.user.id);
    }
  },

  register: async (email, password, fullName) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
        },
      },
    });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    if (data.user) {
      const profile: Profile = {
        id: data.user.id,
        full_name: fullName.trim() || null,
        date_of_birth: null,
        diagnosis_year: null,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      if (profileError) {
        set({ loading: false, error: profileError.message });
        return;
      }

      set({ profile });
    }

    set({
      session: data.session,
      user: data.user,
      loading: false,
    });
  },

  updateProfile: async (profile) => {
    const user = get().user;

    if (!user) {
      set({ error: 'You must be logged in to update your profile.' });
      return;
    }

    set({ loading: true, error: null });
    const payload = {
      ...profile,
      id: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single<Profile>();

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({ profile: data, loading: false });
  },

  logout: async () => {
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signOut();

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }

    set({
      session: null,
      user: null,
      profile: null,
      loading: false,
    });
  },

  clearError: () => set({ error: null }),
}));
