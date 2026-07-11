export type Feedback = {
  id: string
  email: string
  message: string
  created_at: string
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `요청 실패 (${res.status})`)
  }
  return res.json()
}

export async function submitFeedback(message: string) {
  return api('/api/feedback', { method: 'POST', body: JSON.stringify({ message }) })
}

export async function getAllFeedback(): Promise<Feedback[]> {
  return api('/api/feedback')
}
