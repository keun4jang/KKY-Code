import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyPassword } from '@/lib/auth/password'
import { createSessionCookie } from '@/lib/auth/session'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력하세요.' }, { status: 400 })
  }

  const db = sql()
  const normalizedEmail = email.trim().toLowerCase()

  const [user] = await db`select id, email, password_hash, is_admin from users where email = ${normalizedEmail}`
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
  }

  await createSessionCookie({ userId: user.id, email: user.email, isAdmin: user.is_admin })

  return NextResponse.json({ userId: user.id, email: user.email, isAdmin: user.is_admin })
}
