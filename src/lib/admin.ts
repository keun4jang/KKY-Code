import type { SupabaseClient } from '@supabase/supabase-js'

export type AdminProfile = {
  id: string
  display_name: string | null
  is_admin: boolean
  created_at: string
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

export async function getAllProfiles(supabase: SupabaseClient): Promise<AdminProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, is_admin, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getSessionsByUser(supabase: SupabaseClient, userId: string): Promise<AdminSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, user_id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getMessagesBySession(supabase: SupabaseClient, sessionId: string): Promise<AdminMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}