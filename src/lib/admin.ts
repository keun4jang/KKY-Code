export type AdminUser = {
  id: string
  email: string
  is_admin: boolean
  created_at: string
  name: string | null
  date_of_birth: string | null
  phone: string | null
  address: string | null
}

export type AdminSession = {
  id: string
  user_id: string
  title: string
  created_at: string
}

export type AdminMessage = {
  id: string
  role: string
  content: string
  created_at: string
}

async function api(path: string) {
  const res = await fetch(path)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `요청 실패 (${res.status})`)
  }
  return res.json()
}

export async function getAllUsers(): Promise<AdminUser[]> {
  return api('/api/admin/users')
}

export async function getSessionsByUser(userId: string): Promise<AdminSession[]> {
  return api(`/api/admin/users/${userId}/sessions`)
}

export async function getMessagesBySession(sessionId: string): Promise<AdminMessage[]> {
  return api(`/api/admin/sessions/${sessionId}/messages`)
}
