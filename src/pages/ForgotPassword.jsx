import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

const RESET_REDIRECT =
  import.meta.env.DEV === true
    ? "https://upward-gains.com/reset-password"
    : `${window.location.origin}/reset-password`;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSubmitting(true);

    const trimmed = email.trim();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      trimmed,
      { redirectTo: RESET_REDIRECT }
    );

    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-emerald-950 px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-xl">
        <h2 className="text-3xl font-bold text-white text-center">
          Forgot password
        </h2>

        <p className="text-gray-300 text-sm text-center mt-2 mb-6">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {success ? (
          <div
            className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-3 text-center text-sm text-emerald-100"
            role="status"
          >
            Check your email for password reset link
          </div>
        ) : null}

        {error ? (
          <div
            className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-center text-sm text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm mb-1">
                Email address
              </label>
              <input
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full px-4 py-3 rounded-lg bg-black/40 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                autoComplete="email"
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition font-semibold text-white"
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
          </form>
        ) : null}

        <p className="text-center text-gray-300 text-sm mt-6">
          <Link
            to="/login"
            className="text-emerald-400 hover:underline"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
