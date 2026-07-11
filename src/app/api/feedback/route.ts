import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

export const GET = apiHandler(async () => {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 })

  const db = sql()
  const rows = await db`
    select id, email, message, created_at
    from feedback
    order by created_at desc
  `
  return NextResponse.json(rows)
})

export const POST = apiHandler(async (req: Request) => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { message } = await req.json()
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: '피드백 내용을 입력하세요.' }, { status: 400 })
  }

  const db = sql()
  await db`
    insert into feedback (user_id, email, message)
    values (${session.userId}, ${session.email}, ${message.trim()})
  `
  return NextResponse.json({ ok: true })
})
