import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

function getSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET!)
}

export type SessionPayload = {
  userId: string
  email: string
  isAdmin: boolean
}

export async function createSessionCookie(payload: SessionPayload, autoLogin = true) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecret())

  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    // Omitting maxAge makes it a session cookie that clears when the browser/app fully closes.
    ...(autoLogin ? { maxAge: MAX_AGE_SECONDS } : {}),
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      isAdmin: payload.isAdmin as boolean,
    }
  } catch {
    return null
  }
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
