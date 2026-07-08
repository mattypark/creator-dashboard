"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
      } else {
        setError("Wrong password");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        <div>
          <span className="font-serif text-2xl font-semibold lowercase">
            studio<span className="text-[var(--mango)]">.</span>
          </span>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Enter your password to continue.
          </p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--mango)]"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="rounded-lg bg-[var(--mango)] px-3 py-2 text-sm font-medium text-white hover:brightness-105 disabled:opacity-50"
        >
          {busy ? "…" : "Enter"}
        </button>
      </form>
    </div>
  );
}
