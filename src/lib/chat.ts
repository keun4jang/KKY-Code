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

export async function createChatSession(title: string) {
  return api('/api/sessions', { method: 'POST', body: JSON.stringify({ title }) })
}

export async function getChatSessions() {
  return api('/api/sessions')
}

export async function updateSessionTitle(sessionId: string, title: string) {
  await api(`/api/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ title }) })
}

export async function deleteSession(sessionId: string) {
  await api(`/api/sessions/${sessionId}`, { method: 'DELETE' })
}

export async function togglePinSession(sessionId: string, pinned: boolean) {
  await api(`/api/sessions/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ is_pinned: pinned }) })
}

export async function sendMessage(sessionId: string, role: 'user' | 'assistant', content: string) {
  return api(`/api/sessions/${sessionId}/messages`, { method: 'POST', body: JSON.stringify({ role, content }) })
}

export async function getMessages(sessionId: string) {
  return api(`/api/sessions/${sessionId}/messages`)
}
