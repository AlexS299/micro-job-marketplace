import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID ? [
      GoogleProvider({
        clientId:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      }),
    ] : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'דואר אלקטרוני', type: 'email' },
        password: { label: 'סיסמה', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await db.user.findUnique({ where: { email: credentials.email } })
        const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attack.enumeration'
        const valid = await bcrypt.compare(credentials.password, user?.password ?? dummyHash)
        if (!user || !valid || !user.password) return null
        return {
          id: user.id, email: user.email,
          name: user.name ?? user.email,
          image: user.image,
          businessId: user.businessId,
          role: user.role,
          locale: user.locale,
          onboardingDone: user.onboardingDone,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', newUser: '/onboarding' },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        const existing = await db.user.findUnique({ where: { email: profile.email } })
        if (!existing) {
          const displayName = (profile as { name?: string }).name ?? profile.email.split('@')[0]
          const business = await db.business.create({
            data: { name: `העסק של ${displayName}` },
          })
          await db.user.create({
            data: {
              email:    profile.email,
              name:     (profile as { name?: string }).name ?? null,
              image:    (profile as { picture?: string }).picture ?? null,
              googleId: account.providerAccountId,
              businessId: business.id,
              onboardingDone: false,
            },
          })
        } else if (!existing.googleId) {
          await db.user.update({
            where: { id: existing.id },
            data: {
              googleId: account.providerAccountId,
              image: (profile as { picture?: string }).picture ?? undefined,
            },
          })
        }
      }
      return true
    },

    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.id             = user.id
        token.businessId     = (user as { businessId?: string }).businessId
        token.role           = (user as { role?: string }).role ?? 'USER'
        token.locale         = (user as { locale?: string }).locale ?? 'he'
        token.onboardingDone = (user as { onboardingDone?: boolean }).onboardingDone ?? false
      }
      // Populate token from DB for Google sign-in
      if (account?.provider === 'google' && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email as string },
          select: { id: true, businessId: true, role: true, locale: true, onboardingDone: true },
        })
        if (dbUser) {
          token.id             = dbUser.id
          token.businessId     = dbUser.businessId
          token.role           = dbUser.role
          token.locale         = dbUser.locale
          token.onboardingDone = dbUser.onboardingDone
        }
      }
      // Re-read from DB when session is explicitly refreshed (e.g., after onboarding)
      if (trigger === 'update' && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { businessId: true, role: true, locale: true, onboardingDone: true },
        })
        if (dbUser) {
          token.businessId     = dbUser.businessId
          token.role           = dbUser.role
          token.locale         = dbUser.locale
          token.onboardingDone = dbUser.onboardingDone
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        const u = session.user as {
          id?: string; businessId?: string; role?: string
          locale?: string; onboardingDone?: boolean
        }
        u.id             = token.id as string
        u.businessId     = token.businessId as string | undefined
        u.role           = token.role as string | undefined
        u.locale         = (token.locale as string | undefined) ?? 'he'
        u.onboardingDone = token.onboardingDone as boolean | undefined
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
