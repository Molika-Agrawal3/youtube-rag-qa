"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Makes the sign-in session available to every client component through
 * the useSession() hook. It must be a client component ("use client")
 * because it uses React context, which only exists in the browser.
 */
export default function Providers({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
