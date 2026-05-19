import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'דואר אלקטרוני', type: 'email' },
        password: { label: 'סיסמה', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        // Constant-time lookup to prevent timing attacks
        const user = await db.user.findUnique({ where: { email: credentials.email } })
        // Always compare hash even when user not found (prevent timing enumeration)
        const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attack.enumeration'
        const valid = await bcrypt.compare(credentials.password, user?.password ?? dummyHash)
        if (!user || !valid) return null
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          businessId: user.businessId,
          role: user.role,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.businessId = (user as { businessId?: string }).businessId
        token.role = (user as { role?: string }).role ?? 'USER'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as { id?: string; businessId?: string; role?: string }
        u.id         = token.id as string
        u.businessId = token.businessId as string | undefined
        u.role       = token.role as string | undefined
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
