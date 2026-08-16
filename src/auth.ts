import { UserStatus } from "@prisma/client";
import NextAuth from "next-auth";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { isGoogleAuthConfigured } from "@/lib/auth-config";
import { db } from "@/lib/db";

const googleConfigured = isGoogleAuthConfigured();

export const { handlers, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  providers: googleConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID!,
          clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),
      ]
    : [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return false;

      const googleProfile = profile as GoogleProfile | undefined;
      const email = googleProfile?.email?.trim().toLowerCase();
      const googleSub = googleProfile?.sub;
      if (!email || !googleSub || !googleProfile.email_verified) return false;

      const [byGoogleSub, byEmail] = await Promise.all([
        db.user.findUnique({ where: { googleSub } }),
        db.user.findUnique({ where: { email } }),
      ]);

      if (byGoogleSub && byEmail && byGoogleSub.id !== byEmail.id) return false;
      const existing = byGoogleSub ?? byEmail;
      if (existing?.googleSub && existing.googleSub !== googleSub) return false;

      const databaseUser = existing
        ? existing.googleSub
          ? existing
          : await db.user.update({
              where: { id: existing.id },
              data: { googleSub },
            })
        : await db.user.create({
            data: {
              name: googleProfile.name?.trim() || email.split("@")[0],
              email,
              googleSub,
              passwordHash: null,
              status: UserStatus.PENDING,
            },
          });

      if (databaseUser.status !== UserStatus.ACTIVE) {
        return `/login?reason=${databaseUser.status.toLowerCase()}&provider=google`;
      }

      user.id = databaseUser.id;
      user.name = databaseUser.name;
      user.email = databaseUser.email;
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.userId = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
});
