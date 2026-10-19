"use client";

import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  // status is "loading", "authenticated" or "unauthenticated"
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p className="text-sm text-zinc-500">Checking sign-in…</p>;
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn("google")}
        className="rounded-lg bg-white px-5 py-2.5 font-medium text-black transition-colors hover:bg-zinc-200"
      >
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name ?? "Profile photo"}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        <div className="text-left">
          <p className="font-medium">{session.user.name}</p>
          <p className="text-sm text-zinc-400">{session.user.email}</p>
        </div>
      </div>
      <button
        onClick={() => signOut()}
        className="text-sm text-zinc-400 underline-offset-4 hover:text-white hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}
