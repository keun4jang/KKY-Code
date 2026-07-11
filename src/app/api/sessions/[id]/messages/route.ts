import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

export const GET = apiHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id } = await params
  const db = sql()

  const owned = await db`select id from chat_sessions where id = ${id} and user_id = ${session.userId}`
  if (owned.length === 0) return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })

  const rows = await db`
    select id, role, content
    from chat_messages
    where session_id = ${id}
    order by created_at asc
  `
  return NextResponse.json(rows)
})

export const POST = apiHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { id } = await params
  const { role, content } = await req.json()

  if (role !== 'user' && role !== 'assistant') {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 })
  }

  const db = sql()
  const owned = await db`select id from chat_sessions where id = ${id} and user_id = ${session.userId}`
  if (owned.length === 0) return NextResponse.json({ error: '접근 권한이 없습니다.' }, { status: 403 })

  const [row] = await db`
    insert into chat_messages (session_id, user_id, role, content)
    values (${id}, ${session.userId}, ${role}, ${content})
    returning id, role, content
  `
  return NextResponse.json(row)
})
