import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

export const GET = apiHandler(async () => {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 })

  const db = sql()
  const rows = await db`
    select id, email, is_admin, created_at, name, date_of_birth, phone, address
    from users
    order by created_at desc
  `
  return NextResponse.json(rows)
})
