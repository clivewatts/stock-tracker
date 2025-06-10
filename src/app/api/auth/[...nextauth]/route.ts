import NextAuth from 'next-auth';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
// Import NextAuth types and extend session types
import { User as NextAuthUser } from 'next-auth';
import { Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';

// Define custom user types
type UserWithRole = NextAuthUser & {
  role?: string;
  id?: string;
};

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      id?: string;
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Check if this is the first user trying to sign in
        const usersCount = await prisma.user.count();
        let user = null;

        if (usersCount === 0 && credentials.email && credentials.password) {
          // Create the first user as master admin
          try {
            user = await prisma.user.create({
              data: {
                email: credentials.email,
                name: 'Master Admin',
                password: await bcrypt.hash(credentials.password, 10),
                role: 'admin',
              },
            });
            
            console.log('Created first admin user:', user.email);
            
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          } catch (error) {
            console.error('Error creating first admin user:', error);
            // Check if user was actually created despite the error
            const createdUser = await prisma.user.findUnique({
              where: {
                email: credentials.email
              }
            });
            
            if (createdUser) {
              // Authentication can proceed with the found user
              console.log('Found existing first admin user, proceeding with login');
              return {
                id: createdUser.id,
                email: createdUser.email,
                name: createdUser.name,
                role: createdUser.role,
              };
            }
            
            return null;
          }
        }

        // Regular login flow
        user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT & { role?: string; id?: string }; user: UserWithRole }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT & { role?: string; id?: string } }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
