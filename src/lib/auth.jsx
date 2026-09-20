import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "./supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (cancelled) return;
        setSession(data.session);
        await loadProfile(data.session?.user?.id);
      })
      .catch(() => {
        // getSession() can reject (storage/cookie issues, malformed OAuth
        // redirect hash, etc.) — fall through to onAuthStateChange, or just
        // stop showing the spinner and let the user retry signing in.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = {
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user || null,
    profile,
    isAdmin: profile?.role === "admin",
    refreshProfile: () => loadProfile(session?.user?.id),
    async signUpWithEmail(email, password, { username, name } = {}) {
      return supabase.auth.signUp({
        email,
        password,
        options: { data: { username, full_name: name } },
      });
    },
    async signInWithEmail(email, password) {
      return supabase.auth.signInWithPassword({ email, password });
    },
    async signInWithGoogle() {
      return supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
    },
    async signInWithGitHub() {
      return supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: window.location.origin },
      });
    },
    async signOut() {
      return supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
