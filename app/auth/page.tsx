"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AuthPage() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        router.push("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // Check if onboarding is complete
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profile")
            .select("user_id")
            .eq("user_id", user.id)
            .single();

          router.push(profile ? "/feed" : "/onboarding");
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-8 animate-fade-in">
      {/* Logo */}
      <h1 className="font-serif text-[40px] font-light tracking-[10px] uppercase text-ink">
        Aesthetic
      </h1>
      <p className="text-[12px] text-ink-muted tracking-[2px] uppercase mt-1 mb-12">
        Your personal lookbook
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-[320px]">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full py-3.5 border-b border-border bg-transparent outline-none text-sm text-ink placeholder:text-ink-muted focus:border-ink transition-colors mb-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full py-3.5 border-b border-border bg-transparent outline-none text-sm text-ink placeholder:text-ink-muted focus:border-ink transition-colors mb-2"
        />

        {error && (
          <p className="text-accent text-xs mt-2 animate-fade-in">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 py-4 bg-ink text-white text-[13px] font-medium tracking-[2px] uppercase rounded-sm hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading
            ? "..."
            : mode === "signup"
            ? "Create Account"
            : "Sign In"}
        </button>
      </form>

      {/* Toggle */}
      <button
        onClick={() => setMode((m) => (m === "signup" ? "login" : "signup"))}
        className="mt-5 text-xs text-ink-muted bg-transparent border-none"
      >
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <span className="text-ink underline">Sign in</span>
          </>
        ) : (
          <>
            New here?{" "}
            <span className="text-ink underline">Create account</span>
          </>
        )}
      </button>
    </div>
  );
}
