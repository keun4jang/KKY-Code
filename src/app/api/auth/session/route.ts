import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { apiHandler } from '@/lib/apiHandler'

export const GET = apiHandler(async () => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ session: null }, { status: 401 })
  }
  return NextResponse.json({ session })
})
