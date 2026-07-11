import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

const DAILY_LIMIT = Number(process.env.DAILY_QUESTION_LIMIT) || 250

export const GET = apiHandler(async () => {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const db = sql()
  const [row] = await db`
    select count(*)::int as used
    from chat_messages
    where role = 'assistant' and created_at >= date_trunc('day', now())
  `

  const used = row.used
  const remaining = Math.max(DAILY_LIMIT - used, 0)

  return NextResponse.json({ used, limit: DAILY_LIMIT, remaining })
})
