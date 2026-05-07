import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function isAdminRole(role) {
  if (role == null) return false;
  return String(role).trim().toLowerCase() === "admin";
}

async function fetchProfileRole(userId) {
  console.log("🔍 fetchProfileRole called with userId:", userId);
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    console.log(`🔄 Attempt ${attempt + 1} to fetch profile`);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    console.log("📊 Profile query result:", { profile, error });
    
    if (!error) {
      console.log("✅ Profile fetched successfully:", profile);
      return { profile, error: null };
    }

    lastError = error;
    console.log(`❌ Profile fetch error (attempt ${attempt + 1}):`, error);
    await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }

  console.log("❌ All attempts failed, returning error:", lastError);
  return { profile: null, error: lastError };
}

export default function AdminProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
  const verifyGenerationRef = useRef(0);

  const verify = useCallback(async (nextSession, { showSpinner } = {}) => {
    const generation = ++verifyGenerationRef.current;
    console.log("🚀 verify called:", { generation, showSpinner, hasSession: !!nextSession?.user?.id });

    const stale = () => {
      const isStale = generation !== verifyGenerationRef.current;
      if (isStale) console.log("⏭️ Stale check, skipping");
      return isStale;
    };

    setVerifyError(null);

    if (showSpinner) setLoading(true);

    if (!nextSession?.user?.id) {
      if (stale()) return;
      console.log("❌ No session user ID found");
      setSession(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    console.log("👤 Session user ID:", nextSession.user.id);
    let { profile, error } = await fetchProfileRole(nextSession.user.id);
    if (stale()) return;

    if (!profile && !error) {
      console.log("⏳ No profile found, retrying after delay...");
      await new Promise((r) => setTimeout(r, 350));
      if (stale()) return;
      ({ profile, error } = await fetchProfileRole(nextSession.user.id));
      if (stale()) return;
    }

    if (stale()) return;
    setSession(nextSession);

    if (error) {
      if (stale()) return;
      console.log("❌ Profile error:", error);
      setVerifyError(error.message);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (!profile) {
      if (stale()) return;
      console.log("❌ No profile found after retry");
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    if (stale()) return;
    const isAdminResult = isAdminRole(profile.role);
    console.log("🔐 Role check:", { profileRole: profile.role, isAdminResult });
    setIsAdmin(isAdminResult);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    console.log("🎣 AdminProtectedRoute useEffect mounted");

    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        if (cancelled) return;
        console.log("📥 Initial session:", s);
        verify(s, { showSpinner: true });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      console.log("🔄 Auth state change:", { event, hasSession: !!nextSession?.user?.id });
      if (event === "INITIAL_SESSION") return;

      const showSpinner =
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED";

      verify(nextSession, { showSpinner });
    });

    return () => {
      console.log("🧹 AdminProtectedRoute useEffect cleanup");
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [verify]);

  async function retryVerify() {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    verify(s, { showSpinner: true });
  }

  if (loading) {
    console.log("⏳ AdminProtectedRoute: Loading state");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-emerald-950 text-gray-300">
        <p className="text-sm">Checking access…</p>
      </div>
    );
  }

  if (!session) {
    console.log("🚫 AdminProtectedRoute: No session, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  if (verifyError) {
    console.log("❌ AdminProtectedRoute: Verification error:", verifyError);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-emerald-950 px-4">
        <p className="text-red-300 text-sm text-center max-w-md mb-4">
          Could not verify admin access ({verifyError}). You can retry without
          being sent back to the dashboard.
        </p>
        <button
          type="button"
          onClick={retryVerify}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    console.log("🚫 AdminProtectedRoute: Not admin, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  console.log("✅ AdminProtectedRoute: Access granted, rendering children");
  return children ?? <Outlet />;
}
