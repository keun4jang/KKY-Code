import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

export const POST = apiHandler(async () => {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
})
