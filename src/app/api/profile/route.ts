import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

export const GET = apiHandler(async () => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const db = sql()
  const [profile] = await db`
    select email, name, nickname, custom_instructions, phone, date_of_birth, address
    from users
    where id = ${session.userId}
  `
  return NextResponse.json(profile)
})

export const PATCH = apiHandler(async (req: Request) => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const body = await req.json()
  const db = sql()
  const userId = session.userId

  if (typeof body.name === 'string') {
    await db`update users set name = ${body.name} where id = ${userId}`
  }
  if (typeof body.nickname === 'string') {
    await db`update users set nickname = ${body.nickname || null} where id = ${userId}`
  }
  if (typeof body.custom_instructions === 'string') {
    await db`update users set custom_instructions = ${body.custom_instructions || null} where id = ${userId}`
  }
  if (typeof body.phone === 'string') {
    await db`update users set phone = ${body.phone} where id = ${userId}`
  }
  if (typeof body.date_of_birth === 'string') {
    await db`update users set date_of_birth = ${body.date_of_birth} where id = ${userId}`
  }
  if (typeof body.address === 'string') {
    await db`update users set address = ${body.address || null} where id = ${userId}`
  }

  return NextResponse.json({ ok: true })
})
