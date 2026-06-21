"use client";

import { ArrowRight, Loader2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Mode = "signin" | "signup" | "forgot";

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/chat";
  const initialMode: Mode = params.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // After certain flows we just show a success card (sign-up needs email
  // confirmation, password-reset email has been sent).
  const [done, setDone] = useState<null | "confirm-email" | "reset-sent">(null);

  const reset = () => {
    setError(null);
    setDone(null);
    setPassword("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes("@")) {
      setError("enter a valid email.");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError("password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const sb = getSupabaseBrowser();

      if (mode === "signin") {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          setError(error.message);
          return;
        }
        router.push(next);
        router.refresh();
        return;
      }

      if (mode === "signup") {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`;
        const { data, error } = await sb.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) {
          setError(error.message);
          return;
        }
        // If email confirmation is OFF in the Supabase project, Supabase
        // returns a session here and we can jump straight in.
        if (data.session) {
          router.push(next);
          router.refresh();
          return;
        }
        // Otherwise the user needs to click the confirmation link first.
        setDone("confirm-email");
        return;
      }

      // forgot password
      const redirectTo = `${window.location.origin}/auth/callback?next=/account`;
      const { error } = await sb.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo }
      );
      if (error) {
        setError(error.message);
        return;
      }
      setDone("reset-sent");
    } finally {
      setBusy(false);
    }
  };

  const headline =
    mode === "signin"
      ? "welcome back"
      : mode === "signup"
      ? "create your account"
      : "reset your password";

  const sub =
    mode === "signin"
      ? "sign in with your email and password."
      : mode === "signup"
      ? "use any email + a password you'll remember."
      : "we'll email you a link to set a new password.";

  return (
    <div className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[160px]" />
        <div className="absolute right-0 top-32 h-[400px] w-[400px] rounded-full bg-fuchsia-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6">
        <header className="flex items-center justify-between py-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/40">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                TGFX Academy
              </span>
              <span className="text-base font-bold text-white">Ray AI</span>
            </div>
          </Link>
        </header>

        <div className="flex flex-1 items-center">
          <div className="w-full space-y-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{headline}</h1>
              <p className="text-sm text-zinc-400">{sub}</p>
            </div>

            {done === "confirm-email" && (
              <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                <div className="inline-flex items-center justify-center rounded-full bg-emerald-500/20 p-2">
                  <Mail className="h-5 w-5 text-emerald-300" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">confirm your email</h2>
                  <p className="mt-1 text-sm text-emerald-200/80">
                    we sent a confirmation link to <strong>{email}</strong>.
                    click it, then come back here and sign in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    reset();
                  }}
                  className="text-xs text-emerald-300/80 hover:text-emerald-200"
                >
                  back to sign in →
                </button>
              </div>
            )}

            {done === "reset-sent" && (
              <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                <div className="inline-flex items-center justify-center rounded-full bg-emerald-500/20 p-2">
                  <Mail className="h-5 w-5 text-emerald-300" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">check your inbox</h2>
                  <p className="mt-1 text-sm text-emerald-200/80">
                    a password reset link is on its way to{" "}
                    <strong>{email}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    reset();
                  }}
                  className="text-xs text-emerald-300/80 hover:text-emerald-200"
                >
                  back to sign in →
                </button>
              </div>
            )}

            {!done && (
              <form onSubmit={submit} className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-400">
                    email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  />
                </label>

                {mode !== "forgot" && (
                  <label className="block">
                    <span className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                      <span>password</span>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode("forgot");
                            reset();
                          }}
                          className="text-[11px] font-medium text-emerald-300 hover:text-emerald-200"
                        >
                          forgot?
                        </button>
                      )}
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === "signup"
                          ? "at least 8 characters"
                          : "your password"
                      }
                      autoComplete={
                        mode === "signup"
                          ? "new-password"
                          : "current-password"
                      }
                      className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    />
                  </label>
                )}

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy || !email.trim()}
                  className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-60"
                >
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative inline-flex items-center justify-center gap-2">
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {mode === "signin"
                          ? "signing in…"
                          : mode === "signup"
                          ? "creating account…"
                          : "sending reset link…"}
                      </>
                    ) : (
                      <>
                        {mode === "signin"
                          ? "sign in"
                          : mode === "signup"
                          ? "create account"
                          : "send reset link"}
                        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                      </>
                    )}
                  </span>
                </button>
              </form>
            )}

            {!done && (
              <div className="text-center text-xs text-zinc-500">
                {mode === "signin" ? (
                  <>
                    new here?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        reset();
                      }}
                      className="font-semibold text-emerald-300 hover:text-emerald-200"
                    >
                      create an account
                    </button>
                  </>
                ) : (
                  <>
                    already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        reset();
                      }}
                      className="font-semibold text-emerald-300 hover:text-emerald-200"
                    >
                      sign in
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="py-4 text-center text-[11px] text-zinc-600">
          by signing in you agree to the TGFX Academy terms.
        </footer>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-zinc-950" />}>
      <AuthForm />
    </Suspense>
  );
}
