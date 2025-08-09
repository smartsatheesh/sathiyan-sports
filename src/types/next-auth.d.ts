import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      mobile?: string
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
    mobile?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    mobile?: string
    userId?: string
  }
}
