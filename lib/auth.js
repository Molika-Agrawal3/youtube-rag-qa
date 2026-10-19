import GoogleProvider from "next-auth/providers/google";
import { connectToDB } from "@/lib/db";
import User from "@/models/User";

/**
 * NextAuth configuration, shared by the auth API route and by any server
 * code that needs to know who is signed in (via getServerSession).
 *
 * It lives here instead of inside app/api/auth/[...nextauth]/route.js
 * because Next.js only allows route files to export HTTP handlers
 * (GET, POST, ...). Exporting extra values from a route file breaks the build.
 */
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  // Store the session in a signed, encrypted cookie (a JWT) instead of a
  // database table. Checking "who is this?" then needs no database query.
  session: { strategy: "jwt" },

  callbacks: {
    /**
     * Runs whenever the JWT is created or read.
     * `user` is only present on the very first call, right after sign-in.
     */
    async jwt({ token, user }) {
      if (user) {
        await connectToDB();

        // "Upsert": update the user if they exist, otherwise insert them.
        // This also keeps their name and photo in sync with Google.
        const dbUser = await User.findOneAndUpdate(
          { email: user.email },
          { $set: { name: user.name, image: user.image } },
          { upsert: true, returnDocument: "after" }
        );

        // Remember our database ID inside the token, so later requests
        // know which user this is without looking them up again.
        token.userId = dbUser._id.toString();
      }
      return token;
    },

    /**
     * Shapes the session object that the app sees
     * (useSession() in the browser, getServerSession() on the server).
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
};
