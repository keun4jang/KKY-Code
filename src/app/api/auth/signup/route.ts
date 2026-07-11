import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { createSessionCookie } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

export const POST = apiHandler(async (req: Request) => {
  const { email, password, autoLogin } = await req.json()

  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: '이메일과 6자 이상의 비밀번호를 입력하세요.' }, { status: 400 })
  }

  const db = sql()
  const normalizedEmail = email.trim().toLowerCase()

  const existing = await db`select id from users where email = ${normalizedEmail}`
  if (existing.length > 0) {
    return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const [user] = await db`
    insert into users (email, password_hash)
    values (${normalizedEmail}, ${passwordHash})
    returning id, email, is_admin
  `

  await createSessionCookie({ userId: user.id, email: user.email, isAdmin: user.is_admin }, Boolean(autoLogin))

  return NextResponse.json({ userId: user.id, email: user.email, isAdmin: user.is_admin })
})
