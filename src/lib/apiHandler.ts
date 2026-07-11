import { NextResponse } from 'next/server'

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>

export function apiHandler<Ctx = unknown>(fn: Handler<Ctx>): Handler<Ctx> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx)
    } catch (e) {
      console.error('API error:', e)
      return NextResponse.json({ error: String((e as Error)?.message ?? e) }, { status: 500 })
    }
  }
}
