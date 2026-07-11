import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

export const PATCH = apiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const db = sql()

  if (typeof body.title === 'string') {
    await db`
      update chat_sessions set title = ${body.title}
      where id = ${id} and user_id = ${session.userId}
    `
  }

  if (typeof body.is_pinned === 'boolean') {
    await db`
      update chat_sessions set is_pinned = ${body.is_pinned}
      where id = ${id} and user_id = ${session.userId}
    `
  }

  return NextResponse.json({ ok: true })
})

export const DELETE = apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id } = await params
  const db = sql()
  await db`delete from chat_sessions where id = ${id} and user_id = ${session.userId}`

  return NextResponse.json({ ok: true })
})
