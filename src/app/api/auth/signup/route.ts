import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { createSessionCookie } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'
import { logToGoogleSheets } from '@/lib/googleSheets'

export const POST = apiHandler(async (req: Request) => {
  const { email, password, name, date_of_birth, phone, address, autoLogin } = await req.json()

  if (typeof email !== 'string' || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: '이메일과 6자 이상의 비밀번호를 입력하세요.' }, { status: 400 })
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })
  }
  if (typeof date_of_birth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
    return NextResponse.json({ error: '생년월일을 입력하세요.' }, { status: 400 })
  }
  if (typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ error: '핸드폰 번호를 입력하세요.' }, { status: 400 })
  }

  const db = sql()
  const normalizedEmail = email.trim().toLowerCase()

  const existing = await db`select id from users where email = ${normalizedEmail}`
  if (existing.length > 0) {
    return NextResponse.json({ error: '이미 가입된 이메일입니다.' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const [user] = await db`
    insert into users (email, password_hash, name, date_of_birth, phone, address)
    values (${normalizedEmail}, ${passwordHash}, ${name.trim()}, ${date_of_birth}, ${phone.trim()}, ${address?.trim() || null})
    returning id, email, is_admin
  `

  await createSessionCookie({ userId: user.id, email: user.email, isAdmin: user.is_admin }, Boolean(autoLogin))

  logToGoogleSheets({
    type: 'signup',
    userId: user.id,
    email: user.email,
    name: name.trim(),
    date_of_birth,
    phone: phone.trim(),
    address: address?.trim() || null,
    timestamp: new Date().toISOString(),
  })

  return NextResponse.json({ userId: user.id, email: user.email, isAdmin: user.is_admin })
})
