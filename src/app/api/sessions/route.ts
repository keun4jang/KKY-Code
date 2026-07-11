import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const db = sql()
  const rows = await db`
    select id, title, is_pinned
    from chat_sessions
    where user_id = ${session.userId}
    order by is_pinned desc, created_at desc
  `
  return NextResponse.json(rows)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { title } = await req.json()
  const db = sql()
  const [row] = await db`
    insert into chat_sessions (user_id, title)
    values (${session.userId}, ${title || '새 채팅'})
    returning id, title, is_pinned
  `
  return NextResponse.json(row)
}
