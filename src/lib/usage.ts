export type Usage = { used: number; limit: number; remaining: number }

export async function getUsage(): Promise<Usage> {
  const res = await fetch('/api/usage')
  if (!res.ok) throw new Error(`요청 실패 (${res.status})`)
  return res.json()
}
