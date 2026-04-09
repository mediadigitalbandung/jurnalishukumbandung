import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      avatar?: string | null;
      sessionId?: string;
    };
  }
  interface User {
    id: string;
    role: Role;
    avatar?: string | null;
    sessionId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    avatar?: string | null;
    sessionId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password diperlukan");
        }

        const emailLower = credentials.email.toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email: emailLower },
        });

        if (!user || !user.isActive) {
          throw new Error("Email atau password salah");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error("Email atau password salah");
        }

        // Multi-device login: no session tracking, just update lastLoginAt
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar;
        token.sessionId = user.sessionId;
      }
      // Refresh role/name/avatar from DB
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, name: true, avatar: true, isActive: true },
          });
          if (!dbUser || !dbUser.isActive) {
            return { ...token, invalid: true };
          }
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.avatar = dbUser.avatar;
        } catch {
          // Silently fail
        }
      }
      return token;
    },
    async session({ session, token }) {
      if ((token as Record<string, unknown>).invalid) {
        return { ...session, user: { ...session.user, invalid: true } } as typeof session;
      }
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.avatar = token.avatar;
      if (token.name) session.user.name = token.name as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const EDITOR_ROLES: Role[] = [
  "SUPER_ADMIN",
  "EDITOR",
];

const WRITER_ROLES: Role[] = [
  ...EDITOR_ROLES,
  "JOURNALIST",
  "CONTRIBUTOR",
];

export function canPublishDirectly(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "EDITOR" || role === "JOURNALIST";
}

export function canApproveArticles(role: Role): boolean {
  return EDITOR_ROLES.includes(role);
}

export function canWriteArticles(role: Role): boolean {
  return WRITER_ROLES.includes(role);
}

export function canManageUsers(role: Role): boolean {
  return role === "SUPER_ADMIN";
}

export function canManageAds(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "EDITOR";
}
