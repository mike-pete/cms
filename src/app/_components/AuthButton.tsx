"use client";

import { signIn, signOut } from "next-auth/react";

export function AuthButton({
  session,
}: {
  session: { user?: { name?: string | null } } | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <p className="text-center text-2xl text-white">
        {session && <span>Logged in as {session.user?.name}</span>}
      </p>
      <button
        className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
        onClick={() => {
          if (session) {
            void signOut();
          } else {
            void signIn("google", { callbackUrl: "/" });
          }
        }}
      >
        {session ? "Sign out" : "Sign in"}
      </button>
    </div>
  );
}
