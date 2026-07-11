import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth/session'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 })

  const { id } = await params
  const db = sql()
  const rows = await db`
    select id, user_id, title, created_at
    from chat_sessions
    where user_id = ${id}
    order by created_at desc
  `
  return NextResponse.json(rows)
}
