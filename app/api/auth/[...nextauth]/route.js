import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * The [...nextauth] folder name is a "catch-all" route: this one file
 * handles every URL under /api/auth/, for example:
 *   /api/auth/signin/google      → starts Google sign-in
 *   /api/auth/callback/google    → Google redirects back here
 *   /api/auth/session            → returns the current session
 *   /api/auth/signout            → signs the user out
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
