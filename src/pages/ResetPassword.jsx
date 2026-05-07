import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

const MIN_PASSWORD_LEN = 6;

/** True when URL looks like an auth redirect (implicit hash, recovery, or PKCE code). */
function readAuthCallbackHint() {
  if (typeof window === "undefined") return false;
  const { hash, search } = window.location;
  const fromHash = new URLSearchParams(hash.replace(/^#/, ""));
  const fromSearch = new URLSearchParams(search);
  return (
    fromHash.get("type") === "recovery" ||
    Boolean(fromHash.get("access_token")) ||
    fromSearch.has("code")
  );
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [authCallbackHint] = useState(readAuthCallbackHint);
  const [phase, setPhase] = useState("loading"); // loading | ready | invalid
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY") {
          setPhase("ready");
        }
      }
    );

    const timer = setTimeout(async () => {
      if (cancelled) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setPhase((p) => {
        if (p === "ready") return p;
        if (authCallbackHint && session?.user) return "ready";
        return "invalid";
      });
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [authCallbackHint]);

  const validate = () => {
    const next = {};
    if (password.length < MIN_PASSWORD_LEN) {
      next.password = `Password must be at least ${MIN_PASSWORD_LEN} characters`;
    }
    if (password !== confirm) {
      next.confirm = "Passwords do not match";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    navigate("/login", { replace: true });
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-emerald-950 px-4">
        <div className="text-center text-gray-200">
          <p className="text-lg font-medium">Verifying reset link…</p>
          <p className="text-sm text-gray-400 mt-2">Please wait.</p>
        </div>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-emerald-950 px-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-xl text-center">
          <h2 className="text-xl font-bold text-white mb-2">Invalid or expired link</h2>
          <p className="text-gray-300 text-sm mb-6">
            Use the link from your password reset email, or request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block text-emerald-400 hover:underline"
          >
            Request a new reset link
          </Link>
          <p className="mt-4">
            <Link to="/login" className="text-gray-400 text-sm hover:text-white">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-emerald-950 px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-xl">
        <h2 className="text-3xl font-bold text-white text-center">
          Set new password
        </h2>
        <p className="text-gray-300 text-sm text-center mt-2 mb-6">
          Choose a new password for your account.
        </p>

        {error ? (
          <div
            className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-center text-sm text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm mb-1">
              New password
            </label>
            <input
              type="password"
              name="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                setError("");
              }}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoComplete="new-password"
              disabled={submitting}
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-sm text-red-300">{fieldErrors.password}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Confirm password
            </label>
            <input
              type="password"
              name="confirm"
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                setError("");
              }}
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoComplete="new-password"
              disabled={submitting}
            />
            {fieldErrors.confirm ? (
              <p className="mt-1 text-sm text-red-300">{fieldErrors.confirm}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition font-semibold text-white"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>

        <p className="text-center text-gray-300 text-sm mt-6">
          <Link to="/login" className="text-emerald-400 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
