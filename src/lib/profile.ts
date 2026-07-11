export type Profile = {
  email: string
  name: string | null
  nickname: string | null
  custom_instructions: string | null
  phone: string | null
  date_of_birth: string | null
  address: string | null
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

export async function getProfile(): Promise<Profile> {
  return api('/api/profile')
}

export async function updateProfile(fields: Partial<Omit<Profile, 'email'>>) {
  return api('/api/profile', { method: 'PATCH', body: JSON.stringify(fields) })
}
